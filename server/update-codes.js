// Automatische Ergänzung fehlender Pkw-Codes aus github.com/Wal33D/dtc-database (MIT).
// Lädt den aktuellen Stand der Quelle, wandelt ihn mit server/wal33d.js um und legt nur
// Codes an, die noch nicht in der Datenbank stehen. Vorhandene Einträge bleiben unverändert.
//
// Manuell: npm run update-codes
import { fileURLToPath } from 'node:url';
import { pool, migrate } from './db.js';
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
      data.codes.push({ ...e, source });
    }
  }
  if (data.codes.length < MIN_EXPECTED_CODES) throw new Error(`Quelle unvollständig (${data.codes.length} Codes)`);
  return { sha, data, skipped };
}

export async function runUpdate() {
  const client = await pool.connect();
  try {
    const { rows: [{ locked }] } = await client.query('SELECT pg_try_advisory_lock($1) AS locked', [LOCK_ID]);
    if (!locked) return { status: 'läuft bereits' };
    const { rows: [run] } = await client.query(`INSERT INTO code_updates (status) VALUES ('läuft') RETURNING id`);
    try {
      const { sha, data, skipped } = await loadSource();
      const inserted = await importData(data, { onlyMissing: true });
      await client.query(
        `UPDATE code_updates SET status = 'erfolgreich', finished_at = now(), source_sha = $2, checked = $3, inserted = $4, message = $5
         WHERE id = $1`,
        [run.id, sha, data.codes.length, inserted, `${skipped} Nutzfahrzeug-Codes übersprungen`],
      );
      return { status: 'erfolgreich', sha, checked: data.codes.length, inserted, skipped };
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

// Prüft stündlich, ob der letzte erfolgreiche Lauf älter als intervalDays ist.
// Nach einem Neustart oder Ruhezustand wird ein fälliger Lauf beim nächsten Check nachgeholt;
// nach einem Fehler wird frühestens nach retryHours erneut versucht.
export function scheduleUpdates({ intervalDays = 7, retryHours = 6 } = {}) {
  const check = async () => {
    try {
      const { rows: [state] } = await pool.query(
        `SELECT max(finished_at) FILTER (WHERE status = 'erfolgreich') AS last_success,
                max(started_at) FILTER (WHERE status <> 'erfolgreich') AS last_failure
         FROM code_updates`,
      );
      const now = Date.now();
      if (state.last_success && now - state.last_success.getTime() < intervalDays * 24 * HOUR) return;
      if (state.last_failure && now - state.last_failure.getTime() < retryHours * HOUR) return;
      const result = await runUpdate();
      console.log('Code-Update:', JSON.stringify(result));
    } catch (error) {
      console.error('Code-Update fehlgeschlagen:', error.message);
    }
  };
  setTimeout(check, 30_000).unref();
  setInterval(check, HOUR).unref();
}

export async function recentUpdates(limit = 10) {
  const { rows } = await pool.query(
    `SELECT id, status, started_at AS "startedAt", finished_at AS "finishedAt", source_sha AS "sourceSha",
            checked, inserted, message
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
