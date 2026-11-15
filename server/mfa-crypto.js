import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import * as OTPAuth from 'otpauth';
import { digest } from './auth-security.js';

export function sealSecret(secret, userId, key) {
  if (!key) throw new Error('AUTH_ENCRYPTION_KEY fehlt.');
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);
  cipher.setAAD(Buffer.from(`obd2-mfa:${userId}`));
  const data=Buffer.concat([cipher.update(secret,'utf8'),cipher.final()]);
  return [iv,cipher.getAuthTag(),data].map(value=>value.toString('base64url')).join('.');
}
export function openSecret(value,userId,key) {
  if (!key) throw new Error('AUTH_ENCRYPTION_KEY fehlt.');
  const [iv,tag,data]=value.split('.').map(part=>Buffer.from(part,'base64url'));
  const decipher=createDecipheriv('aes-256-gcm',key,iv);
  decipher.setAAD(Buffer.from(`obd2-mfa:${userId}`));decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data),decipher.final()]).toString('utf8');
}
export const makeTotp=(secret,email='')=>new OTPAuth.TOTP({issuer:'OBD2 Klartext',label:email,algorithm:'SHA1',digits:6,period:30,secret:OTPAuth.Secret.fromBase32(secret)});
export const makeSecret=()=>new OTPAuth.Secret({size:20}).base32;
export function totpCounter(secret,code,now=Date.now()) {
  if(typeof code!=='string'||!/^\d{6}$/.test(code))return null;
  const delta=makeTotp(secret).validate({token:code,timestamp:now,window:1});
  return delta===null?null:Math.floor(now/30000)+delta;
}
export const normalizeRecovery=code=>typeof code==='string'?code.replace(/[\s-]/g,'').toLowerCase():'';
export const recoveryHash=(userId,code)=>digest(`${userId}:${normalizeRecovery(code)}`);
export function makeRecoveryCodes(userId) {
  const codes=Array.from({length:10},()=>randomBytes(10).toString('hex').match(/.{5}/g).join('-'));
  return {codes,hashes:codes.map(code=>recoveryHash(userId,code))};
}
