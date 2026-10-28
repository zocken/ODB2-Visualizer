import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export function releaseInfo(root = fileURLToPath(new URL('../', import.meta.url))) {
  const hash = createHash('sha256');
  const bytes = name => {
    const data=readFileSync(path.join(root,name));
    return /\.(js|json|sql|css|html|txt|md)$/.test(name) ? data.toString('utf8').replace(/\r\n/g,'\n') : data;
  };
  const visit = (relative) => {
    const absolute = path.join(root, relative);
    for (const item of readdirSync(absolute, { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name, 'en'))) {
      const name = path.posix.join(relative, item.name);
      if (item.isDirectory()) visit(name);
      else if (item.isFile() && name !== 'dist/release.json') { hash.update(name); hash.update('\0'); hash.update(bytes(name)); }
    }
  };
  for (const dir of ['server','dist','db']) visit(dir);
  hash.update(bytes('package-lock.json'));
  const { version } = JSON.parse(readFileSync(path.join(root,'package.json'),'utf8'));
  return Object.freeze({ version, revision: hash.digest('hex'), schema: 1 });
}

export function addVersionRoute(app, info = releaseInfo()) {
  app.get('/api/version', (_req,res) => res.set('Cache-Control','no-store').json(info));
}
