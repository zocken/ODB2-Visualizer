import express from 'express';

const MODEL = 'devstral-small-2-24b-instruct-2512';
const SYSTEM = 'Du bist der deutschsprachige KI-Assistent von OBD2 Klartext. Hilf bei Fragen zu OBD2-Fehlercodes und Fahrzeugtechnik. Antworte verständlich, knapp und mit konkreten nächsten Schritten. Unterscheide mögliche Ursachen von bestätigten Diagnosen. Frage bei Bedarf nach Fahrzeug, Baujahr, Motor und Symptomen. Erfinde keine Messwerte oder fahrzeugspezifischen Angaben. Bei sicherheitskritischen Symptomen empfehle sicheres Anhalten und eine Fachwerkstatt. Gib keine Anleitung zum Umgehen von Sicherheits- oder Abgassystemen. Nutze kurze Absätze und einfache Aufzählungen ohne Tabellen.';

export function createChatRouter({
  gatewayUrl = process.env.LM_GATEWAY_URL,
  gatewayKey = process.env.LM_GATEWAY_KEY,
  fetchImpl = globalThis.fetch,
  clock = Date.now,
} = {}) {
  const router = express.Router();
  let active = 0;
  let globalCalls = [];
  const visitors = new Map();
  router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  router.post('/', express.json({ limit: '16kb' }), async (req, res) => {
    const fail = (status, error) => res.status(status).json({ error });
    const origin = req.get('origin');
    if (origin && origin !== `${req.protocol}://${req.get('host')}`) return fail(403, 'Bitte öffne den Chat direkt auf dieser Website.');
    const messages = req.body?.messages;
    if (!Array.isArray(messages) || !messages.length || messages.length > 12 ||
      messages.some(m => !m || !['user', 'assistant'].includes(m.role) || typeof m.content !== 'string' || !m.content.trim() || m.content.length > 4000) ||
      messages.at(-1).role !== 'user' || messages.at(-1).content.length > 2000 ||
      messages.reduce((n, m) => n + m.content.length, 0) > 12000) {
      return fail(400, 'Bitte sende eine Frage mit höchstens 2.000 Zeichen.');
    }
    if (!gatewayUrl || !gatewayKey) return fail(503, 'Der KI-Chat ist noch nicht eingerichtet. Bitte versuche es später erneut.');
    const now = clock();
    for (const [ip, calls] of visitors) if (calls.at(-1) <= now - 60000) visitors.delete(ip);
    globalCalls = globalCalls.filter(t => t > now - 60000);
    const ip = req.ip || 'unknown';
    const calls = (visitors.get(ip) || []).filter(t => t > now - 60000);
    if (calls.length >= 6 || globalCalls.length >= 18 || active >= 2 || (!visitors.has(ip) && visitors.size >= 1000)) {
      res.set('Retry-After', '15');
      return fail(429, 'Die KI ist gerade ausgelastet. Bitte warte einen Moment und versuche es erneut.');
    }
    calls.push(now); visitors.set(ip, calls); globalCalls.push(now); active++;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);
    const disconnect = () => { if (!res.writableEnded) controller.abort(); };
    res.on('close', disconnect);
    try {
      const upstream = await fetchImpl(`${gatewayUrl.replace(/\/$/, '')}/v1/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${gatewayKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: MODEL, messages: [{ role: 'system', content: SYSTEM }, ...messages.map(({ role, content }) => ({ role, content }))], max_tokens: 768, stream: false }),
        signal: controller.signal,
      });
      if (upstream.status === 429) { res.set('Retry-After', '15'); return fail(429, 'Die KI ist gerade ausgelastet. Bitte versuche es gleich noch einmal.'); }
      if (!upstream.ok) return fail(503, 'Die KI ist momentan nicht erreichbar. Bitte versuche es später erneut.');
      const data = await upstream.json();
      const answer = data.choices?.[0]?.message?.content;
      if (typeof answer !== 'string' || !answer.trim()) return fail(502, 'Die KI hat keine Antwort geliefert. Bitte versuche es noch einmal.');
      res.json({ answer: answer.trim() });
    } catch {
      if (!res.destroyed && !res.headersSent) fail(controller.signal.aborted ? 504 : 503,
        controller.signal.aborted ? 'Die Antwort dauert zu lange. Bitte versuche eine kürzere Frage.' : 'Die KI ist momentan nicht erreichbar. Bitte versuche es später erneut.');
    } finally {
      clearTimeout(timeout); res.off('close', disconnect); active--;
    }
  });
  router.use((error, _req, res, _next) => {
    const status = error.type === 'entity.too.large' ? 413 : 400;
    res.status(status).json({ error: status === 413 ? 'Der Chatverlauf ist zu lang. Bitte starte ein neues Gespräch.' : 'Die Anfrage konnte nicht gelesen werden.' });
  });
  return router;
}
