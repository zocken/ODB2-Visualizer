// Importiert eine Seed-Datei (JSON) per Upsert in die Datenbank.
// Aufruf: npm run seed [-- pfad/zur/datei.json]   (Standard: db/seed/generic-codes.json)
import { contentHash } from './review-content.js';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pool, migrate, withTransaction } from './db.js';

export const DEFAULT_SEED = fileURLToPath(new URL('../db/seed/generic-codes.json', import.meta.url));

// Alle Seed-Dateien; die redaktionellen Basiscodes (inkl. Bauteilliste) zuerst.
export async function seedFiles() {
  const dir = new URL('../db/seed/', import.meta.url);
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json') && f !== 'generic-codes.json').sort();
  return [DEFAULT_SEED, ...files.map((f) => fileURLToPath(new URL(f, dir)))];
}

export async function seed(file = DEFAULT_SEED) {
  const { inserted, updated } = await importData(JSON.parse(await readFile(file, 'utf8')));
  return inserted + updated;
}

const UPDATE_COLUMNS = `
  title = EXCLUDED.title, title_en = EXCLUDED.title_en, system = EXCLUDED.system, urgency = EXCLUDED.urgency,
  explanation = EXCLUDED.explanation, location = EXCLUDED.location, vehicle_labels = EXCLUDED.vehicle_labels,
  source = EXCLUDED.source, content_hash = EXCLUDED.content_hash, source_removed_at = NULL, updated_at = now()`;

// Schreibt Daten im Seed-Format. Modi:
//   upsert – Seed-Dateien: alles anlegen oder überschreiben
//   sync   – automatische Aktualisierung: neue Codes anlegen; vorhandene nur ändern, wenn ihre
//            Quelle dem Muster `updatable` entspricht (LIKE) und sich der Inhalt (content_hash)
//            geändert hat oder der Code zuvor als entfernt markiert war. Andere Einträge bleiben unberührt.
export async function importData(data, { mode = 'upsert', updatable = null, transaction = withTransaction } = {}) {
  const sync = mode === 'sync';
  if (sync && !updatable) throw new Error('sync benötigt ein Quellmuster (updatable)');
  return transaction(async (db) => {
    for (const c of data.components || []) {
      await db.query(
        `INSERT INTO vehicle_components (id, label) VALUES ($1, $2)
         ON CONFLICT (id) DO ${sync ? 'NOTHING' : 'UPDATE SET label = EXCLUDED.label'}`,
        [c.id, c.label],
      );
    }
    for (const m of data.manufacturers || []) {
      await db.query(
        `INSERT INTO manufacturers (slug, name) VALUES ($1, $2)
         ON CONFLICT (slug) DO ${sync ? 'NOTHING' : 'UPDATE SET name = EXCLUDED.name'}`,
        [m.slug, m.name],
      );
    }
    const { rows: manufacturerRows } = await db.query('SELECT id, slug FROM manufacturers');
    const manufacturerIds = new Map(manufacturerRows.map((m) => [m.slug, m.id]));
    let inserted = 0;
    let updated = 0;
    for (const c of data.codes || []) {
      let manufacturerId = null;
      if (c.manufacturer) {
        manufacturerId = manufacturerIds.get(c.manufacturer);
        if (!manufacturerId) throw new Error(`Unbekannter Hersteller "${c.manufacturer}" bei ${c.code}`);
      }
      const { rows } = await db.query(
        `INSERT INTO dtc_codes (code, manufacturer_id, title, title_en, system, urgency, explanation, location, vehicle_labels, source, content_hash)
         VALUES ($1, $2, $3, $10, $4, $5, $6, $7, $8, $9, $11)
         ON CONFLICT (code, manufacturer_id) DO UPDATE SET ${UPDATE_COLUMNS}
         ${sync ? `WHERE dtc_codes.source LIKE $12 AND` : 'WHERE'}
           (dtc_codes.content_hash IS DISTINCT FROM EXCLUDED.content_hash OR dtc_codes.source_removed_at IS NOT NULL)
         RETURNING id, (xmax = 0) AS inserted`,
        [c.code, manufacturerId, c.title, c.system, c.urgency, c.explanation, c.location,
          c.vehicle?.labels || [], c.source || 'redaktionell', c.titleEn || null, contentHash(c),
          ...(sync ? [updatable] : [])],
      );
      if (!rows.length) continue; // unverändert oder geschützt (nur bei sync)
      const { id } = rows[0];
      if (rows[0].inserted) inserted++; else updated++;
      await db.query('DELETE FROM dtc_causes WHERE dtc_id = $1', [id]);
      for (const [position, cause] of (c.causes || []).entries()) {
        await db.query('INSERT INTO dtc_causes (dtc_id, position, cause) VALUES ($1, $2, $3)', [id, position, cause]);
      }
      await db.query('DELETE FROM dtc_components WHERE dtc_id = $1', [id]);
      for (const role of ['active', 'context']) {
        for (const componentId of c.vehicle?.[role] || []) {
          await db.query(
            'INSERT INTO dtc_components (dtc_id, component_id, role) VALUES ($1, $2, $3)',
            [id, componentId, role],
          );
        }
      }
    }
    return { inserted, updated };
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await migrate();
  for (const file of process.argv[2] ? [process.argv[2]] : await seedFiles()) {
    console.log(`${await seed(file)} Codes aus ${file} importiert.`);
  }
  await pool.end();
}
