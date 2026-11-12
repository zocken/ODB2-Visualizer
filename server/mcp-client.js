import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { LOOKUP_TOOL, WEB_RESEARCH_TOOL } from '../mcp/tools.js';

async function callMcpTool(name, arguments_, {
  url = process.env.MCP_URL || 'http://mcp:8090/mcp',
  ClientClass = Client,
  TransportClass = StreamableHTTPClientTransport,
} = {}) {
  const client = new ClientClass({ name: 'obd2-klartext-chat', version: '1.0.0' });
  try {
    await client.connect(new TransportClass(new URL(url)));
    const result = await client.callTool({ name, arguments: arguments_ });
    if (result.isError) throw new Error('MCP-Werkzeug meldet einen Fehler');
    if (result.structuredContent) return result.structuredContent;
    const text = result.content?.find(part => part.type === 'text')?.text;
    if (!text) throw new Error('MCP-Werkzeug liefert keine Daten');
    return JSON.parse(text);
  } finally {
    await client.close().catch(() => {});
  }
}

export async function lookupCodesViaMcp(codes, manufacturer, {
  url = process.env.MCP_URL || 'http://mcp:8090/mcp',
  ClientClass = Client,
  TransportClass = StreamableHTTPClientTransport,
} = {}) {
  if (!codes.length) return { entries: [], manufacturerName: null };
  return callMcpTool(LOOKUP_TOOL, { codes, manufacturer: manufacturer || null }, { url, ClientClass, TransportClass });
}

export function researchWebViaMcp(query, options) {
  return callMcpTool(WEB_RESEARCH_TOOL, { query }, options);
}
