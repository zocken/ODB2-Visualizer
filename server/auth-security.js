import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const options = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
let running = 0;
const waiting = [];
async function derive(password, salt) {
  // Bound memory use, including requests for nonexistent accounts.
  if (running >= 2) await new Promise(resolve => waiting.push(resolve));
  else running++;
  try { return await scrypt(password, salt, 64, options); }
  finally { if (waiting.length) waiting.shift()(); else running--; }
}
export function validPassword(value) {
  return typeof value === 'string' && [...value].length >= 15 && [...value].length <= 128;
}
export function normalizeEmail(value) {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[a-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(email) ? email : null;
}
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${(await derive(password, salt)).toString('hex')}`;
}
export async function checkPassword(password, encoded) {
  const parts = /^scrypt\$([a-f0-9]{32})\$([a-f0-9]{128})$/.exec(encoded || '');
  const actual = await derive(typeof password === 'string' ? password.slice(0, 512) : '', parts?.[1] || '0'.repeat(32));
  return Boolean(parts && timingSafeEqual(actual, Buffer.from(parts[2], 'hex')));
}
export const newToken = () => randomBytes(32).toString('base64url');
export const digest = value => createHash('sha256').update(value).digest('hex');
export const validToken = value => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);

export function readAuthConfig(env = process.env) {
  const url = new URL(env.PUBLIC_APP_URL || 'http://localhost:8080');
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('PUBLIC_APP_URL muss die öffentliche HTTP(S)-Adresse ohne Pfad sein.');
  }
  if (env.NODE_ENV === 'production' && (!env.PUBLIC_APP_URL || url.protocol !== 'https:')) {
    throw new Error('Im Produktivbetrieb ist PUBLIC_APP_URL mit HTTPS erforderlich.');
  }
  const adminEmails = (env.AUTH_ADMIN_EMAILS || '').split(',').map(value => value.trim()).filter(Boolean).map(value => {
    const email = normalizeEmail(value);
    if (!email) throw new Error('AUTH_ADMIN_EMAILS enthält eine ungültige E-Mail-Adresse.');
    return email;
  });
  return { origin: url.origin, secure: url.protocol === 'https:', adminEmails };
}
