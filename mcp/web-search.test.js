import test from 'node:test';
import assert from 'node:assert/strict';
import { searchVehicleWeb } from './web-search.js';

test('SearXNG-Suche begrenzt und bereinigt Ergebnisse', async () => {
  let requested;
  const result = await searchVehicleWeb('  AGR Ventil Funktion  ', {
    url: 'http://search.test:8080',
    fetchImpl: async (url, options) => {
      requested = { url, options };
      return Response.json({ results: [
        { title: '  Fachartikel  ', url: 'https://example.org/agr', content: 'Erklärung\nmit   Abständen' },
        { title: 'Doppelt', url: 'https://example.org/agr', content: 'noch einmal' },
        { title: 'Intern', url: 'file:///etc/passwd', content: 'nicht zulässig' },
      ] });
    },
  });
  assert.equal(requested.url.href, 'http://search.test:8080/search');
  assert.equal(requested.options.body.get('q'), 'AGR Ventil Funktion');
  assert.equal(requested.options.body.get('format'), 'json');
  assert.equal(requested.options.method, 'POST');
  assert.equal(requested.options.headers.Accept, 'application/json');
  assert.deepEqual(result.results, [{ title: 'Fachartikel', url: 'https://example.org/agr', domain: 'example.org', snippet: 'Erklärung mit Abständen' }]);
});

test('SearXNG-Suche lehnt zu kurze Anfragen ab', async () => {
  await assert.rejects(() => searchVehicleWeb('x'), /zu kurz/);
});
