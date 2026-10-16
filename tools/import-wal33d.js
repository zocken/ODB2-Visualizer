// Erzeugt die Seed-Dateien aus den lokal abgelegten Rohdaten in db/source/wal33d.
// Umwandlungsregeln: server/wal33d.js. Laufende Ergänzungen übernimmt server/update-codes.js.
//
// Aufruf: node tools/import-wal33d.js [Anzahl generischer Codes, Standard 2000]
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { BRANDS, GENERIC_FILES, HANDWRITTEN, SOURCE, entry, isPassengerCar, parseCodes } from '../server/wal33d.js';

const ROOT = new URL('../', import.meta.url);
const SOURCE_DIR = new URL('db/source/wal33d/', ROOT);
const GENERIC_TARGET = Number(process.argv[2] || 2000);
// Anteil je Bereich, Rest wird mit P0-Codes aufgefüllt.
const QUOTAS = { P0: 0.6, U0: 0.15, C0: 0.075, B0: 0.05, P2: 0.125 };

const readCodes = (file) => parseCodes(readFileSync(new URL(file, SOURCE_DIR), 'utf8'));

// Herstellerunabhängige Codes: nur vollständig übersetzte, Kontingente je Bereich.
const pool = new Map();
for (const file of GENERIC_FILES) {
  for (const [code, en] of readCodes(file)) {
    if (HANDWRITTEN.has(code) || !/^[PBCU][023]/.test(code) || !isPassengerCar(en)) continue;
    const e = entry(code, en);
    if (!e.translated) continue;
    const group = code.slice(0, 2);
    if (!pool.has(group)) pool.set(group, []);
    pool.get(group).push(e);
  }
}
// Gleichmäßig über den Codebereich verteilen, damit alle Systemfamilien vertreten sind.
const spread = (list, n) => (n >= list.length ? list : Array.from({ length: n }, (_, i) => list[Math.floor((i * list.length) / n)]));
const chosen = [];
for (const [group, share] of Object.entries(QUOTAS)) chosen.push(...spread(pool.get(group) || [], Math.round(GENERIC_TARGET * share)));
const chosenCodes = new Set(chosen.map((c) => c.code));
for (const group of ['P0', 'P2', 'U0', 'C0', 'B0']) {
  for (const e of pool.get(group) || []) {
    if (chosen.length >= GENERIC_TARGET) break;
    if (!chosenCodes.has(e.code)) { chosen.push(e); chosenCodes.add(e.code); }
  }
}
chosen.sort((a, b) => a.code.localeCompare(b.code));
const strip = ({ translated, ...rest }) => rest;
writeFileSync(new URL('db/seed/sae-generic-wal33d.json', ROOT), `${JSON.stringify({
  description: `Herstellerunabhängige Codes aus ${SOURCE}`,
  codes: chosen.map(strip),
}, null, 1)}\n`);

// Herstellerspezifische Codes: alle Marken, Titel übersetzt wo vollständig möglich, sonst englisch.
const manufacturers = [];
const brandCodes = [];
let translatedBrand = 0;
for (const file of readdirSync(SOURCE_DIR).filter((f) => f.endsWith('_codes.txt')).sort()) {
  const slug = file.replace('_codes.txt', '');
  const name = BRANDS[slug];
  if (GENERIC_FILES.includes(file) || !name) continue; // other_codes.txt: keine Markenzuordnung
  manufacturers.push({ slug, name });
  for (const [code, en] of readCodes(file)) {
    if (!isPassengerCar(en)) continue;
    const e = entry(code, en, name, slug);
    if (e.translated) translatedBrand++;
    brandCodes.push(strip(e));
  }
}
writeFileSync(new URL('db/seed/manufacturer-wal33d.json', ROOT), `${JSON.stringify({
  description: `Herstellerspezifische Codes aus ${SOURCE}`,
  manufacturers,
  codes: brandCodes,
}, null, 1)}\n`);

const byGroup = Object.fromEntries([...new Set(chosen.map((c) => c.code.slice(0, 2)))].map((g) => [g, chosen.filter((c) => c.code.startsWith(g)).length]));
console.log(`Generisch: ${chosen.length} Codes`, byGroup);
console.log(`Herstellerspezifisch: ${brandCodes.length} Codes, ${manufacturers.length} Marken, ${translatedBrand} Titel übersetzt`);
