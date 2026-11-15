import express from 'express';
import { randomUUID } from 'node:crypto';
import { posix } from 'node:path';
import { checkPassword, digest, hashPassword, newToken, normalizeEmail, validPassword, validToken } from './auth-security.js';

const SESSION_SECONDS = 24 * 60 * 60;
const UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const genericMailMessage = 'Wenn die Adresse für diesen Vorgang infrage kommt, erhältst du eine E-Mail. Bitte prüfe auch deinen Spam-Ordner.';
const publicUser = row => ({ id: row.id, email: row.email, displayName: row.display_name, role: row.role,
  verifiedAt: row.verified_at, passwordSet: Boolean(row.password_hash), disabledAt: row.disabled_at, createdAt: row.created_at, lastLoginAt: row.last_login_at });
function problem(status, message) { return Object.assign(new Error(message), { status, publicMessage: message }); }

export function createAuth({ pool, transaction, mailer, config }) {
  const cookieName = config.secure ? '__Host-obd2_session' : 'obd2_session';
  const cookieOptions = { httpOnly: true, secure: config.secure, sameSite: 'lax', path: '/' };
  const router = express.Router();
  router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  router.use(express.json({ limit: '8kb' }));
  const sameOrigin = (req, res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.get('origin') !== config.origin) {
      return res.status(403).json({ error: 'Diese Anfrage ist nur aus der App erlaubt. Bitte lade die Seite neu.' });
    }
    next();
  };
  router.use(sameOrigin);

  async function limit(req, scope, value, max, seconds) {
    const key = digest(`${scope}:${value || req.ip || 'unknown'}`);
    const { rows: [row] } = await pool.query(`INSERT INTO auth_rate_limits(key) VALUES ($1)
      ON CONFLICT (key) DO UPDATE SET
        hits = CASE WHEN auth_rate_limits.window_start <= now() - $2 * interval '1 second' THEN 1 ELSE auth_rate_limits.hits + 1 END,
        window_start = CASE WHEN auth_rate_limits.window_start <= now() - $2 * interval '1 second' THEN now() ELSE auth_rate_limits.window_start END
      RETURNING hits`, [key, seconds]);
    if (row.hits > max) throw problem(429, 'Zu viele Versuche. Bitte versuche es später erneut.');
  }
  // Limit before password hashing or sending email. Shared in PostgreSQL across instances/restarts.
  router.use(async (req, _res, next) => {
    if (!['GET', 'HEAD'].includes(req.method)) await limit(req, 'auth-ip', null, 80, 900);
    next();
  });

  async function loadSession(req, _res, next) {
    const raw = (req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
    if (validToken(raw)) {
      const tokenHash = digest(raw);
      const { rows: [user] } = await pool.query(`SELECT u.* FROM auth_users u JOIN auth_sessions s ON s.user_id = u.id
        WHERE s.token_hash = $1 AND s.expires_at > now() AND u.verified_at IS NOT NULL AND u.password_hash IS NOT NULL AND u.disabled_at IS NULL`, [tokenHash]);
      if (user) { req.authUser = user; req.authSessionHash = tokenHash; }
    }
    next();
  }
  const requireUser = (req, res, next) => req.authUser ? next() : res.status(401).json({ error: 'Bitte melde dich an.' });
  const requireAdmin = (req, res, next) => !req.authUser ? requireUser(req, res, next)
    : req.authUser.role === 'admin' ? next() : res.status(403).json({ error: 'Nur Administratoren haben hier Zugriff.' });
  router.use(loadSession);
  router.get('/me', (req, res) => res.json({ user: req.authUser ? publicUser(req.authUser) : null, registrationAvailable: mailer.ready }));

  async function sendLink(email, kind) {
    await transaction(async tx => {
      if (kind === 'verify') await tx.query('INSERT INTO auth_users(id, email) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING', [randomUUID(), email]);
      const { rows: [user] } = await tx.query('SELECT * FROM auth_users WHERE email = $1 FOR UPDATE', [email]);
      if (!user || user.disabled_at || (kind === 'verify' ? user.verified_at : !user.verified_at)
        || (kind === 'setup' && user.password_hash) || (kind === 'reset' && !user.password_hash)) return;
      const token = newToken();
      await tx.query(`INSERT INTO auth_tokens(token_hash, user_id, kind, expires_at)
        VALUES ($1, $2, $3, now() + $4 * interval '1 second')
        ON CONFLICT (user_id, kind) DO UPDATE SET token_hash = EXCLUDED.token_hash, expires_at = EXCLUDED.expires_at, created_at = now()`,
      [digest(token), user.id, kind, kind === 'verify' ? 86400 : 1800]);
      // Roll back if the SMTP server rejects delivery; no successful response for a failed handoff.
      await mailer.send({ email, kind, token, origin: config.origin });
    });
  }
  for (const [path, kind] of [['/register', 'verify'], ['/resend', 'verify'], ['/first-login', 'setup'], ['/forgot-password', 'reset']]) {
    router.post(path, async (req, res) => {
      if (!mailer.ready) throw problem(503, 'Der E-Mail-Versand ist noch nicht eingerichtet. Bitte wende dich an den Betreiber.');
      const email = normalizeEmail(req.body?.email);
      if (!email) throw problem(400, 'Bitte gib eine gültige E-Mail-Adresse ein.');
      await limit(req, 'mail-ip', null, 10, 3600);
      await limit(req, `mail-${kind}`, email, 3, 3600);
      try { await sendLink(email, kind); }
      catch { throw problem(503, 'Die E-Mail konnte gerade nicht versendet werden. Bitte versuche es später erneut.'); }
      res.status(202).json({ message: genericMailMessage });
    });
  }

  router.post('/verify', async (req, res) => {
    const token=req.body?.token;
    if (!validToken(token)) throw problem(400, 'Dieser Link ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an.');
    const setupToken=newToken();
    await transaction(async tx => {
      const { rows: [user] }=await tx.query(`SELECT u.* FROM auth_users u JOIN auth_tokens t ON t.user_id=u.id
        WHERE t.token_hash=$1 AND t.kind='verify' AND t.expires_at>now() FOR UPDATE OF u`,[digest(token)]);
      if (!user || user.disabled_at || user.verified_at) throw problem(400, 'Dieser Link ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an.');
      const consumed=await tx.query('DELETE FROM auth_tokens WHERE token_hash=$1 AND expires_at>now() RETURNING user_id',[digest(token)]);
      if (!consumed.rows.length) throw problem(400, 'Dieser Link wurde bereits verwendet oder ist abgelaufen.');
      await tx.query('UPDATE auth_users SET verified_at=now(),role=$1 WHERE id=$2',[config.adminEmails.includes(user.email)?'admin':'user',user.id]);
      await tx.query("INSERT INTO auth_tokens(token_hash,user_id,kind,expires_at) VALUES($1,$2,'setup',now()+interval '30 minutes')",[digest(setupToken),user.id]);
    });
    res.json({ message:'Deine E-Mail-Adresse ist bestätigt. Lege bei deiner ersten Anmeldung dein Passwort fest.', setupToken });
  });

  for (const [path, kind] of [['/set-password', 'setup'], ['/reset-password', 'reset']]) {
    router.post(path, async (req, res) => {
      const { token, password } = req.body || {};
      if (!validToken(token)) throw problem(400, 'Dieser Link ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an.');
      if (!validPassword(password)) throw problem(400, 'Verwende ein Passwort mit 15 bis 128 Zeichen.');
      const displayName = typeof req.body.displayName === 'string' ? req.body.displayName.trim().slice(0, 80) : '';
      const { rows: [candidate] } = await pool.query('SELECT user_id FROM auth_tokens WHERE token_hash=$1 AND kind=$2 AND expires_at>now()', [digest(token), kind]);
      if (!candidate) throw problem(400, 'Dieser Link ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an.');
      const passwordHash = await hashPassword(password);
      const sessionToken=kind==='setup'?newToken():null;
      const activated=await transaction(async tx => {
        const { rows: [user] } = await tx.query(`SELECT u.* FROM auth_users u JOIN auth_tokens t ON t.user_id=u.id
          WHERE t.token_hash=$1 AND t.kind=$2 AND t.expires_at>now() FOR UPDATE OF u`, [digest(token), kind]);
        if (!user || user.disabled_at || !user.verified_at || (kind==='setup' ? user.password_hash : !user.password_hash)) {
          throw problem(400, 'Dieser Link ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an.');
        }
        // Recheck after acquiring the user lock: a concurrent request may have consumed the token.
        const consumed = await tx.query('DELETE FROM auth_tokens WHERE token_hash=$1 AND expires_at>now() RETURNING user_id', [digest(token)]);
        if (!consumed.rows.length) throw problem(400, 'Dieser Link wurde bereits verwendet oder ist abgelaufen.');
        if (kind === 'setup') {
          await tx.query('UPDATE auth_users SET password_hash=$1, display_name=$2, last_login_at=now() WHERE id=$3',
            [passwordHash, displayName, user.id]);
        } else await tx.query('UPDATE auth_users SET password_hash=$1 WHERE id=$2', [passwordHash, user.id]);
        await tx.query('DELETE FROM auth_sessions WHERE user_id=$1', [user.id]);
        if (kind==='setup') {
          await tx.query(`INSERT INTO auth_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+$3*interval '1 second')`,[digest(sessionToken),user.id,SESSION_SECONDS]);
          return publicUser({...user,password_hash:passwordHash,display_name:displayName});
        }
      });
      if(kind==='setup') res.cookie(cookieName,sessionToken,{...cookieOptions,maxAge:SESSION_SECONDS*1000});
      res.json(kind==='setup'?{user:activated}:{message:'Dein Passwort wurde geändert. Bitte melde dich neu an.'});
    });
  }

  router.post('/login', async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    await limit(req, 'login-email', email || 'invalid', 10, 900);
    const { rows: [user] } = email ? await pool.query('SELECT * FROM auth_users WHERE email=$1', [email]) : { rows: [] };
    const matches = await checkPassword(req.body?.password, user?.password_hash);
    if (!matches || !user?.verified_at || user.disabled_at) throw problem(401, 'Anmeldung nicht möglich. Prüfe E-Mail und Passwort sowie die Bestätigung deiner E-Mail-Adresse.');
    const token = newToken();
    await transaction(async tx => {
      // Account state may have changed while scrypt was running.
      const { rows: [current] } = await tx.query('SELECT * FROM auth_users WHERE id=$1 FOR UPDATE', [user.id]);
      if (!current?.verified_at || current.disabled_at || current.password_hash !== user.password_hash) throw problem(401, 'Bitte melde dich erneut an.');
      if (req.authSessionHash) await tx.query('DELETE FROM auth_sessions WHERE token_hash=$1', [req.authSessionHash]);
      await tx.query(`INSERT INTO auth_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+$3*interval '1 second')`, [digest(token), user.id, SESSION_SECONDS]);
      await tx.query('UPDATE auth_users SET last_login_at=now() WHERE id=$1', [user.id]);
    });
    res.cookie(cookieName, token, { ...cookieOptions, maxAge: SESSION_SECONDS * 1000 });
    res.json({ user: publicUser(user) });
  });
  router.post('/logout', async (req, res) => {
    if (req.authSessionHash) await pool.query('DELETE FROM auth_sessions WHERE token_hash=$1', [req.authSessionHash]);
    res.clearCookie(cookieName, cookieOptions).status(204).end();
  });
  router.post('/change-password', requireUser, async (req, res) => {
    await limit(req, 'password-user', req.authUser.id, 10, 900);
    const { currentPassword, password } = req.body || {};
    if (!validPassword(password)) throw problem(400, 'Verwende ein Passwort mit 15 bis 128 Zeichen.');
    if (!await checkPassword(currentPassword, req.authUser.password_hash)) throw problem(400, 'Das aktuelle Passwort stimmt nicht.');
    const encoded = await hashPassword(password);
    await transaction(async tx => {
      const result = await tx.query('UPDATE auth_users SET password_hash=$1 WHERE id=$2 AND password_hash=$3 AND disabled_at IS NULL RETURNING id', [encoded, req.authUser.id, req.authUser.password_hash]);
      if (!result.rows.length) throw problem(409, 'Das Konto wurde zwischenzeitlich geändert. Bitte melde dich neu an.');
      await tx.query('DELETE FROM auth_sessions WHERE user_id=$1', [req.authUser.id]);
      await tx.query("DELETE FROM auth_tokens WHERE user_id=$1 AND kind='reset'", [req.authUser.id]);
    });
    res.clearCookie(cookieName, cookieOptions).json({ message: 'Passwort geändert. Alle Sitzungen wurden beendet. Bitte melde dich neu an.' });
  });

  const adminRouter = express.Router();
  adminRouter.use(express.json({ limit: '8kb' }), sameOrigin);
  adminRouter.use(requireAdmin);
  adminRouter.get('/users', async (req, res) => {
    const search = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
    const offset = Math.min(Math.max(Number.parseInt(req.query.offset, 10) || 0, 0), 1000000);
    const { rows } = await pool.query(`SELECT id,email,display_name,role,verified_at,disabled_at,created_at,last_login_at
      ,(password_hash IS NOT NULL) AS password_set FROM auth_users WHERE strpos(email,$1)>0 OR strpos(lower(display_name),$1)>0 ORDER BY created_at DESC,id LIMIT 51 OFFSET $2`, [search.toLowerCase(), offset]);
    res.set('Cache-Control', 'no-store').json({ users: rows.slice(0, 50).map(row=>({...publicUser(row),passwordSet:row.password_set})), hasMore: rows.length > 50 });
  });
  async function mutateUser(req, remove) {
    if (!UUID.test(req.params.id)) throw problem(400, 'Ungültige Nutzerkennung.');
    if (req.params.id === req.authUser.id) throw problem(409, 'Das eigene Administratorkonto kann hier nicht geändert oder gelöscht werden.');
    await limit(req, 'admin-user', req.authUser.id, 30, 900);
    if (!await checkPassword(req.body?.currentPassword, req.authUser.password_hash)) throw problem(400, 'Bitte bestätige die Änderung mit deinem aktuellen Passwort.');
    return transaction(async tx => {
      await tx.query('SELECT id FROM auth_admin_guard WHERE id=1 FOR UPDATE');
      const { rows: [actor] } = await tx.query('SELECT * FROM auth_users WHERE id=$1 FOR UPDATE', [req.authUser.id]);
      if (!actor || actor.role !== 'admin' || actor.disabled_at || actor.password_hash !== req.authUser.password_hash) throw problem(403, 'Deine Berechtigung hat sich geändert. Bitte melde dich neu an.');
      const { rows: [target] } = await tx.query('SELECT * FROM auth_users WHERE id=$1 FOR UPDATE', [req.params.id]);
      if (!target) throw problem(404, 'Dieses Konto wurde nicht gefunden.');
      const role = req.body?.role ?? target.role;
      const disabled = req.body?.disabled ?? Boolean(target.disabled_at);
      if (!['user', 'admin'].includes(role) || typeof disabled !== 'boolean') throw problem(400, 'Ungültige Rolle oder Kontoeinstellung.');
      if (role === 'admin' && !target.verified_at) throw problem(409, 'Nur bestätigte Konten können Administrator werden.');
      if (target.role === 'admin' && target.password_hash && !target.disabled_at && (remove || role !== 'admin' || disabled)) {
        const { rows: [{ count }] } = await tx.query("SELECT count(*)::int AS count FROM auth_users WHERE role='admin' AND verified_at IS NOT NULL AND password_hash IS NOT NULL AND disabled_at IS NULL");
        if (count <= 1) throw problem(409, 'Mindestens ein aktiver Administrator muss erhalten bleiben.');
      }
      if (remove) { await tx.query('DELETE FROM auth_users WHERE id=$1', [target.id]); return; }
      const { rows: [updated] } = await tx.query(`UPDATE auth_users SET role=$1,disabled_at=CASE WHEN $2 THEN COALESCE(disabled_at,now()) ELSE NULL END WHERE id=$3 RETURNING *`, [role, disabled, target.id]);
      await tx.query('DELETE FROM auth_sessions WHERE user_id=$1', [target.id]);
      if (disabled) await tx.query('DELETE FROM auth_tokens WHERE user_id=$1', [target.id]);
      return publicUser(updated);
    });
  }
  adminRouter.patch('/users/:id', async (req, res) => res.json({ user: await mutateUser(req, false) }));
  adminRouter.delete('/users/:id', async (req, res) => { await mutateUser(req, true); res.status(204).end(); });

  const errorHandler = (error, _req, res, next) => {
    if (!error.publicMessage) return next(error);
    if (error.status === 429) res.set('Retry-After', '900');
    res.status(error.status).json({ error: error.publicMessage });
  };
  router.use(errorHandler);
  adminRouter.use(errorHandler);
  async function cleanup() {
    await pool.query('DELETE FROM auth_sessions WHERE expires_at<=now()');
    await pool.query('DELETE FROM auth_tokens WHERE expires_at<=now()');
    await pool.query("DELETE FROM auth_users WHERE password_hash IS NULL AND created_at<now()-interval '7 days'");
    await pool.query("DELETE FROM auth_rate_limits WHERE window_start<now()-interval '1 day'");
  }
  return { router, adminRouter, sameOrigin, loadSession, requireUser, requireAdmin, cleanup };
}

export function mountAuthProtection(app, auth) {
  app.use('/api/auth', auth.router);
  app.use(auth.loadSession);
  app.use('/api/admin', auth.adminRouter);
  app.use('/api', auth.sameOrigin, auth.requireUser, (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.use(['/api/stats', '/api/updates'], auth.requireAdmin);
  // Decode like express.static does, so encoded filenames cannot bypass the page guard.
  app.use((req, res, next) => {
    let path;
    try { path = posix.normalize(decodeURIComponent(req.path).replaceAll('\\', '/')).replace(/\/+$/, '') || '/'; }
    catch { return res.status(400).end(); }
    if (path.toLowerCase().startsWith('/data/') || path.toLowerCase() === '/data') return auth.requireUser(req, res, next);
    const page = path.toLowerCase();
    if (page === '/' || ['index', 'konto', 'nutzer'].some(name => page === `/${name}` || page === `/${name}.html`)) {
      res.set('Cache-Control', 'no-store');
      if (!req.authUser) return res.redirect('/anmelden.html');
      if (page.startsWith('/nutzer') && req.authUser.role !== 'admin') return res.status(403).send('Nur Administratoren haben hier Zugriff.');
    }
    next();
  });
}
