import express from 'express';
import { fileURLToPath } from 'node:url';
import { pool, migrate } from './db.js';
import { seed, seedFiles } from './seed.js';
import { recentUpdates, scheduleUpdates } from './update-codes.js';
import { recordEvents, usageSummary } from './usage.js';
import { createChatRouter } from './chat.js';
import { lookupCodes } from './code-context.js';

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
  WHERE d.code = $1 AND (d.manufacturer_id IS NULL OR m.slug = $2) AND d.source_removed_at IS NULL
  ORDER BY d.manufacturer_id IS NULL  -- Herstellervariante vor generischem Eintrag
  LIMIT 1`;

const app = express();
app.disable('x-powered-by');

app.get('/api/health', async (_req, res) => {
  const { rows: [{ count }] } = await pool.query('SELECT count(*)::int AS count FROM dtc_codes WHERE manufacturer_id IS NULL AND source_removed_at IS NULL');
  res.json({ ok: true, genericCodes: count });
});

// Anonyme Nutzungsstatistik: Ereignisse zählen (sendBeacon schickt text/plain) und Zusammenfassung abrufen.
// Hinter dem Coolify-Proxy liefert X-Forwarded-For die Absender-IP (nur für die Spam-Begrenzung im Speicher).
app.set('trust proxy', 'loopback, uniquelocal');
app.post('/api/events', express.json({ type: ['application/json', 'text/plain'], limit: '2kb' }), async (req, res) => {
  const result = await recordEvents(req.ip, req.body?.events);
  res.status(result.limited ? 429 : 204).end();
});
app.get('/api/stats', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(await usageSummary(req.query.days));
});

// Protokoll der automatischen Code-Ergänzung (nur lesend).
app.get('/api/updates', async (_req, res) => {
  res.json(await recentUpdates());
});

// Nur Hersteller mit sichtbaren Codes – neue Marken aus dem Code-Abgleich erscheinen automatisch.
app.get('/api/manufacturers', async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT m.slug, m.name, count(*)::int AS codes
     FROM manufacturers m JOIN dtc_codes d ON d.manufacturer_id = m.id AND d.source_removed_at IS NULL
     GROUP BY m.id ORDER BY m.name`,
  );
  res.json(rows);
});

// Vorschlagsliste: Codes, die mit der Eingabe beginnen, seitenweise (limit/offset).
// Mit Hersteller genau ein Treffer je Code, die Herstellervariante hat Vorrang vor dem Standardcode.
// Die Gesamtzahl der Treffer steht im Header X-Total-Count.
app.get('/api/codes', async (req, res) => {
  const q = String(req.query.q || '').trim().toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 5);
  const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 100);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const manufacturer = req.query.manufacturer ? String(req.query.manufacturer) : null;
  const filter = `FROM dtc_codes d LEFT JOIN manufacturers m ON m.id = d.manufacturer_id
     WHERE (d.manufacturer_id IS NULL OR m.slug = $2) AND d.source_removed_at IS NULL AND d.code LIKE $1 || '%'`;
  const [{ rows }, { rows: [{ total }] }] = await Promise.all([
    pool.query(
      `SELECT DISTINCT ON (d.code) d.code, d.title, d.system, m.slug AS manufacturer, m.name AS "manufacturerName"
       ${filter} ORDER BY d.code, d.manufacturer_id IS NULL LIMIT $3 OFFSET $4`,
      [q, manufacturer, limit, offset],
    ),
    pool.query(`SELECT count(DISTINCT d.code)::int AS total ${filter}`, [q, manufacturer]),
  ]);
  res.set('X-Total-Count', String(total));
  res.json(rows);
});

app.get('/api/codes/:code', async (req, res) => {
  const code = req.params.code.toUpperCase();
  if (!CODE_PATTERN.test(code)) return res.status(400).json({ error: 'Ungültiges Codeformat' });
  const manufacturer = req.query.manufacturer ? String(req.query.manufacturer) : null;
  const { rows } = await pool.query(DETAIL_SQL, [code, manufacturer]);
  if (rows.length) return res.json(rows[0]);
  const { rows: alternatives } = await pool.query(
    `SELECT DISTINCT d.code FROM dtc_codes d LEFT JOIN manufacturers m ON m.id = d.manufacturer_id
     WHERE (d.manufacturer_id IS NULL OR m.slug = $2) AND d.source_removed_at IS NULL AND left(d.code, 1) = $1
     ORDER BY d.code LIMIT 4`,
    [code[0], manufacturer],
  );
  res.status(404).json({ error: 'Code nicht in der Datenbasis', alternatives: alternatives.map((r) => r.code) });
});

app.use('/api/chat', createChatRouter({ lookupCodes }));
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
if (process.env.AUTO_UPDATE !== 'false') {
  scheduleUpdates({
    hour: Number(process.env.UPDATE_HOUR || 3),
    timeZone: process.env.UPDATE_TIMEZONE || 'Europe/Berlin',
  });
}
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => server.close(() => pool.end().then(() => process.exit(0))));
}
