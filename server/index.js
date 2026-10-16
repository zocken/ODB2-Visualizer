import express from 'express';
import { fileURLToPath } from 'node:url';
import { pool, migrate } from './db.js';
import { seed, seedFiles } from './seed.js';

const PORT = Number(process.env.PORT || 8080);
const CODE_PATTERN = /^[PBCU][0-9A-F]{4}$/;

const DETAIL_SQL = `
  SELECT d.code, d.title, d.title_en AS "titleEn", d.system, d.urgency, d.explanation, d.location, d.source,
         d.vehicle_labels AS labels,
         CASE WHEN m.id IS NULL THEN NULL ELSE json_build_object('slug', m.slug, 'name', m.name) END AS manufacturer,
         COALESCE((SELECT array_agg(cause ORDER BY position) FROM dtc_causes WHERE dtc_id = d.id), '{}') AS causes,
         COALESCE((SELECT array_agg(component_id) FROM dtc_components WHERE dtc_id = d.id AND role = 'active'), '{}') AS active,
         COALESCE((SELECT array_agg(component_id) FROM dtc_components WHERE dtc_id = d.id AND role = 'context'), '{}') AS context
  FROM dtc_codes d
  LEFT JOIN manufacturers m ON m.id = d.manufacturer_id
  WHERE d.code = $1 AND (d.manufacturer_id IS NULL OR m.slug = $2)
  ORDER BY d.manufacturer_id IS NULL  -- Herstellervariante vor generischem Eintrag
  LIMIT 1`;

const app = express();
app.disable('x-powered-by');

app.get('/api/health', async (_req, res) => {
  const { rows: [{ count }] } = await pool.query('SELECT count(*)::int AS count FROM dtc_codes WHERE manufacturer_id IS NULL');
  res.json({ ok: true, genericCodes: count });
});

app.get('/api/manufacturers', async (_req, res) => {
  const { rows } = await pool.query('SELECT slug, name FROM manufacturers ORDER BY name');
  res.json(rows);
});

// Vorschlagsliste: Suche über Code, Titel und System.
app.get('/api/codes', async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 60);
  const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 100);
  const manufacturer = req.query.manufacturer ? String(req.query.manufacturer) : null;
  const { rows } = await pool.query(
    `SELECT d.code, d.title, d.system, m.slug AS manufacturer
     FROM dtc_codes d LEFT JOIN manufacturers m ON m.id = d.manufacturer_id
     WHERE (d.manufacturer_id IS NULL OR m.slug = $3)
       AND ($1 = '' OR d.code ILIKE '%' || $1 || '%' OR d.title ILIKE '%' || $1 || '%' OR d.system ILIKE '%' || $1 || '%')
     ORDER BY d.code, d.manufacturer_id NULLS LAST
     LIMIT $2`,
    [q.replace(/[%_\\]/g, '\\$&'), limit, manufacturer],
  );
  res.json(rows);
});

app.get('/api/codes/:code', async (req, res) => {
  const code = req.params.code.toUpperCase();
  if (!CODE_PATTERN.test(code)) return res.status(400).json({ error: 'Ungültiges Codeformat' });
  const manufacturer = req.query.manufacturer ? String(req.query.manufacturer) : null;
  const { rows } = await pool.query(DETAIL_SQL, [code, manufacturer]);
  if (rows.length) return res.json(rows[0]);
  const { rows: alternatives } = await pool.query(
    `SELECT code FROM dtc_codes WHERE manufacturer_id IS NULL AND left(code, 1) = $1 ORDER BY code LIMIT 4`,
    [code[0]],
  );
  res.status(404).json({ error: 'Code nicht in der Datenbasis', alternatives: alternatives.map((r) => r.code) });
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'Unbekannter Endpunkt' }));
app.use(express.static(fileURLToPath(new URL('../dist', import.meta.url)), { extensions: ['html'] }));

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Interner Fehler' });
});

await migrate();
if (process.env.AUTO_SEED !== 'false') {
  const { rows: [{ count }] } = await pool.query('SELECT count(*)::int AS count FROM dtc_codes');
  if (count === 0) {
    for (const file of await seedFiles()) console.log(`Leere Datenbank: ${await seed(file)} Codes aus ${file} importiert.`);
  }
}

const server = app.listen(PORT, () => console.log(`OBD2 Klartext läuft auf Port ${PORT}`));
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => server.close(() => pool.end().then(() => process.exit(0))));
}
