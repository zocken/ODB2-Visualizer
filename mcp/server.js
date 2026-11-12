import express from 'express';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { pool } from '../server/db.js';
import { lookupCodes } from '../server/code-context.js';
import { registerObdTools, registerResearchTools } from './tools.js';
import { searchVehicleWeb } from './web-search.js';

const PORT = Number(process.env.PORT || 8090);
const app = express();
const sessions = new Map();

app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));

function createServer() {
  const server = new McpServer({ name: 'obd2-klartext', version: '1.0.0' });
  registerObdTools(server, { lookup: lookupCodes });
  registerResearchTools(server, { search: searchVehicleWeb });
  return server;
}

app.get(['/health', '/api/health'], async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, protocol: 'mcp', tools: ['lookup_obd_codes', 'research_vehicle_web'] });
  } catch {
    res.status(503).json({ ok: false });
  }
});

app.post('/mcp', async (req, res) => {
  const sessionId = req.get('mcp-session-id');
  let transport = sessionId ? sessions.get(sessionId) : null;
  if (!transport && !sessionId && isInitializeRequest(req.body)) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: randomUUID,
      onsessioninitialized: id => sessions.set(id, transport),
    });
    transport.onclose = () => {
      if (transport.sessionId) sessions.delete(transport.sessionId);
    };
    await createServer().connect(transport);
  }
  if (!transport) return res.status(400).json({ error: 'Ungueltige oder fehlende MCP-Sitzung.' });
  await transport.handleRequest(req, res, req.body);
});

for (const method of ['get', 'delete']) app[method]('/mcp', async (req, res) => {
  const transport = sessions.get(req.get('mcp-session-id'));
  if (!transport) return res.status(400).json({ error: 'Ungueltige oder fehlende MCP-Sitzung.' });
  await transport.handleRequest(req, res);
});

app.use((error, _req, res, _next) => {
  console.error(`MCP-Anfrage fehlgeschlagen: ${error?.name || 'Fehler'}`);
  if (!res.headersSent) res.status(500).json({ error: 'MCP-Anfrage fehlgeschlagen.' });
});

const httpServer = app.listen(PORT, '0.0.0.0', () => console.log(`OBD2 MCP laeuft auf Port ${PORT}`));
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => {
  for (const transport of sessions.values()) transport.close().catch(() => {});
  httpServer.close(() => pool.end().then(() => process.exit(0)));
});
