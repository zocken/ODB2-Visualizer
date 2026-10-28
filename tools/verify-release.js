import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { releaseInfo } from '../server/version.js';

export async function verifyRelease(base, { expected = releaseInfo(), fetchImpl = fetch, staticOnly = false } = {}) {
  const url = new URL(base);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('HTTP(S)-Adresse erforderlich.');
  const get = async path => {
    const response = await fetchImpl(new URL(path, url), { cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    return response;
  };
  const actual = await (await get(staticOnly ? 'release.json' : 'api/version')).json();
  if (actual.revision !== expected.revision || actual.version !== expected.version) throw new Error('Veröffentlichter Stand entspricht nicht der geprüften Arbeitskopie.');
  if (!staticOnly && !(await (await get('api/health')).json()).ok) throw new Error('Backend nicht bereit.');
  const html = await (await get('')).text();
  for (const name of ['app.js','chat.js','safety-signals.js','review-policy.js']) {
    const remote = Buffer.from(await (await get(name)).arrayBuffer());
    const local = await readFile(new URL(`../dist/${name}`, import.meta.url));
    const digest = bytes => createHash('sha256').update(bytes.toString('utf8').replace(/\r\n/g,'\n')).digest('hex');
    if (digest(remote) !== digest(local)) throw new Error(`${name}: abweichender Inhalt`);
  }
  if (!/type="module"[^>]+src="chat\.js/.test(html) || !/type="module"[^>]+src="app\.js/.test(html)) throw new Error('Moduleinbindung fehlt.');
  return actual;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    if (!process.argv[2]) throw new Error('Aufruf: npm run verify-release -- https://adresse/ [--static]');
    console.log(JSON.stringify(await verifyRelease(process.argv[2], { staticOnly: process.argv.includes('--static') }),null,2));
  } catch(error) { console.error(error.message); process.exitCode=1; }
}
