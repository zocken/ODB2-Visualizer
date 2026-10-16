// Importiert eine Seed-Datei (JSON) per Upsert in die Datenbank.
// Aufruf: npm run seed [-- pfad/zur/datei.json]   (Standard: db/seed/generic-codes.json)
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
  const data = JSON.parse(await readFile(file, 'utf8'));
  return withTransaction(async (db) => {
    for (const c of data.components || []) {
      await db.query(
        `INSERT INTO vehicle_components (id, label) VALUES ($1, $2)
         ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label`,
        [c.id, c.label],
      );
    }
    for (const m of data.manufacturers || []) {
      await db.query(
        `INSERT INTO manufacturers (slug, name) VALUES ($1, $2)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name`,
        [m.slug, m.name],
      );
    }
    for (const c of data.codes || []) {
      let manufacturerId = null;
      if (c.manufacturer) {
        const { rows } = await db.query('SELECT id FROM manufacturers WHERE slug = $1', [c.manufacturer]);
        if (!rows.length) throw new Error(`Unbekannter Hersteller "${c.manufacturer}" bei ${c.code}`);
        manufacturerId = rows[0].id;
      }
      const { rows: [{ id }] } = await db.query(
        `INSERT INTO dtc_codes (code, manufacturer_id, title, title_en, system, urgency, explanation, location, vehicle_labels, source)
         VALUES ($1, $2, $3, $10, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (code, manufacturer_id) DO UPDATE SET
           title = EXCLUDED.title, title_en = EXCLUDED.title_en, system = EXCLUDED.system, urgency = EXCLUDED.urgency,
           explanation = EXCLUDED.explanation, location = EXCLUDED.location,
           vehicle_labels = EXCLUDED.vehicle_labels, source = EXCLUDED.source, updated_at = now()
         RETURNING id`,
        [c.code, manufacturerId, c.title, c.system, c.urgency, c.explanation, c.location,
          c.vehicle?.labels || [], c.source || 'redaktionell', c.titleEn || null],
      );
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
    return (data.codes || []).length;
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await migrate();
  for (const file of process.argv[2] ? [process.argv[2]] : await seedFiles()) {
    console.log(`${await seed(file)} Codes aus ${file} importiert.`);
  }
  await pool.end();
}
