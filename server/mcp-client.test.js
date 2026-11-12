import test from 'node:test';
import assert from 'node:assert/strict';
import { lookupCodesViaMcp, researchWebViaMcp } from './mcp-client.js';

test('MCP-Client gibt leere Antwort ohne Verbindung zurueck, wenn kein Code vorliegt', async () => {
  const result = await lookupCodesViaMcp([], null);
  assert.deepEqual(result, { entries: [], manufacturerName: null });
});

test('MCP-Client ruft das Recherchewerkzeug auf', async () => {
  let call;
  class FakeTransport {}
  class FakeClient {
    async connect() {}
    async callTool(request) {
      call = request;
      return { structuredContent: { query: request.arguments.query, results: [] } };
    }
    async close() {}
  }
  const result = await researchWebViaMcp('AGR Ventil Funktion', {
    url: 'http://mcp.test/mcp', ClientClass: FakeClient, TransportClass: FakeTransport,
  });
  assert.deepEqual(call, { name: 'research_vehicle_web', arguments: { query: 'AGR Ventil Funktion' } });
  assert.equal(result.query, 'AGR Ventil Funktion');
});

test('MCP-Client ruft das Lookup-Werkzeug auf', async () => {
  let call;
  class FakeTransport { constructor(url) { assert.equal(url.href, 'http://mcp.test/mcp'); } }
  class FakeClient {
    async connect() {}
    async callTool(request) {
      call = request;
      return { structuredContent: { entries: [{ code: 'P0420' }], manufacturerName: null } };
    }
    async close() {}
  }
  const result = await lookupCodesViaMcp(['P0420'], null, {
    url: 'http://mcp.test/mcp', ClientClass: FakeClient, TransportClass: FakeTransport,
  });
  assert.deepEqual(call, { name: 'lookup_obd_codes', arguments: { codes: ['P0420'], manufacturer: null } });
  assert.equal(result.entries[0].code, 'P0420');
});
