// Datenbank-Fakten für den KI-Chat: Einträge der genannten Codes, passend zum gewählten Hersteller.
import { pool } from './db.js';

const CONTEXT_SQL = `
  SELECT DISTINCT ON (d.code) d.code, d.title, d.title_en AS "titleEn", d.system, d.urgency, d.explanation,
         d.location, d.source, m.name AS manufacturer,
         COALESCE((SELECT array_agg(cause ORDER BY position) FROM dtc_causes WHERE dtc_id = d.id), '{}') AS causes
  FROM dtc_codes d
  LEFT JOIN manufacturers m ON m.id = d.manufacturer_id
  WHERE d.code = ANY($1) AND (d.manufacturer_id IS NULL OR m.slug = $2) AND d.source_removed_at IS NULL
  ORDER BY d.code, d.manufacturer_id IS NULL  -- Herstellervariante vor generischem Eintrag`;

export async function lookupCodes(codes, manufacturer) {
  const [{ rows }, maker] = await Promise.all([
    codes.length ? pool.query(CONTEXT_SQL, [codes, manufacturer]) : { rows: [] },
    manufacturer ? pool.query('SELECT name FROM manufacturers WHERE slug = $1', [manufacturer]) : { rows: [] },
  ]);
  return { entries: rows, manufacturerName: maker.rows[0]?.name || null };
}
