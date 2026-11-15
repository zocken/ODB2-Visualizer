import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { authFixture } from '../tools/auth-fixture.js';
import { hashPassword, checkPassword, normalizeEmail, readAuthConfig, digest, newToken } from './auth-security.js';
import { createAuthMailer } from './auth-mail.js';
import { verifyRelease } from '../tools/verify-release.js';

const password='Eine lange Testpassphrase 42!';
const cookieOf = response => response.headers.get('set-cookie')?.split(';')[0];

test('Produktivkonfiguration und SMTP erzwingen verschlüsselte Verbindungen',()=>{
  assert.throws(()=>readAuthConfig({NODE_ENV:'production'}),/HTTPS/);
  assert.throws(()=>readAuthConfig({NODE_ENV:'production',PUBLIC_APP_URL:'http://example.test'}),/HTTPS/);
  assert.throws(()=>readAuthConfig({PUBLIC_APP_URL:'https://example.test/path'}),/ohne Pfad/);
  assert.throws(()=>readAuthConfig({AUTH_ADMIN_EMAILS:'kaputt'}),/ungültige/);
  assert.equal(readAuthConfig({PUBLIC_APP_URL:'https://example.test',AUTH_ADMIN_EMAILS:'ADMIN@EXAMPLE.TEST'}).secure,true);
  assert.equal(normalizeEmail(' User@Example.Test '),'user@example.test');
  assert.equal(normalizeEmail('a@example.test\r\nBcc: other@example.test'),null);
  assert.equal(normalizeEmail({}),null);
  assert.throws(()=>createAuthMailer({NODE_ENV:'production',SMTP_ALLOW_INSECURE:'true'}),/Unverschlüsselt/);
  assert.equal(createAuthMailer({}).ready,false);
});

test('Registrierung, Double-Opt-in, Sitzungen, Wiederherstellung und Nutzerrechte mit PostgreSQL',async t=>{
  const f=await authFixture();const {db,request,mails}=f;
  let userCookie,adminCookie,userId,adminId;
  try{
    await t.test('Ohne Anmeldung sind App, Export und APIs gesperrt; Rechtliches und Login bleiben erreichbar',async()=>{
      for(const path of ['/', '/index.html','/index','/konto.html','/nutzer.html','/index%2ehtml'])assert.equal((await request(path)).status,302,path);
      for(const path of ['/api/codes','/api/stats','/data/generic-codes.json','/api/admin/users'])assert.equal((await request(path)).status,401,path);
      for(const path of ['/anmelden.html','/impressum.html','/datenschutz.html'])assert.equal((await request(path)).status,200,path);
      assert.equal((await request('/api/auth/me')).headers.get('cache-control'),'no-store');
      assert.equal((await (await request('/api/auth/me')).json()).user,null);
      assert.ok((await verifyRelease(f.base)).revision);
    });
    await t.test('Cross-Site-Anfragen und Anfragen ohne Origin werden abgewiesen',async()=>{
      assert.equal((await request('/api/auth/register',{body:{email:'x@example.test'},origin:'https://evil.test'})).status,403);
      assert.equal((await request('/api/auth/login',{body:{email:'x@example.test',password},origin:null})).status,403);
    });
    await t.test('Bestätigung aktiviert nur die E-Mail; Passwortvergabe erfolgt erst bei der ersten Anmeldung',async()=>{
      assert.equal((await request('/api/auth/register',{body:{email:' User@Example.Test ',password:'attacker-password'}})).status,202);
      assert.equal(mails.length,1);
      const {rows:[user]}=await db.query('SELECT * FROM auth_users');userId=user.id;
      assert.equal(user.password_hash,null);assert.equal(user.verified_at,null);
      const {rows:[token]}=await db.query('SELECT * FROM auth_tokens');
      assert.notEqual(token.token_hash,mails[0].token);assert.equal(token.token_hash,digest(mails[0].token));
      assert.equal((await request('/api/auth/login',{body:{email:user.email,password}})).status,401);
      assert.equal((await request('/api/auth/set-password',{body:{token:mails[0].token,password}})).status,400);
      const result=await request('/api/auth/verify',{body:{token:mails[0].token,password:'wird-nicht-uebernommen'}});assert.equal(result.status,200);
      assert.equal(result.headers.has('set-cookie'),false);
      const verified=(await db.query('SELECT * FROM auth_users WHERE id=$1',[userId])).rows[0];assert.ok(verified.verified_at);assert.equal(verified.password_hash,null);
      assert.equal((await request('/api/auth/login',{body:{email:verified.email,password}})).status,401);
      const {setupToken}=await result.json();
      assert.equal((await request('/api/auth/set-password',{body:{token:setupToken,password:'short'}})).status,400);
      const firstLogin=await request('/api/auth/set-password',{body:{token:setupToken,password,displayName:'Testnutzer'}});assert.equal(firstLogin.status,200);assert.ok(cookieOf(firstLogin));
      assert.equal((await request('/api/auth/set-password',{body:{token:setupToken,password}})).status,400);
      const current=(await db.query('SELECT * FROM auth_users WHERE id=$1',[userId])).rows[0];
      assert.ok(current.verified_at);assert.equal(current.role,'user');assert.notEqual(current.password_hash,password);
      assert.equal(await checkPassword(password,current.password_hash),true);
      assert.equal((await request('/api/auth/verify',{body:{token:mails[0].token,password}})).status,400);
    });
    await t.test('Login setzt HttpOnly-Cookie; nur der Hash liegt in der DB; normale Nutzer haben keine Adminrechte',async()=>{
      const result=await request('/api/auth/login',{body:{email:'user@example.test',password}});assert.equal(result.status,200);
      const cookie=result.headers.get('set-cookie');assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Lax/);assert.match(cookie,/Path=\//);
      userCookie=cookieOf(result);
      const {rows:[session]}=await db.query('SELECT * FROM auth_sessions WHERE token_hash=$1',[digest(userCookie.split('=')[1])]);assert.equal(session.token_hash,digest(userCookie.split('=')[1]));
      const data=await (await request('/api/auth/me',{cookie:userCookie})).json();assert.equal(data.user.displayName,'Testnutzer');assert.equal('password_hash' in data.user,false);
      assert.equal((await request('/api/codes',{cookie:userCookie})).status,200);
      assert.equal((await request('/api/stats',{cookie:userCookie})).status,403);
      assert.equal((await request('/api/admin/users',{cookie:userCookie})).status,403);
      assert.equal((await request('/nutzer.html',{cookie:userCookie})).status,403);
      assert.equal((await request('/api/events',{body:{events:[]},cookie:userCookie,origin:'https://evil.test'})).status,403);
      const again=await request('/api/auth/register',{body:{email:'user@example.test'}});assert.equal(again.status,202);assert.equal(mails.length,1);
    });
    await t.test('Ablauf, erneuter Versand und SMTP-Fehler behalten den Kontostatus sicher bei',async()=>{
      await request('/api/auth/register',{body:{email:'pending@example.test'}});const old=mails.at(-1).token;
      await request('/api/auth/resend',{body:{email:'pending@example.test'}});const latest=mails.at(-1).token;assert.notEqual(latest,old);
      assert.equal((await request('/api/auth/verify',{body:{token:old,password}})).status,400);
      await db.query("UPDATE auth_tokens SET expires_at=now()-interval '1 minute' WHERE token_hash=$1",[digest(latest)]);
      assert.equal((await request('/api/auth/verify',{body:{token:latest,password}})).status,400);
      f.mailer.fail=true;assert.equal((await request('/api/auth/register',{body:{email:'failure@example.test'}})).status,503);f.mailer.fail=false;
      assert.equal((await db.query("SELECT * FROM auth_users WHERE email='failure@example.test'")).rows.length,0);
    });
    await t.test('Administrator entsteht nur nach Bestätigung der konfigurierten Adresse',async()=>{
      await db.exec('DELETE FROM auth_rate_limits');
      await request('/api/auth/register',{body:{email:'admin@example.test'}});
      const verified=await request('/api/auth/verify',{body:{token:mails.at(-1).token}});assert.equal(verified.status,200);
      // If the first-login page is closed, a new setup link can be requested by email.
      await request('/api/auth/first-login',{body:{email:'admin@example.test'}});const setup=mails.at(-1);assert.equal(setup.kind,'setup');
      const originalSetup=(await verified.json()).setupToken;
      assert.equal((await request('/api/auth/set-password',{body:{token:originalSetup,password}})).status,400);
      assert.equal((await request('/api/auth/set-password',{body:{token:setup.token,password}})).status,200);
      const mailCount=mails.length;await request('/api/auth/first-login',{body:{email:'admin@example.test'}});assert.equal(mails.length,mailCount);
      const response=await request('/api/auth/login',{body:{email:'admin@example.test',password}});assert.equal(response.status,200);adminCookie=cookieOf(response);
      adminId=(await response.json()).user.id;
      const data=await (await request('/api/admin/users',{cookie:adminCookie})).json();
      assert.equal(data.users.find(user=>user.email==='admin@example.test').role,'admin');
      assert.equal(data.users.some(user=>'password_hash' in user||'token_hash' in user),false);
      assert.equal((await request('/api/admin/users?q=user%40example',{cookie:adminCookie})).status,200);
      assert.equal((await request('/api/stats',{cookie:adminCookie})).status,200);
    });
    await t.test('Sperren beendet Sitzungen; Änderungen erfordern Adminpasswort; unbestätigte Konten lassen sich nicht hochstufen',async()=>{
      const pending=(await db.query("SELECT id FROM auth_users WHERE email='pending@example.test'")).rows[0];
      assert.equal((await request(`/api/admin/users/${userId}`,{method:'PATCH',body:{disabled:true},cookie:adminCookie})).status,400);
      assert.equal((await request(`/api/admin/users/${pending.id}`,{method:'PATCH',body:{role:'admin',currentPassword:password},cookie:adminCookie})).status,409);
      assert.equal((await request(`/api/admin/users/${adminId}`,{method:'PATCH',body:{role:'user',currentPassword:password},cookie:adminCookie})).status,409);
      assert.equal((await request(`/api/admin/users/${userId}`,{method:'PATCH',body:{disabled:true,currentPassword:password},cookie:adminCookie})).status,200);
      assert.equal((await request('/api/codes',{cookie:userCookie})).status,401);
      assert.equal((await request('/api/auth/login',{body:{email:'user@example.test',password}})).status,401);
      assert.equal((await request(`/api/admin/users/${userId}`,{method:'PATCH',body:{disabled:false,currentPassword:password},cookie:adminCookie})).status,200);
      assert.equal((await request('/api/codes',{cookie:userCookie})).status,401);
      userCookie=cookieOf(await request('/api/auth/login',{body:{email:'user@example.test',password}}));
    });
    await t.test('Passwort-Zurücksetzen verbraucht den Link und beendet alte Sitzungen',async()=>{
      await request('/api/auth/forgot-password',{body:{email:'user@example.test'}});const token=mails.at(-1).token,newPassword='Eine komplett neue Testpassphrase!';
      assert.equal((await request('/api/auth/reset-password',{body:{token,password:newPassword}})).status,200);
      assert.equal((await request('/api/auth/reset-password',{body:{token,password:newPassword}})).status,400);
      assert.equal((await request('/api/codes',{cookie:userCookie})).status,401);
      assert.equal((await request('/api/auth/login',{body:{email:'user@example.test',password}})).status,401);
      const login=await request('/api/auth/login',{body:{email:'user@example.test',password:newPassword}});assert.equal(login.status,200);userCookie=cookieOf(login);
      const changed=await request('/api/auth/change-password',{cookie:userCookie,body:{currentPassword:newPassword,password}});assert.equal(changed.status,200);
      assert.equal((await request('/api/codes',{cookie:userCookie})).status,401);
    });
    await t.test('Rollenwechsel wirken sofort, Logout widerruft das Cookie und Löschung entfernt Sitzungen und Links',async()=>{
      userCookie=cookieOf(await request('/api/auth/login',{body:{email:'user@example.test',password}}));
      assert.equal((await request(`/api/admin/users/${userId}`,{method:'PATCH',cookie:adminCookie,body:{role:'admin',currentPassword:password}})).status,200);
      assert.equal((await request('/api/codes',{cookie:userCookie})).status,401);
      userCookie=cookieOf(await request('/api/auth/login',{body:{email:'user@example.test',password}}));
      assert.equal((await request('/api/admin/users',{cookie:userCookie})).status,200);
      await request('/api/auth/logout',{body:{},cookie:userCookie});assert.equal((await request('/api/codes',{cookie:userCookie})).status,401);
      await request('/api/auth/forgot-password',{body:{email:'user@example.test'}});
      assert.equal((await request(`/api/admin/users/${userId}`,{method:'DELETE',cookie:adminCookie,body:{currentPassword:password}})).status,204);
      assert.equal((await db.query('SELECT * FROM auth_tokens WHERE user_id=$1',[userId])).rows.length,0);
    });
    await t.test('Abgelaufene Sitzungen und Sperren werden auch ohne Logout erkannt; Rate-Limits bleiben in der DB',async()=>{
      await db.query("UPDATE auth_sessions SET expires_at=now()-interval '1 minute'");
      assert.equal((await request('/api/admin/users',{cookie:adminCookie})).status,401);
      await db.exec('DELETE FROM auth_rate_limits');
      for(let i=0;i<3;i++)assert.equal((await request('/api/auth/register',{body:{email:'limited@example.test'}})).status,202);
      assert.equal((await request('/api/auth/register',{body:{email:'limited@example.test'}})).status,429);
      await f.auth.cleanup();assert.equal((await db.query('SELECT * FROM auth_sessions')).rows.length,0);
    });
  }finally{await f.close();}
});

test('HTTPS-Cookies besitzen Secure und __Host-Präfix',async()=>{
  const f=await authFixture({secure:true});
  try{
    const id=randomUUID();await f.db.query('INSERT INTO auth_users(id,email,password_hash,verified_at) VALUES($1,$2,$3,now())',[id,'secure@example.test',await hashPassword(password)]);
    const response=await f.request('/api/auth/login',{body:{email:'secure@example.test',password}});
    assert.equal(response.status,200);assert.match(response.headers.get('set-cookie'),/^__Host-obd2_session=/);assert.match(response.headers.get('set-cookie'),/; Secure/);
    const token=newToken();await f.db.query("INSERT INTO auth_tokens(token_hash,user_id,kind,expires_at) VALUES($1,$2,'reset',now()+interval '30 minutes')",[digest(token),id]);
  }finally{await f.close();}
});
