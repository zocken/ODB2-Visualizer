import test from 'node:test';
import assert from 'node:assert/strict';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { LOOKUP_TOOL, registerObdTools } from './tools.js';

test('lookup_obd_codes liefert strukturierte Daten ueber MCP', async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = new McpServer({ name: 'test', version: '1.0.0' });
  registerObdTools(server, { lookup: async (codes, manufacturer) => ({
    entries: [{ code: codes[0], title: 'Testeintrag', manufacturer }],
    manufacturerName: 'BMW',
  }) });
  const client = new Client({ name: 'test-client', version: '1.0.0' });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  const result = await client.callTool({ name: LOOKUP_TOOL, arguments: { codes: ['P0301'], manufacturer: 'bmw' } });
  assert.equal(result.structuredContent.entries[0].code, 'P0301');
  assert.equal(result.structuredContent.manufacturerName, 'BMW');
  await client.close();
  await server.close();
});
