// Automatischer Abgleich der Pkw-Codes mit github.com/Wal33D/dtc-database (MIT).
// Lädt den aktuellen Stand der Quelle, wandelt ihn mit server/wal33d.js um und
//   – legt fehlende Codes an,
//   – aktualisiert importierte Codes, deren erzeugter Inhalt sich geändert hat (content_hash),
//   – markiert importierte Codes, die nicht mehr in der Quelle stehen (source_removed_at; ausgeblendet, nicht gelöscht).
// Einträge mit anderer Quelle (z. B. "redaktionell") werden nie verändert.
//
// Manuell: npm run update-codes
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { pool, migrate, withTransaction } from './db.js';
import { importData } from './seed.js';
import { BRANDS, GENERIC_FILES, REPO, SOURCE, entry, isPassengerCar, parseCodes } from './wal33d.js';

const API = `https://api.github.com/repos/${REPO}`;
const RAW = `https://raw.githubusercontent.com/${REPO}`;
const LOCK_ID = 2012_0001; // pg_advisory_lock: verhindert parallele Läufe mehrerer Instanzen
const HOUR = 3_600_000;
const MAX_FILE_BYTES = 2_000_000;
const MIN_EXPECTED_CODES = 1000; // Schutz gegen unvollständige oder leere Quelle
// Generische Bereiche nach SAE J2012 (P3000–P33FF sind herstellerspezifisch).
const GENERIC_RANGE = /^(P0|P2|P3[4-9A-F]|[BCU][03])/;
// Nur Einträge dieser Quelle darf der Abgleich ändern oder als entfernt markieren.
const UPDATABLE = `${REPO}%`;

// Prüfwert über den erzeugten Inhalt ohne Quellangabe, damit ein neuer Quellstand allein keine Änderung auslöst.
const contentHash = ({ source, ...content }) => createHash('sha256').update(JSON.stringify(content)).digest('hex');

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'obd2-klartext-updater' },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const text = await response.text();
  if (text.length > MAX_FILE_BYTES) throw new Error(`${url}: Datei unerwartet groß`);
  return text;
}

// Lädt alle Pkw-relevanten Codes der Quelle im Seed-Format.
async function loadSource() {
  const { sha } = JSON.parse(await fetchText(`${API}/commits/main`));
  if (!/^[0-9a-f]{40}$/.test(sha || '')) throw new Error('Ungültiger Quellstand');
  const { tree } = JSON.parse(await fetchText(`${API}/git/trees/${sha}?recursive=1`));
  const files = tree
    .map((t) => t.path)
    .filter((p) => /^data\/source-data\/[a-z_]+_codes\.txt$/.test(p))
    .map((p) => p.split('/').pop());

  const data = { manufacturers: [], codes: [] };
  const source = `${SOURCE} · Stand ${sha.slice(0, 7)}`;
  let skipped = 0;
  for (const file of files) {
    const slug = file.replace('_codes.txt', '');
    const generic = GENERIC_FILES.includes(file);
    const brand = BRANDS[slug];
    if (!generic && !brand) continue; // z. B. other_codes.txt ohne Markenzuordnung
    if (brand) data.manufacturers.push({ slug, name: brand });
    for (const [code, en] of parseCodes(await fetchText(`${RAW}/${sha}/data/source-data/${file}`))) {
      if (generic && !GENERIC_RANGE.test(code)) continue;
      if (!isPassengerCar(en)) { skipped++; continue; }
      const { translated, ...e } = generic ? entry(code, en) : entry(code, en, brand, slug);
      data.codes.push({ ...e, source, contentHash: contentHash(e) });
    }
  }
  if (data.codes.length < MIN_EXPECTED_CODES) throw new Error(`Quelle unvollständig (${data.codes.length} Codes)`);
  return { sha, data, skipped };
}

// Markiert importierte Codes, die im aktuellen Quellstand fehlen. Rückgabe: Anzahl neu markierter Codes.
// Sicherung: Betrifft ein Lauf mehr als MAX_REMOVED_SHARE der importierten Codes, wird zurückgerollt.
const MAX_REMOVED_SHARE = 0.1;
async function markRemoved(codes) {
  return withTransaction(async (db) => {
    const { rowCount } = await db.query(
      `UPDATE dtc_codes d SET source_removed_at = now()
       WHERE d.source LIKE $3 AND d.source_removed_at IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM unnest($1::text[], $2::text[]) AS s(code, slug)
           LEFT JOIN manufacturers m ON m.slug = s.slug
           WHERE s.code = d.code AND m.id IS NOT DISTINCT FROM d.manufacturer_id
         )`,
      [codes.map((c) => c.code), codes.map((c) => c.manufacturer), UPDATABLE],
    );
    const { rows: [{ total }] } = await db.query('SELECT count(*)::int AS total FROM dtc_codes WHERE source LIKE $1', [UPDATABLE]);
    if (rowCount > total * MAX_REMOVED_SHARE) {
      throw new Error(`Entfernt-Markierung abgebrochen: ${rowCount} von ${total} Codes fehlen in der Quelle`);
    }
    return rowCount;
  });
}

export async function runUpdate() {
  const client = await pool.connect();
  try {
    const { rows: [{ locked }] } = await client.query('SELECT pg_try_advisory_lock($1) AS locked', [LOCK_ID]);
    if (!locked) return { status: 'läuft bereits' };
    const { rows: [run] } = await client.query(`INSERT INTO code_updates (status) VALUES ('läuft') RETURNING id`);
    try {
      const { sha, data, skipped } = await loadSource();
      const { inserted, updated } = await importData(data, { mode: 'sync', updatable: UPDATABLE });
      const removed = await markRemoved(data.codes);
      await client.query(
        `UPDATE code_updates SET status = 'erfolgreich', finished_at = now(), source_sha = $2, checked = $3,
           inserted = $4, updated = $5, removed = $6, message = $7
         WHERE id = $1`,
        [run.id, sha, data.codes.length, inserted, updated, removed, `${skipped} Nutzfahrzeug-Codes übersprungen`],
      );
      return { status: 'erfolgreich', sha, checked: data.codes.length, inserted, updated, removed, skipped };
    } catch (error) {
      await client.query(
        `UPDATE code_updates SET status = 'fehlgeschlagen', finished_at = now(), message = $2 WHERE id = $1`,
        [run.id, String(error.message).slice(0, 500)],
      );
      throw error;
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]);
    }
  } finally {
    client.release();
  }
}

// Datum (YYYY-MM-DD) und Stunde eines Zeitpunkts in der angegebenen Zeitzone.
function localParts(date, timeZone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).map((p) => [p.type, p.value]));
  return { day: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}

// Fällig ist ein Lauf einmal pro Kalendertag im Nachtfenster [hour, hour + windowHours)
// der Zeitzone – nicht, wenn heute schon ein erfolgreicher Lauf stattfand, und nach einem
// Fehler frühestens nach retryHours erneut.
export function isUpdateDue(now, { lastSuccess, lastFailure }, { hour = 3, windowHours = 3, timeZone = 'Europe/Berlin', retryHours = 1 } = {}) {
  const current = localParts(now, timeZone);
  if (current.hour < hour || current.hour >= hour + windowHours) return false;
  if (lastSuccess && localParts(lastSuccess, timeZone).day === current.day) return false;
  if (lastFailure && now - lastFailure < retryHours * HOUR) return false;
  return true;
}

// Prüft alle 15 Minuten, ob der nächtliche Lauf fällig ist.
export function scheduleUpdates(options = {}) {
  const check = async () => {
    try {
      const { rows: [state] } = await pool.query(
        `SELECT max(finished_at) FILTER (WHERE status = 'erfolgreich') AS last_success,
                max(started_at) FILTER (WHERE status <> 'erfolgreich') AS last_failure
         FROM code_updates`,
      );
      if (!isUpdateDue(new Date(), { lastSuccess: state.last_success, lastFailure: state.last_failure }, options)) return;
      const result = await runUpdate();
      console.log('Code-Update:', JSON.stringify(result));
    } catch (error) {
      console.error('Code-Update fehlgeschlagen:', error.message);
    }
  };
  setTimeout(check, 30_000).unref();
  setInterval(check, HOUR / 4).unref();
}

export async function recentUpdates(limit = 10) {
  const { rows } = await pool.query(
    `SELECT id, status, started_at AS "startedAt", finished_at AS "finishedAt", source_sha AS "sourceSha",
            checked, inserted, updated, removed, message
     FROM code_updates ORDER BY id DESC LIMIT $1`,
    [limit],
  );
  return rows;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await migrate();
  console.log(JSON.stringify(await runUpdate(), null, 2));
  await pool.end();
}
