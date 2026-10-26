// Anonyme Nutzungsstatistik: zählt Ereignisse je Tag, ohne Kennungen zu speichern.
// Die IP dient nur kurzzeitig im Arbeitsspeicher der Begrenzung gegen Spam und wird nie gespeichert.
import { pool } from './db.js';

const CODE = /^[PBCU][0-9A-F]{4}$/;
const SLUG = /^[a-z0-9-]{1,40}$/;
// Erlaubte Ereignisse und ihre Schlüssel
const VALIDATE = {
  pageview: (key) => key === '',
  lookup: (key) => CODE.test(key),
  missing: (key) => CODE.test(key),
  manufacturer: (key) => SLUG.test(key),
  device: (key) => key === 'mobile' || key === 'desktop',
};
const RETENTION_DAYS = 365;
const LIMIT_PER_MINUTE = 60;

const buckets = new Map(); // IP → { count, reset } (nur im Arbeitsspeicher)
// Abgelaufene Einträge regelmäßig verwerfen: keine IP bleibt länger als etwa eine Minute im Speicher.
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (b.reset < now) buckets.delete(k);
}, 15_000).unref();
function allowed(ip) {
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (!bucket || bucket.reset < now) {
    if (buckets.size >= 10_000) return false;
    buckets.set(ip, { count: 1, reset: now + 60_000 });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= LIMIT_PER_MINUTE;
}

let lastCleanup = 0;
export async function recordEvents(ip, events) {
  if (!allowed(ip)) return { accepted: 0, limited: true };
  const valid = (Array.isArray(events) ? events : []).slice(0, 5)
    .map((e) => ({ type: String(e?.type || ''), key: String(e?.key ?? '').slice(0, 40) }))
    .filter((e) => VALIDATE[e.type]?.(e.key));
  for (const e of valid) {
    await pool.query(
      `INSERT INTO usage_daily (day, metric, key, count) VALUES (current_date, $1, $2, 1)
       ON CONFLICT (day, metric, key) DO UPDATE SET count = usage_daily.count + 1`,
      [e.type, e.key],
    );
  }
  if (Date.now() - lastCleanup > 24 * 3_600_000) {
    lastCleanup = Date.now();
    await pool.query(`DELETE FROM usage_daily WHERE day < current_date - $1::int`, [RETENTION_DAYS]);
  }
  return { accepted: valid.length };
}

// Zusammenfassung der letzten `days` Tage für das Statistik-Fenster.
export async function usageSummary(days = 30) {
  const span = Math.min(Math.max(Number(days) || 30, 1), RETENTION_DAYS);
  const since = `current_date - ${span - 1}`;
  const [daily, totals, topCodes, missing, makers, devices] = await Promise.all([
    pool.query(
      `SELECT to_char(d::date, 'YYYY-MM-DD') AS day,
              coalesce(sum(u.count) FILTER (WHERE u.metric = 'pageview'), 0)::int AS pageviews,
              coalesce(sum(u.count) FILTER (WHERE u.metric IN ('lookup', 'missing')), 0)::int AS lookups
       FROM generate_series(${since}, current_date, interval '1 day') d
       LEFT JOIN usage_daily u ON u.day = d::date
       GROUP BY d ORDER BY d`,
    ),
    pool.query(
      `SELECT metric, (day = current_date) AS today, sum(count)::int AS n
       FROM usage_daily WHERE day >= ${since} AND metric IN ('pageview', 'lookup', 'missing')
       GROUP BY metric, (day = current_date)`,
    ),
    pool.query(`SELECT key, sum(count)::int AS n FROM usage_daily WHERE day >= ${since} AND metric = 'lookup' GROUP BY key ORDER BY n DESC, key LIMIT 10`),
    pool.query(`SELECT key, sum(count)::int AS n FROM usage_daily WHERE day >= ${since} AND metric = 'missing' GROUP BY key ORDER BY n DESC, key LIMIT 10`),
    pool.query(
      `SELECT u.key, coalesce(m.name, u.key) AS name, sum(u.count)::int AS n
       FROM usage_daily u LEFT JOIN manufacturers m ON m.slug = u.key
       WHERE u.day >= ${since} AND u.metric = 'manufacturer' GROUP BY u.key, m.name ORDER BY n DESC LIMIT 10`,
    ),
    pool.query(`SELECT key, sum(count)::int AS n FROM usage_daily WHERE day >= ${since} AND metric = 'device' GROUP BY key`),
  ]);
  const sum = (metric, today) => totals.rows.filter((r) => metric.includes(r.metric) && (today === undefined || r.today === today)).reduce((a, r) => a + r.n, 0);
  return {
    days: span,
    totals: {
      pageviews: sum(['pageview']), pageviewsToday: sum(['pageview'], true),
      lookups: sum(['lookup', 'missing']), lookupsToday: sum(['lookup', 'missing'], true),
      missing: sum(['missing']),
    },
    daily: daily.rows,
    topCodes: topCodes.rows,
    missingCodes: missing.rows,
    manufacturers: makers.rows,
    devices: Object.fromEntries(devices.rows.map((r) => [r.key, r.n])),
  };
}
