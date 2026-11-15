// Lists loaded language models through the private gateway; credentials never reach the browser.
export function createModelCatalog({ gatewayUrl, gatewayKey, fetchImpl = fetch, clock = Date.now, ttl = 10_000 }) {
  let cached, expires = 0, pending;
  return async () => {
    if (cached && clock() < expires) return cached;
    if (pending) return pending;
    pending = (async () => {
      const response = await fetchImpl(`${gatewayUrl.replace(/\/$/, '')}/v1/models`, {
        headers: { Authorization: `Bearer ${gatewayKey}` }, signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error('Model inventory unavailable');
      const data = await response.json();
      if (!Array.isArray(data.data)) throw new Error('Invalid model inventory');
      const seen = new Set();
      cached = data.data.slice(0, 100).flatMap(item => {
        const id = item?.id;
        if (typeof id !== 'string' || !id.trim() || id.length > 200 || /[\x00-\x1f\x7f]/.test(id) || seen.has(id)) return [];
        seen.add(id);
        return [{ id, name: typeof item.name === 'string' ? item.name.slice(0, 200) : id }];
      });
      expires = clock() + ttl;
      return cached;
    })();
    try { return await pending; } finally { pending = null; }
  };
}
