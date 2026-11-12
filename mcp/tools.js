import { z } from 'zod';

export const LOOKUP_TOOL = 'lookup_obd_codes';
export const WEB_RESEARCH_TOOL = 'research_vehicle_web';

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

export function registerResearchTools(server, { search }) {
  if (typeof search !== 'function') throw new TypeError('search muss eine Funktion sein');
  server.registerTool(WEB_RESEARCH_TOOL, {
    title: 'Fahrzeugthema im Internet recherchieren',
    description: 'Sucht aktuelle oder allgemeine Informationen zu Fahrzeugtechnik, Wartung, Diagnose und Sicherheit. Nur verwenden, wenn die OBD2-Datenbasis und das vorhandene Wissen für die Frage nicht ausreichen oder aktuelle Quellen nötig sind.',
    inputSchema: {
      query: z.string().trim().min(3).max(240).describe('Kurze, sachliche Suchanfrage zum Fahrzeugthema'),
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }, async ({ query }) => {
    const result = await search(query);
    return {
      content: [{ type: 'text', text: JSON.stringify(result) }],
      structuredContent: result,
    };
  });
}
