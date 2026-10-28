import express from 'express';

// Modell laut LM Studio; über LM_MODEL änderbar. Ein Wechsel braucht laut KI-Richtlinie (Abschnitt 9) eine erneute Prüfung.
export const DEFAULT_MODEL = 'qwen3.8-flash-next';
// Systemanweisung nach der KI-Richtlinie (Abschnitte 2, 4 und 5).
const SYSTEM = 'Du bist der deutschsprachige KI-Assistent von OBD2 Klartext. Hilf bei Fragen zu OBD2-Fehlercodes und Fahrzeugtechnik. Antworte verständlich, knapp und mit konkreten nächsten Schritten. '
  + 'Sicherheit hat Vorrang vor Kürze und Vollständigkeit: Bei Anzeichen akuter Gefahr fordere zum sicheren Anhalten und zur fachlichen Abklärung auf und relativiere gefährliche Symptome nicht. '
  + 'Gib keine gesicherte Diagnose, keine verbindliche Reparaturentscheidung und keine Freigabe zur Weiterfahrt; ein Fehlercode allein beweist keinen Bauteildefekt. Bezeichne Ursachen als Möglichkeiten. '
  + 'Erfinde keine Messwerte, Sollwerte, Herstellerangaben, Quellen oder Prüfergebnisse. Fehlen Angaben zu Fahrzeug, Baujahr, Motor oder Symptomen, benenne das und frage danach. '
  + 'Gib keine Anleitung zum Deaktivieren oder Umgehen von Sicherheits- oder Abgassystemen. Bei Arbeiten mit erheblichem Verletzungsrisiko (Airbag, Hochvolt, Bremsen, heißes Kühlsystem) verweise auf qualifiziertes Fachpersonal. '
  + 'Nutze kurze Absätze und einfache Aufzählungen ohne Tabellen.';
const CODE = /^[PBCU][0-9A-F]{4}$/;
const CODE_IN_TEXT = /\b[PBCU][0-9A-F]{4}\b/gi;
const SLUG = /^[a-z0-9-]{1,40}$/;
const MAX_CODES = 3;
// Gleiche Weiterfahrt-Einschätzung wie auf der Ergebnisseite (dist/app.js, SAFETY und adviceFor), damit Chat und Seite übereinstimmen.
// Sicherheitsrelevante Systeme gehen der Dringlichkeitsfarbe vor (KI-Richtlinie, Abschnitt 4).
const SAFETY = [
  [/ABS|Bremse|Fahrstabilit/i, 'nur nach Prüfung (Bremsen und Fahrstabilität). Leuchtet die rote Bremswarnleuchte oder fühlt sich die Bremse anders an, nicht weiterfahren. Sonst nur vorsichtig und direkt zur Fachwerkstatt – ABS und ESP können ausgefallen sein.'],
  [/Lenkung/i, 'nur nach Prüfung (Lenkung). Wird die Lenkung schwergängig, ungewohnt oder erscheint eine Lenkungswarnung, sicher anhalten und nicht weiterfahren.'],
  [/Schmierung|Öldruck/i, 'nur nach Prüfung (Öldruck). Bei Öldruckwarnung sofort sicher anhalten und den Motor abstellen. Nicht weiterfahren, bevor die Ursache geklärt ist.'],
  [/Kühlung|Kühlsystem|Überhitz/i, 'nur nach Prüfung (Motorkühlung). Steigt die Temperaturanzeige, erscheint eine Temperaturwarnung oder tritt Dampf aus: sofort sicher anhalten und den Motor abstellen. Das heiße Kühlsystem nicht öffnen.'],
  [/Rückhalte|Airbag|Gurt/i, 'nur nach Prüfung (Airbag und Gurte). Airbags oder Gurtstraffer lösen bei einem Unfall möglicherweise nicht aus. Nicht selbst am System arbeiten und zeitnah eine Fachwerkstatt aufsuchen.'],
  [/Hybrid|Elektroantrieb|Hochvolt/i, 'nur nach Prüfung (Hochvoltsystem). Keine eigenen Arbeiten am Hochvoltsystem – nur durch entsprechend geschultes Fachpersonal. Bei einer Hochvolt-Warnmeldung sicher anhalten.'],
];
const DRIVING = {
  Rot: 'nur eingeschränkt. Starke Belastung und längere Fahrten vermeiden; bei deutlichen Symptomen, roter oder blinkender Warnleuchte sicher anhalten. Zeitnah fachlich prüfen lassen.',
  Gelb: 'meist möglich, solange keine starken Symptome oder roten Warnleuchten auftreten. Hohe Belastung vermeiden und zeitnah prüfen lassen.',
  Grün: 'meist möglich, wenn das Fahrzeug normal fährt und keine weiteren Warnzeichen auftreten. Nach einigen Fahrten erneut auslesen.',
};
export const drivingAdvice = (e) => SAFETY.find(([re]) => re.test(e.system))?.[1] ?? DRIVING[e.urgency];
const FIRST_TOKEN_MS = 180000; // Wartezeit bis zum Antwortbeginn (ohne Streaming: bis zur ganzen Antwort, lokal ~100 s)
const IDLE_MS = 60000; // längste Pause zwischen zwei Antwortteilen
const MAX_TOKENS = 2048; // Reasoning-Modelle zählen die Denkphase mit; 768 reichte dann oft nicht für die Antwort

// Codes für den Datenbankkontext: zuerst aus der aktuellen Frage, dann der gerade angezeigte Code,
// dann aus früheren Fragen (damit Rückfragen wie „Und was kostet das?“ beim Thema bleiben).
export function codesFor(messages, contextCode) {
  const fromText = (m) => (m.content.match(CODE_IN_TEXT) || []).map((c) => c.toUpperCase());
  const users = messages.filter((m) => m.role === 'user');
  const ordered = [...fromText(users.at(-1)), contextCode, ...users.slice(0, -1).reverse().flatMap(fromText)];
  return [...new Set(ordered.filter((c) => c && CODE.test(c)))].slice(0, MAX_CODES);
}

// Fakten aus der eigenen Datenbasis als zusätzliche Systemnachricht.
export function factsMessage({ entries, manufacturerName, unavailable }, codes, contextCode) {
  // Datenbasis nicht erreichbar: keine Antwort darf wirken, als sei sie durch die Projektdaten abgesichert (Abschnitt 5).
  if (unavailable) {
    return 'Die OBD2-Klartext-Datenbasis ist gerade nicht erreichbar. Sag zu Beginn kurz, dass diese Antwort nicht auf der Projektdatenbank beruht. '
      + `Gib die Bedeutung von Codes${codes.length ? ` (${codes.join(', ')})` : ''} nur unter Vorbehalt an und beschränke Aussagen zu Sicherheit und Weiterfahrt auf vorsichtige allgemeine Hinweise.`;
  }
  const lines = [];
  if (manufacturerName) lines.push(`Auf der Seite gewählter Hersteller: ${manufacturerName}.`);
  if (contextCode) lines.push(`Auf der Seite gerade angezeigter Code: ${contextCode}.`);
  for (const e of entries) {
    lines.push('', `${e.code} – ${e.title}${e.manufacturer ? ` (herstellerspezifisch, ${e.manufacturer})` : ' (Standardcode)'}`,
      `System: ${e.system}; Dringlichkeit: ${e.urgency}; typischer Einbauort: ${e.location}`,
      `Erklärung: ${e.explanation}`);
    if (e.causes.length) lines.push(`Mögliche Ursachen: ${e.causes.join('; ')}`);
    const driving = drivingAdvice(e);
    if (driving) lines.push(`Einschätzung der Seite zur Weiterfahrt: ${driving}`);
    if (e.source !== 'redaktionell') lines.push(`Originalbezeichnung: ${e.titleEn || e.title}. Automatisch übersetzter Eintrag, nicht redaktionell geprüft; Einstufung automatisch.`);
  }
  const missing = codes.filter((c) => !entries.some((e) => e.code === c));
  if (missing.length) lines.push('', `Nicht in der Datenbasis${manufacturerName ? ` (für ${manufacturerName})` : ''}: ${missing.join(', ')}. Sag das offen und gib keine sichere Bedeutung an; die Bedeutung kann herstellerabhängig sein.`);
  if (!lines.length) return null;
  return 'Daten aus der OBD2-Klartext-Datenbasis. Nutze für die Bedeutung eines Codes diese Angaben und ihre deutschen Bezeichnungen. Allgemeines Wissen darf sie erläutern, aber keine unbelegten fahrzeugspezifischen Tatsachen hinzufügen. '
    + 'Passen Datenbasis, geschilderte Symptome und dein Wissen nicht zusammen, sag das offen. Stelle automatisch übersetzte Einträge nicht als geprüft dar. '
    + 'Zur Weiterfahrt: Gib die Einschätzung der Seite wieder, ohne sie als Freigabe zu formulieren; geschilderte Warnzeichen und Fahrzeugwarnungen gehen immer vor.\n'
    + lines.join('\n');
}

// Liest die Antwort des Gateways: Server-Sent Events (stream) oder, falls das Gateway nicht streamt, ein JSON-Objekt.
// Liefert Antworttext als String und Denkphasen von Reasoning-Modellen als { thinking: true }.
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
      const delta = event.choices?.[0]?.delta;
      const text = delta?.content ?? event.choices?.[0]?.message?.content;
      if (typeof text === 'string' && text) yield text;
      else if (delta?.reasoning_content || delta?.reasoning) yield { thinking: true };
    }
  }
}

// Entfernt <think>…</think>-Blöcke, falls ein Modell seine Denkphase in den Antworttext schreibt;
// solche Abschnitte werden zu Lebenszeichen wie reasoning_content. Tags dürfen über Teilgrenzen reichen.
export async function* withoutThinkTags(parts) {
  const partialTag = (text, tag) => {
    for (let n = Math.min(tag.length - 1, text.length); n > 0; n--) if (tag.startsWith(text.slice(-n))) return n;
    return 0;
  };
  let inside = false, carry = '';
  for await (const part of parts) {
    if (typeof part !== 'string') { yield part; continue; }
    let text = carry + part;
    carry = '';
    for (;;) {
      const tag = inside ? '</think>' : '<think>';
      const at = text.indexOf(tag);
      const end = at >= 0 ? at : text.length - partialTag(text, tag);
      if (end > 0) yield inside ? { thinking: true } : text.slice(0, end);
      if (at < 0) { carry = text.slice(end); break; }
      inside = !inside;
      text = text.slice(at + tag.length);
    }
  }
  if (carry && !inside) yield carry;
}

export function createChatRouter({
  gatewayUrl = process.env.LM_GATEWAY_URL,
  gatewayKey = process.env.LM_GATEWAY_KEY,
  model = process.env.LM_MODEL || DEFAULT_MODEL,
  lookupCodes = async () => ({ entries: [], manufacturerName: null }),
  fetchImpl = globalThis.fetch,
  clock = Date.now,
} = {}) {
  const router = express.Router();
  let active = 0;
  let streaming = true; // false, sobald das Gateway Streaming abgelehnt hat
  let globalCalls = [];
  const visitors = new Map();
  // IP-Adressen nur so lange im Speicher halten, wie die Minuten-Begrenzung sie braucht.
  setInterval(() => {
    const now = clock();
    for (const [ip, calls] of visitors) if (calls.at(-1) <= now - 60000) visitors.delete(ip);
  }, 15000).unref();
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
      try { facts = await lookupCodes(codes, manufacturer); } catch (error) { console.error('Chat-Kontext nicht verfügbar:', error.message); facts = { entries: [], manufacturerName: null, unavailable: true }; }
      const context = factsMessage(facts, codes, contextCode);
      const request = (stream) => fetchImpl(`${gatewayUrl.replace(/\/$/, '')}/v1/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${gatewayKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          // Nur eine Systemnachricht: Mistral-/Devstral-Vorlagen lehnen eine zweite ab.
          messages: [{ role: 'system', content: context ? `${SYSTEM}\n\n${context}` : SYSTEM },
            ...messages.map(({ role, content }) => ({ role, content }))],
          max_tokens: MAX_TOKENS,
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
      send({ sources: facts.entries.map(({ code, title, manufacturer: maker }) => ({ code, title, manufacturer: maker })), ...(facts.unavailable && { dataUnavailable: true }) });
      let answered = false, thought = false, lastPing = 0;
      for await (const part of withoutThinkTags(answerParts(upstream))) {
        clearTimeout(timeout);
        timeout = setTimeout(() => controller.abort(), IDLE_MS);
        if (typeof part === 'string') {
          answered ||= Boolean(part.trim());
          send({ delta: part });
        } else if (clock() - lastPing > 5000) {
          // Denkphase: höchstens alle 5 s ein Lebenszeichen an den Browser, der Denktext selbst bleibt intern.
          thought = true; lastPing = clock();
          send({ thinking: true });
        }
      }
      if (!answered && thought) console.error('Chat-Gateway: Modell hat nur nachgedacht, keine Antwort (Token-Limit?).');
      send(answered ? { done: true } : { error: thought
        ? 'Die KI hat zu lange nachgedacht und keine Antwort geschrieben. Bitte stelle eine kürzere oder konkretere Frage.'
        : 'Die KI hat keine Antwort geliefert. Bitte versuche es noch einmal.' });
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
