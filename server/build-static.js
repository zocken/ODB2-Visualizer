// Exportiert die Seed-Daten nach dist/data/, damit die App auch ohne Backend
// (z. B. auf GitHub Pages) mit den herstellerunabhängigen Basiscodes läuft.
import { copyFile, mkdir } from 'node:fs/promises';

const target = new URL('../dist/data/', import.meta.url);
await mkdir(target, { recursive: true });
await copyFile(new URL('../db/seed/generic-codes.json', import.meta.url), new URL('generic-codes.json', target));
console.log('dist/data/generic-codes.json erstellt.');
