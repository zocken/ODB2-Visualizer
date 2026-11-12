const MAX_RESULTS = 5;

function clean(value, limit) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

function publicHttpUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url : null;
  } catch { return null; }
}

export async function searchVehicleWeb(query, {
  url = process.env.SEARXNG_URL || 'http://search:8080',
  fetchImpl = globalThis.fetch,
  signal,
} = {}) {
  const normalized = clean(query, 240);
  if (normalized.length < 3) throw new Error('Suchanfrage ist zu kurz');
  const endpoint = new URL('/search', `${url.replace(/\/$/, '')}/`);
  const body = new URLSearchParams({ q: normalized, format: 'json', language: 'de-DE', safesearch: '1', categories: 'general' });
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal,
  });
  if (!response.ok) throw new Error(`Suche antwortet mit HTTP ${response.status}`);
  const data = await response.json();
  const seen = new Set();
  const results = [];
  for (const item of Array.isArray(data.results) ? data.results : []) {
    const target = publicHttpUrl(item.url);
    if (!target || seen.has(target.href)) continue;
    const title = clean(item.title, 200);
    const snippet = clean(item.content, 700);
    if (!title || !snippet) continue;
    seen.add(target.href);
    results.push({ title, url: target.href, domain: target.hostname.replace(/^www\./, ''), snippet });
    if (results.length === MAX_RESULTS) break;
  }
  return { query: normalized, searchedAt: new Date().toISOString(), results };
}
