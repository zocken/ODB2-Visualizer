import express from 'express';

const MODEL = 'devstral-small-2-24b-instruct-2512';
const SYSTEM = 'Du bist der deutschsprachige KI-Assistent von OBD2 Klartext. Hilf bei Fragen zu OBD2-Fehlercodes und Fahrzeugtechnik. Antworte verständlich, knapp und mit konkreten nächsten Schritten. Unterscheide mögliche Ursachen von bestätigten Diagnosen. Frage bei Bedarf nach Fahrzeug, Baujahr, Motor und Symptomen. Erfinde keine Messwerte oder fahrzeugspezifischen Angaben. Bei sicherheitskritischen Symptomen empfehle sicheres Anhalten und eine Fachwerkstatt. Gib keine Anleitung zum Umgehen von Sicherheits- oder Abgassystemen. Nutze kurze Absätze und einfache Aufzählungen ohne Tabellen.';
const CODE = /^[PBCU][0-9A-F]{4}$/;
const CODE_IN_TEXT = /\b[PBCU][0-9A-F]{4}\b/gi;
const SLUG = /^[a-z0-9-]{1,40}$/;
const MAX_CODES = 3;
const FIRST_TOKEN_MS = 180000; // Wartezeit bis zum Antwortbeginn (ohne Streaming: bis zur ganzen Antwort, lokal ~100 s)
const IDLE_MS = 60000; // längste Pause zwischen zwei Antwortteilen

// Codes für den Datenbankkontext: zuerst aus der aktuellen Frage, dann der gerade angezeigte Code,
// dann aus früheren Fragen (damit Rückfragen wie „Und was kostet das?“ beim Thema bleiben).
export function codesFor(messages, contextCode) {
  const fromText = (m) => (m.content.match(CODE_IN_TEXT) || []).map((c) => c.toUpperCase());
  const users = messages.filter((m) => m.role === 'user');
  const ordered = [...fromText(users.at(-1)), contextCode, ...users.slice(0, -1).reverse().flatMap(fromText)];
  return [...new Set(ordered.filter((c) => c && CODE.test(c)))].slice(0, MAX_CODES);
}

// Fakten aus der eigenen Datenbasis als zusätzliche Systemnachricht.
export function factsMessage({ entries, manufacturerName }, codes, contextCode) {
  const lines = [];
  if (manufacturerName) lines.push(`Auf der Seite gewählter Hersteller: ${manufacturerName}.`);
  if (contextCode) lines.push(`Auf der Seite gerade angezeigter Code: ${contextCode}.`);
  for (const e of entries) {
    lines.push('', `${e.code} – ${e.title}${e.manufacturer ? ` (herstellerspezifisch, ${e.manufacturer})` : ' (Standardcode)'}`,
      `System: ${e.system}; Dringlichkeit: ${e.urgency}; typischer Einbauort: ${e.location}`,
      `Erklärung: ${e.explanation}`);
    if (e.causes.length) lines.push(`Mögliche Ursachen: ${e.causes.join('; ')}`);
    if (e.source !== 'redaktionell') lines.push(`Originalbezeichnung: ${e.titleEn || e.title}. Automatisch übersetzter Eintrag, nicht redaktionell geprüft.`);
  }
  const missing = codes.filter((c) => !entries.some((e) => e.code === c));
  if (missing.length) lines.push('', `Nicht in der Datenbasis${manufacturerName ? ` (für ${manufacturerName})` : ''}: ${missing.join(', ')}. Sag das offen und gib keine sichere Bedeutung an; die Bedeutung kann herstellerabhängig sein.`);
  if (!lines.length) return null;
  return 'Daten aus der OBD2-Klartext-Datenbasis. Nutze für die Bedeutung eines Codes diese Angaben und ihre deutschen Bezeichnungen statt eigener Vermutungen; ergänze sie mit allgemeinem Wissen, ohne ihnen zu widersprechen.\n'
    + lines.join('\n');
}

// Liest die Antwort des Gateways: Server-Sent Events (stream) oder, falls das Gateway nicht streamt, ein JSON-Objekt.
async function* answerParts(upstream) {
  if (!(upstream.headers.get('content-type') || '').includes('text/event-stream')) {
    const data = await upstream.json();
    const text = data.choices?.[0]?.message?.content;
    if (typeof text === 'string') yield text;
    return;
  }
  const decoder = new TextDecoder();
  let buffer = '';
  for await (const chunk of upstream.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      const payload = line.trim().replace(/^data:\s*/, '');
      if (!line.trim().startsWith('data:') || !payload) continue;
      if (payload === '[DONE]') return;
      let event;
      try { event = JSON.parse(payload); } catch { continue; }
      const text = event.choices?.[0]?.delta?.content ?? event.choices?.[0]?.message?.content;
      if (typeof text === 'string' && text) yield text;
    }
  }
}

export function createChatRouter({
  gatewayUrl = process.env.LM_GATEWAY_URL,
  gatewayKey = process.env.LM_GATEWAY_KEY,
  lookupCodes = async () => ({ entries: [], manufacturerName: null }),
  fetchImpl = globalThis.fetch,
  clock = Date.now,
} = {}) {
  const router = express.Router();
  let active = 0;
  let streaming = true; // false, sobald das Gateway Streaming abgelehnt hat
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
    // Seitenkontext (angezeigter Code, Herstellerauswahl) ist optional; Ungültiges wird ignoriert.
    const { code: shown, manufacturer: maker } = req.body.context ?? {};
    const contextCode = typeof shown === 'string' && CODE.test(shown) ? shown : null;
    const manufacturer = typeof maker === 'string' && SLUG.test(maker) ? maker : null;
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
    let timeout = setTimeout(() => controller.abort(), FIRST_TOKEN_MS);
    const disconnect = () => { if (!res.writableEnded) controller.abort(); };
    res.on('close', disconnect);
    const send = (obj) => res.write(`${JSON.stringify(obj)}\n`);
    try {
      const codes = codesFor(messages, contextCode);
      let facts = { entries: [], manufacturerName: null };
      try { facts = await lookupCodes(codes, manufacturer); } catch (error) { console.error('Chat-Kontext nicht verfügbar:', error.message); }
      const context = factsMessage(facts, codes, contextCode);
      const request = (stream) => fetchImpl(`${gatewayUrl.replace(/\/$/, '')}/v1/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${gatewayKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          // Nur eine Systemnachricht: Mistral-/Devstral-Vorlagen lehnen eine zweite ab.
          messages: [{ role: 'system', content: context ? `${SYSTEM}\n\n${context}` : SYSTEM },
            ...messages.map(({ role, content }) => ({ role, content }))],
          max_tokens: 768,
          stream,
        }),
        signal: controller.signal,
      });
      let upstream = await request(streaming);
      // Gateways ohne Streaming lehnen stream: true teils ab – dann einmal ohne Streaming versuchen.
      if (streaming && [400, 404, 415, 422, 501].includes(upstream.status)) {
        console.error(`Chat-Gateway lehnt Streaming ab (HTTP ${upstream.status}), neuer Versuch ohne Streaming.`);
        upstream = await request(false);
        if (upstream.ok) streaming = false;
      }
      if (upstream.status === 429) { res.set('Retry-After', '15'); return fail(429, 'Die KI ist gerade ausgelastet. Bitte versuche es gleich noch einmal.'); }
      if (!upstream.ok) {
        console.error(`Chat-Gateway antwortet mit HTTP ${upstream.status}.`);
        return fail(503, 'Die KI ist momentan nicht erreichbar. Bitte versuche es später erneut.');
      }
      // Antwort als NDJSON: zuerst die verwendeten Datenbankeinträge, dann Textteile, zum Schluss done.
      res.status(200).set({ 'Content-Type': 'application/x-ndjson; charset=utf-8', 'X-Accel-Buffering': 'no' });
      send({ sources: facts.entries.map(({ code, title, manufacturer: maker }) => ({ code, title, manufacturer: maker })) });
      let answered = false;
      for await (const part of answerParts(upstream)) {
        clearTimeout(timeout);
        timeout = setTimeout(() => controller.abort(), IDLE_MS);
        answered ||= Boolean(part.trim());
        send({ delta: part });
      }
      send(answered ? { done: true } : { error: 'Die KI hat keine Antwort geliefert. Bitte versuche es noch einmal.' });
      res.end();
    } catch (reason) {
      // Nur Fehlerart und -code ins Log, keine URL oder Schlüssel.
      if (!controller.signal.aborted) console.error(`Chat-Gateway nicht erreichbar: ${reason?.cause?.code || reason?.name || 'Fehler'}`);
      const error = controller.signal.aborted ? 'Die Antwort dauert zu lange. Bitte versuche eine kürzere Frage.' : 'Die KI ist momentan nicht erreichbar. Bitte versuche es später erneut.';
      if (res.destroyed) return;
      if (res.headersSent) { send({ error }); res.end(); } else fail(controller.signal.aborted ? 504 : 503, error);
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
