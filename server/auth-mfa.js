import express from 'express';
import QRCode from 'qrcode';
import { checkPassword,digest,newToken,validToken } from './auth-security.js';
import { makeRecoveryCodes,makeSecret,makeTotp,normalizeRecovery,openSecret,recoveryHash,sealSecret,totpCounter } from './mfa-crypto.js';

const problem=(status,message)=>Object.assign(new Error(message),{status,publicMessage:message});
export function createMfa({pool,transaction,config,limit,requireUser,issueSession,finishLogin}) {
  const router=express.Router();
  async function consume(tx,user,code) {
    if(!user.mfa_enabled_at)return true;
    const canonical=normalizeRecovery(code);
    if(/^[a-f0-9]{20}$/.test(canonical)){
      const hash=recoveryHash(user.id,canonical);
      const result=await tx.query('UPDATE auth_users SET mfa_recovery_hashes=array_remove(mfa_recovery_hashes,$1) WHERE id=$2 AND $1=ANY(mfa_recovery_hashes) RETURNING id',[hash,user.id]);
      return result.rows.length>0;
    }
    const counter=totpCounter(openSecret(user.mfa_secret,user.id,config.mfaKey),code);
    if(counter===null||counter<=Number(user.mfa_last_counter))return false;
    const result=await tx.query('UPDATE auth_users SET mfa_last_counter=$1 WHERE id=$2 AND mfa_last_counter<$1 RETURNING id',[counter,user.id]);
    return result.rows.length>0;
  }
  async function challenge(tx,user) {
    const raw=newToken();
    await tx.query(`INSERT INTO auth_mfa_challenges(token_hash,user_id,credential_hash,factor_hash,expires_at)
      VALUES($1,$2,$3,$4,now()+interval '5 minutes') ON CONFLICT(user_id) DO UPDATE
      SET token_hash=EXCLUDED.token_hash,credential_hash=EXCLUDED.credential_hash,factor_hash=EXCLUDED.factor_hash,expires_at=EXCLUDED.expires_at,attempts=0`,
    [digest(raw),user.id,digest(user.password_hash),digest(user.mfa_secret)]);
    return {requiresTwoFactor:true,challenge:raw};
  }
  router.post('/verify-login',async(req,res)=>{
    await limit(req,'mfa-login-ip',null,20,300);
    const raw=req.body?.challenge;
    if(!validToken(raw))throw problem(401,'Die Anmeldung ist abgelaufen. Bitte melde dich erneut an.');
    const candidate=(await pool.query('SELECT user_id FROM auth_mfa_challenges WHERE token_hash=$1',[digest(raw)])).rows[0];
    if(candidate)await limit(req,'mfa-login-user',candidate.user_id,10,900);
    const result=await transaction(async tx=>{
      if(!candidate)return null;
      const user=(await tx.query('SELECT * FROM auth_users WHERE id=$1 FOR UPDATE',[candidate.user_id])).rows[0];
      const c=(await tx.query('SELECT * FROM auth_mfa_challenges WHERE token_hash=$1 AND expires_at>now() FOR UPDATE',[digest(raw)])).rows[0];
      if(!c||!user||!user.verified_at||user.disabled_at||!user.mfa_enabled_at||c.credential_hash!==digest(user.password_hash)||c.factor_hash!==digest(user.mfa_secret))return null;
      if(c.attempts>=5){await tx.query('DELETE FROM auth_mfa_challenges WHERE token_hash=$1',[digest(raw)]);return null;}
      if(!await consume(tx,user,req.body?.code)){
        if(c.attempts>=4)await tx.query('DELETE FROM auth_mfa_challenges WHERE token_hash=$1',[digest(raw)]);
        else await tx.query('UPDATE auth_mfa_challenges SET attempts=attempts+1 WHERE token_hash=$1',[digest(raw)]);
        return null; // Commit the failed-attempt counter.
      }
      await tx.query('DELETE FROM auth_mfa_challenges WHERE user_id=$1',[user.id]);
      return issueSession(tx,user,req,true);
    });
    if(!result)throw problem(401,'Der Code ist ungültig, bereits verwendet oder die Anmeldung ist abgelaufen. Nutze einen neuen Code oder melde dich erneut an.');
    finishLogin(res,result);
  });
  router.use(requireUser);
  router.get('/status',(req,res)=>res.json({enabled:Boolean(req.authUser.mfa_enabled_at),available:Boolean(config.mfaKey),recoveryCodesRemaining:req.authUser.mfa_recovery_hashes.length}));
  async function passwordConfirmed(req) {
    await limit(req,'mfa-settings-user',req.authUser.id,10,900);
    if(!await checkPassword(req.body?.currentPassword,req.authUser.password_hash))throw problem(400,'Bitte bestätige den Vorgang mit deinem aktuellen Passwort.');
  }
  async function lockedUser(tx,req) {
    const user=(await tx.query('SELECT * FROM auth_users WHERE id=$1 FOR UPDATE',[req.authUser.id])).rows[0];
    if(!user||user.disabled_at||user.password_hash!==req.authUser.password_hash)throw problem(409,'Das Konto wurde geändert. Bitte melde dich neu an.');
    return user;
  }
  router.post('/setup',async(req,res)=>{
    if(!config.mfaKey)throw problem(503,'2FA ist noch nicht eingerichtet. Bitte wende dich an den Betreiber.');
    await passwordConfirmed(req);
    const secret=makeSecret(),totp=makeTotp(secret,req.authUser.email);
    const qrCode=await QRCode.toDataURL(totp.toString(),{errorCorrectionLevel:'M',width:256,margin:2});
    await transaction(async tx=>{
      const user=await lockedUser(tx,req);
      if(user.mfa_enabled_at)throw problem(409,'2FA ist bereits aktiviert.');
      await tx.query("UPDATE auth_users SET mfa_pending_secret=$1,mfa_pending_expires=now()+interval '10 minutes' WHERE id=$2",[sealSecret(secret,user.id,config.mfaKey),user.id]);
    });
    res.json({secret,qrCode});
  });
  router.post('/enable',async(req,res)=>{
    await limit(req,'mfa-enable-user',req.authUser.id,10,900);
    const recovery=makeRecoveryCodes(req.authUser.id);
    await transaction(async tx=>{
      const user=await lockedUser(tx,req);
      const pending=(await tx.query('SELECT id FROM auth_users WHERE id=$1 AND mfa_pending_expires>now()',[user.id])).rows[0];
      if(user.mfa_enabled_at||!user.mfa_pending_secret||!pending)throw problem(400,'Die Einrichtung ist abgelaufen oder bereits abgeschlossen. Bitte starte sie erneut.');
      const counter=totpCounter(openSecret(user.mfa_pending_secret,user.id,config.mfaKey),req.body?.code);
      if(counter===null)throw problem(400,'Der Bestätigungscode ist ungültig. Prüfe die Uhrzeit deines Geräts und versuche einen aktuellen Code.');
      await tx.query('UPDATE auth_users SET mfa_secret=mfa_pending_secret,mfa_enabled_at=now(),mfa_last_counter=$1,mfa_recovery_hashes=$2,mfa_pending_secret=NULL,mfa_pending_expires=NULL WHERE id=$3',[counter,recovery.hashes,user.id]);
      await tx.query('DELETE FROM auth_sessions WHERE user_id=$1 AND token_hash<>$2',[user.id,req.authSessionHash]);
      await tx.query('UPDATE auth_sessions SET mfa_verified=true WHERE token_hash=$1',[req.authSessionHash]);
      await tx.query('DELETE FROM auth_mfa_challenges WHERE user_id=$1',[user.id]);
    });
    res.json({recoveryCodes:recovery.codes,message:'2FA ist aktiviert. Bewahre deine Wiederherstellungscodes an einem sicheren Ort auf.'});
  });
  for(const action of ['disable','recovery-codes'])router.post(`/${action}`,async(req,res)=>{
    await passwordConfirmed(req);
    const recovery=makeRecoveryCodes(req.authUser.id);
    await transaction(async tx=>{
      const user=await lockedUser(tx,req);
      if(!user.mfa_enabled_at)throw problem(400,'2FA ist nicht aktiviert.');
      if(!await consume(tx,user,req.body?.code))throw problem(400,'Der Code ist ungültig oder bereits verwendet. Nutze einen neuen Code oder einen Wiederherstellungscode.');
      if(action==='disable')await tx.query("UPDATE auth_users SET mfa_secret=NULL,mfa_enabled_at=NULL,mfa_last_counter=-1,mfa_recovery_hashes='{}',mfa_pending_secret=NULL,mfa_pending_expires=NULL WHERE id=$1",[user.id]);
      else await tx.query('UPDATE auth_users SET mfa_recovery_hashes=$1 WHERE id=$2',[recovery.hashes,user.id]);
      await tx.query('DELETE FROM auth_sessions WHERE user_id=$1 AND token_hash<>$2',[user.id,req.authSessionHash]);
      await tx.query('DELETE FROM auth_mfa_challenges WHERE user_id=$1',[user.id]);
    });
    res.json(action==='disable'?{message:'2FA wurde deaktiviert.'}:{recoveryCodes:recovery.codes,message:'Neue Wiederherstellungscodes erstellt. Die bisherigen Codes sind ungültig.'});
  });
  return {router,challenge,consume};
}
