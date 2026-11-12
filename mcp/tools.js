import { z } from 'zod';

export const LOOKUP_TOOL = 'lookup_obd_codes';

export function registerObdTools(server, { lookup }) {
  if (typeof lookup !== 'function') throw new TypeError('lookup muss eine Funktion sein');
  server.registerTool(LOOKUP_TOOL, {
    title: 'OBD2-Codes nachschlagen',
    description: 'Liest bis zu drei OBD2-Fehlercodes aus der OBD2-Klartext-Datenbasis. Herstellerspezifische Eintraege haben Vorrang vor Standardcodes.',
    inputSchema: {
      codes: z.array(z.string().regex(/^[PBCU][0-9A-F]{4}$/)).min(1).max(3),
      manufacturer: z.string().regex(/^[a-z0-9-]{1,40}$/).nullable().optional(),
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async ({ codes, manufacturer }) => {
    const result = await lookup(codes, manufacturer || null);
    return {
      content: [{ type: 'text', text: JSON.stringify(result) }],
      structuredContent: result,
    };
  });
}
