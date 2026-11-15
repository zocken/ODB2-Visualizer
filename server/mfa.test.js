import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {authFixture} from '../tools/auth-fixture.js';
import {digest,hashPassword,readAuthConfig} from './auth-security.js';
import {makeRecoveryCodes,makeSecret,makeTotp,openSecret,sealSecret,totpCounter} from './mfa-crypto.js';

const password='Ein sicheres 2FA Testpasswort 42!';
const cookieOf=r=>r.headers.get('set-cookie')?.split(';')[0];
test('TOTP folgt RFC 6238; Verschlüsselung bindet Schlüssel und Konto',()=>{
  // RFC 6238 SHA1 vector: timestamp 59 seconds, reduced to six digits.
  const secret='GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
  assert.equal(makeTotp(secret).generate({timestamp:59000}),'287082');
  assert.equal(totpCounter(secret,'287082',59000),1);
  assert.equal(totpCounter(secret,'287082',180000),null);
  assert.equal(totpCounter(secret,'not-a-code',59000),null);
  const key=randomBytes(32),sealed=sealSecret(secret,'user-1',key);
  assert.equal(openSecret(sealed,'user-1',key),secret);assert.ok(!sealed.includes(secret));
  assert.throws(()=>openSecret(sealed,'user-2',key));assert.throws(()=>openSecret(sealed,'user-1',randomBytes(32)));
  assert.throws(()=>readAuthConfig({NODE_ENV:'production',PUBLIC_APP_URL:'https://example.test'}),/AUTH_ENCRYPTION_KEY/);
  assert.throws(()=>readAuthConfig({AUTH_ENCRYPTION_KEY:'bad'}),/32-Byte/);
});

test('Abgelaufene Einrichtung wird nicht aktiviert; Administratoren müssen ihren zweiten Faktor bestätigen',async()=>{
  const f=await authFixture();const {db,request}=f;
  try{
    const adminId=randomUUID(),targetId=randomUUID(),encoded=await hashPassword(password);
    for(const [id,email,role] of [[adminId,'admin@example.test','admin'],[targetId,'target@example.test','user']])await db.query('INSERT INTO auth_users(id,email,role,password_hash,verified_at) VALUES($1,$2,$3,$4,now())',[id,email,role,encoded]);
    let cookie=cookieOf(await request('/api/auth/login',{body:{email:'admin@example.test',password}}));
    const setup=await (await request('/api/auth/mfa/setup',{cookie,body:{currentPassword:password}})).json();
    await db.query("UPDATE auth_users SET mfa_pending_expires=now()-interval '1 minute' WHERE id=$1",[adminId]);
    assert.equal((await request('/api/auth/mfa/enable',{cookie,body:{code:makeTotp(setup.secret).generate()}})).status,400);
    await f.auth.cleanup();assert.equal((await db.query('SELECT mfa_pending_secret FROM auth_users WHERE id=$1',[adminId])).rows[0].mfa_pending_secret,null);
    const secret=makeSecret(),recovery=makeRecoveryCodes(adminId),targetSecret=makeSecret();
    await db.query('UPDATE auth_users SET mfa_secret=$1,mfa_enabled_at=now(),mfa_recovery_hashes=$2 WHERE id=$3',[sealSecret(secret,adminId,f.config.mfaKey),recovery.hashes,adminId]);
    await db.query('UPDATE auth_users SET mfa_secret=$1,mfa_enabled_at=now() WHERE id=$2',[sealSecret(targetSecret,targetId,f.config.mfaKey),targetId]);
    assert.equal((await request('/api/admin/users',{cookie})).status,401);
    const challenge=(await (await request('/api/auth/login',{body:{email:'admin@example.test',password}})).json()).challenge;
    cookie=cookieOf(await request('/api/auth/mfa/verify-login',{body:{challenge,code:recovery.codes[0]}}));
    const without=await request(`/api/admin/users/${targetId}`,{cookie,method:'PATCH',body:{role:'admin',currentPassword:password}});assert.equal(without.status,400);
    assert.equal((await db.query('SELECT role FROM auth_users WHERE id=$1',[targetId])).rows[0].role,'user');
    const withCode=await request(`/api/admin/users/${targetId}`,{cookie,method:'PATCH',body:{role:'admin',currentPassword:password,code:recovery.codes[1],twoFactorEnabled:false}});assert.equal(withCode.status,200);
    const target=(await db.query('SELECT * FROM auth_users WHERE id=$1',[targetId])).rows[0];assert.equal(target.role,'admin');assert.ok(target.mfa_enabled_at);assert.equal(openSecret(target.mfa_secret,targetId,f.config.mfaKey),targetSecret);
  }finally{await f.close();}
});

test('2FA-Einrichtung, Login, Wiederherstellung und sicherheitsrelevante Änderungen',async t=>{
  const f=await authFixture();const {db,request}=f;
  let cookie,oldCookie,secret,recovery,challenge,userId;
  async function beginLogin(){
    const response=await request('/api/auth/login',{body:{email:'mfa@example.test',password}});assert.equal(response.status,200);
    assert.equal(response.headers.has('set-cookie'),false);
    const data=await response.json();assert.equal(data.requiresTwoFactor,true);assert.equal('user' in data,false);return data.challenge;
  }
  async function completeLogin(code){
    const challenge=await beginLogin();return request('/api/auth/mfa/verify-login',{body:{challenge,code}});
  }
  try{
    userId=randomUUID();await db.query('INSERT INTO auth_users(id,email,password_hash,verified_at) VALUES($1,$2,$3,now())',[userId,'mfa@example.test',await hashPassword(password)]);
    cookie=cookieOf(await request('/api/auth/login',{body:{email:'mfa@example.test',password}}));
    oldCookie=cookieOf(await request('/api/auth/login',{body:{email:'mfa@example.test',password}}));
    await t.test('Einrichtung erfordert Passwort; QR-Code und manueller Schlüssel bleiben lokal',async()=>{
      assert.equal((await request('/api/auth/mfa/setup',{cookie,body:{currentPassword:'wrong'}})).status,400);
      const response=await request('/api/auth/mfa/setup',{cookie,body:{currentPassword:password}});assert.equal(response.status,200);
      const data=await response.json();secret=data.secret;assert.match(secret,/^[A-Z2-7]+$/);assert.match(data.qrCode,/^data:image\/png;base64,/);
      const user=(await db.query('SELECT * FROM auth_users WHERE id=$1',[userId])).rows[0];assert.notEqual(user.mfa_pending_secret,secret);assert.equal(user.mfa_enabled_at,null);
      assert.equal((await request('/api/auth/mfa/enable',{cookie,body:{code:'invalid'}})).status,400);
      assert.equal((await request('/api/auth/mfa/status',{cookie})).status,200);
    });
    await t.test('Erst ein gültiger Code aktiviert 2FA; andere Sitzungen werden beendet',async()=>{
      const response=await request('/api/auth/mfa/enable',{cookie,body:{code:makeTotp(secret).generate()}});assert.equal(response.status,200);recovery=(await response.json()).recoveryCodes;
      assert.equal(recovery.length,10);assert.equal(new Set(recovery).size,10);
      const user=(await db.query('SELECT * FROM auth_users WHERE id=$1',[userId])).rows[0];assert.ok(user.mfa_enabled_at);assert.equal(user.mfa_pending_secret,null);
      assert.ok(recovery.every(code=>!user.mfa_recovery_hashes.includes(code)));assert.notEqual(user.mfa_secret,secret);
      assert.equal((await request('/api/codes',{cookie:oldCookie})).status,401);assert.equal((await request('/api/codes',{cookie})).status,200);
      const me=(await (await request('/api/auth/me',{cookie})).json()).user;assert.equal(me.twoFactorEnabled,true);assert.equal('mfa_secret' in me,false);assert.equal('mfa_recovery_hashes' in me,false);
      assert.equal((await request('/api/auth/mfa/setup',{cookie,body:{currentPassword:password}})).status,409);
    });
    await t.test('Passwort allein erstellt keine Sitzung; TOTP ist nur einmal verwendbar',async()=>{
      challenge=await beginLogin();
      assert.equal((await request('/api/codes')).status,401);
      const invalid=await request('/api/auth/mfa/verify-login',{body:{challenge,code:'invalid'}});assert.equal(invalid.status,401);assert.equal(invalid.headers.has('set-cookie'),false);
      const next=makeTotp(secret).generate({timestamp:Date.now()+30000});
      const success=await request('/api/auth/mfa/verify-login',{body:{challenge,code:next}});assert.equal(success.status,200);oldCookie=cookie;cookie=cookieOf(success);
      assert.equal((await request('/api/auth/mfa/verify-login',{body:{challenge,code:next}})).status,401);
      const replay=await completeLogin(next);assert.equal(replay.status,401);
      const sessions=(await db.query('SELECT * FROM auth_sessions WHERE user_id=$1',[userId])).rows;assert.ok(sessions.every(s=>s.mfa_verified));
    });
    await t.test('Wiederherstellungscodes sind einmalig und widerrufene Sitzungen umgehen 2FA nicht',async()=>{
      const r=await completeLogin(recovery[0]);assert.equal(r.status,200);cookie=cookieOf(r);
      assert.equal((await completeLogin(recovery[0])).status,401);
      const status=await (await request('/api/auth/mfa/status',{cookie})).json();assert.equal(status.recoveryCodesRemaining,9);
      await db.query('UPDATE auth_sessions SET mfa_verified=false WHERE token_hash=$1',[digest(oldCookie.split('=')[1])]);assert.equal((await request('/api/codes',{cookie:oldCookie})).status,401);
    });
    await t.test('Fünf falsche Codes oder Ablauf verbrauchen die Login-Anfrage',async()=>{
      await db.exec('DELETE FROM auth_rate_limits');
      const attempt=await beginLogin();for(let i=0;i<5;i++)assert.equal((await request('/api/auth/mfa/verify-login',{body:{challenge:attempt,code:'invalid'}})).status,401);
      assert.equal((await request('/api/auth/mfa/verify-login',{body:{challenge:attempt,code:recovery[1]}})).status,401);
      const expired=await beginLogin();await db.query("UPDATE auth_mfa_challenges SET expires_at=now()-interval '1 minute'");
      assert.equal((await request('/api/auth/mfa/verify-login',{body:{challenge:expired,code:recovery[1]}})).status,401);
    });
    await t.test('Passwort-Wiederherstellung und Passwortänderung können 2FA nicht umgehen',async()=>{
      await db.exec('DELETE FROM auth_rate_limits');
      await request('/api/auth/forgot-password',{body:{email:'mfa@example.test'}});const token=f.mails.at(-1).token,newPassword='Eine andere sichere Testpassphrase!';
      assert.equal((await request('/api/auth/reset-password',{body:{token,password:newPassword}})).status,400);
      const before=(await db.query('SELECT password_hash FROM auth_users WHERE id=$1',[userId])).rows[0].password_hash;
      assert.equal((await request('/api/auth/change-password',{cookie,body:{currentPassword:password,password:newPassword}})).status,400);
      assert.equal((await db.query('SELECT password_hash FROM auth_users WHERE id=$1',[userId])).rows[0].password_hash,before);
      const pending=await beginLogin();
      assert.equal((await request('/api/auth/reset-password',{body:{token,password:newPassword,code:recovery[1]}})).status,200);
      assert.equal((await request('/api/codes',{cookie})).status,401);
      assert.equal((await request('/api/auth/mfa/verify-login',{body:{challenge:pending,code:recovery[2]}})).status,401);
      const login=await request('/api/auth/login',{body:{email:'mfa@example.test',password:newPassword}});const data=await login.json();assert.equal(data.requiresTwoFactor,true);
      cookie=cookieOf(await request('/api/auth/mfa/verify-login',{body:{challenge:data.challenge,code:recovery[2]}}));
      assert.equal((await request('/api/auth/change-password',{cookie,body:{currentPassword:newPassword,password,code:recovery[3]}})).status,200);
      cookie=cookieOf(await completeLogin(recovery[4]));
    });
    await t.test('Neue Wiederherstellungscodes ersetzen die alten; Deaktivieren erfordert beide Faktoren',async()=>{
      await db.exec('DELETE FROM auth_rate_limits');
      const r=await request('/api/auth/mfa/recovery-codes',{cookie,body:{currentPassword:password,code:recovery[5]}});assert.equal(r.status,200);const replacement=(await r.json()).recoveryCodes;
      assert.equal((await completeLogin(recovery[6])).status,401);
      const login=await completeLogin(replacement[0]);assert.equal(login.status,200);cookie=cookieOf(login);
      assert.equal((await request('/api/auth/mfa/disable',{cookie,body:{currentPassword:password}})).status,400);
      assert.equal((await request('/api/auth/mfa/disable',{cookie,body:{currentPassword:'wrong',code:replacement[1]}})).status,400);
      assert.equal((await request('/api/auth/mfa/disable',{cookie,body:{currentPassword:password,code:replacement[1]}})).status,200);
      const user=(await db.query('SELECT * FROM auth_users WHERE id=$1',[userId])).rows[0];assert.equal(user.mfa_secret,null);assert.equal(user.mfa_enabled_at,null);assert.deepEqual(user.mfa_recovery_hashes,[]);
      const finalLogin=await request('/api/auth/login',{body:{email:'mfa@example.test',password}});assert.equal(finalLogin.status,200);assert.ok(cookieOf(finalLogin));
    });
  }finally{await f.close();}
});
