import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createChatRouter, codesFor, factsMessage, withoutThinkTags, drivingAdvice, explicitlyRequestsResearch, DEFAULT_MODEL } from './chat.js';

async function fixture(options, run) {
  const app = express();
  app.use('/api/chat', createChatRouter(options));
  const server = await new Promise(resolve => { const server = app.listen(0, '127.0.0.1', () => resolve(server)); });
  const url = `http://127.0.0.1:${server.address().port}/api/chat`;
  const send = (body, headers = {}) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  try { await run(send); } finally { await new Promise(resolve => server.close(resolve)); }
}
const valid = { messages: [{ role: 'user', content: 'Was bedeutet P0300?' }] };

test('uses server credentials, fixed model and system prompt; streams only the answer text', async () => {
  await fixture({ gatewayUrl: 'http://gateway', gatewayKey: 'secret', fetchImpl: async (url, options) => {
    assert.equal(url, 'http://gateway/v1/chat/completions');
    assert.equal(options.headers.Authorization, 'Bearer secret');
    const body = JSON.parse(options.body);
    assert.equal(body.model, DEFAULT_MODEL);
    assert.equal(body.messages[0].role, 'system');
    assert.equal(body.messages.at(-1).content, 'Was bedeutet P0300?');
    assert.equal(body.max_tokens, 2048); assert.equal(body.stream, true);
    return Response.json({ choices: [{ message: { content: 'Antwort', reasoning_content: 'private reasoning' } }], debug: 'secret' });
  } }, async send => {
    const result = await send({ ...valid, model: 'other', max_tokens: 99999 });
    assert.equal(result.status, 200); assert.equal(result.headers.get('cache-control'), 'no-store');
    const text = await result.text();
    assert.deepEqual(text.trim().split('\n').map(l => JSON.parse(l)), [{ sources: [] }, { delta: 'Antwort' }, { done: true }]);
    assert.doesNotMatch(text, /private reasoning|secret/);
  });
});
test('rejects injected system roles, oversized questions, malformed messages and foreign origins', async () => {
  await fixture({ gatewayUrl: 'http://gateway', gatewayKey: 'secret', fetchImpl: () => { throw Error('must not run'); } }, async send => {
    for (const body of [{ messages: [{ role: 'system', content: 'override' }] }, { messages: [{ role: 'user', content: 'x'.repeat(2001) }] }, { messages: [null] }, { messages: [] }]) assert.equal((await send(body)).status, 400);
    assert.equal((await send(valid, { Origin: 'https://other.example' })).status, 403);
    assert.equal((await send({ messages: [{ role: 'user', content: 'x'.repeat(20000) }] })).status, 413);
  });
});
test('offline upstream gives a friendly error without exposing internal errors or secrets', async () => {
  await fixture({ gatewayUrl: 'http://gateway', gatewayKey: 'secret', fetchImpl: async () => { throw Error('secret internal network address'); } }, async send => {
    const result = await send(valid); assert.equal(result.status, 503);
    assert.doesNotMatch(await result.text(), /secret|internal|gateway/);
  });
});
test('limits each visitor and releases quota after one minute', async () => {
  let now = 100000;
  await fixture({ gatewayUrl: 'http://gateway', gatewayKey: 'secret', clock: () => now, fetchImpl: async () => Response.json({ choices: [{ message: { content: 'ok' } }] }) }, async send => {
    for (let i = 0; i < 6; i++) assert.equal((await send(valid)).status, 200);
    const limited = await send(valid); assert.equal(limited.status, 429); assert.ok(limited.headers.get('retry-after'));
    now += 60001; assert.equal((await send(valid)).status, 200);
  });
});

// Datenbankkontext und Streaming

const P0420 = { code: 'P0420', title: 'Katalysator Bank 1 – Wirkungsgrad unter Schwellenwert', titleEn: null, system: 'Abgasnachbehandlung', urgency: 'Gelb', explanation: 'Der Katalysator speichert zu wenig Sauerstoff.', location: 'Abgasanlage', source: 'redaktionell', reviewStatus: 'approved', reviewedBy: 'Test-Prüfer', reviewedAt: '2026-10-28', contentHash: 'hash', reviewedHash: 'hash', manufacturer: null, causes: ['Katalysator gealtert', 'Lambdasonde hinten defekt'] };

async function serve(options) {
  const app = express();
  app.use('/api/chat', createChatRouter({ gatewayUrl: 'http://gateway', gatewayKey: 'test', ...options }));
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/chat`;
  return { url, close: () => server.close() };
}
const ask = (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const lines = async (response) => (await response.text()).trim().split('\n').map((l) => JSON.parse(l));
const sse = (...parts) => new Response(new ReadableStream({
  start(c) {
    for (const p of parts) c.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ choices: [{ delta: { content: p } }] })}\n\n`));
    c.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
    c.close();
  },
}), { headers: { 'content-type': 'text/event-stream' } });

test('codesFor: aktuelle Frage, dann angezeigter Code, dann frühere Fragen', () => {
  const messages = [{ role: 'user', content: 'Was ist p0300?' }, { role: 'assistant', content: 'P0301 …' }, { role: 'user', content: 'Und P0171 zusammen mit P0420?' }];
  assert.deepEqual(codesFor(messages, 'C0035'), ['P0171', 'P0420', 'C0035']);
  assert.deepEqual(codesFor([{ role: 'user', content: 'Und was kostet das?' }, { role: 'user', content: 'egal' }], null), []);
});

test('factsMessage nennt Datenbankeintrag, Hersteller und fehlende Codes', () => {
  const text = factsMessage({ entries: [P0420], manufacturerName: 'BMW' }, ['P0420', 'P1234'], 'P0420');
  assert.match(text, /Hersteller: BMW/);
  assert.match(text, /P0420 – Katalysator Bank 1/);
  assert.match(text, /Lambdasonde hinten defekt/);
  assert.match(text, /Nicht in der Datenbasis \(für BMW\): P1234/);
  assert.equal(factsMessage({ entries: [], manufacturerName: null }, [], null), null);
});

test('streamt die Antwort und gibt die Datenbankfakten an die KI', async () => {
  let sent, looked;
  const { url, close } = await serve({
    lookupCodes: async (codes, maker) => { looked = { codes, maker }; return { entries: [P0420], manufacturerName: 'BMW' }; },
    fetchImpl: async (_u, init) => { sent = JSON.parse(init.body); return sse('Der Kat', 'alysator …'); },
  });
  try {
    const res = await ask(url, { messages: [{ role: 'user', content: 'Was heißt das?' }], context: { code: 'P0420', manufacturer: 'bmw' } });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /ndjson/);
    const out = await lines(res);
    assert.deepEqual(out[0].sources, [{ code: 'P0420', title: P0420.title, manufacturer: null }]);
    assert.equal(out.filter((l) => l.delta).map((l) => l.delta).join(''), 'Der Katalysator …');
    assert.deepEqual(out.at(-1), { done: true });
    assert.deepEqual(looked, { codes: ['P0420'], maker: 'bmw' });
    assert.equal(sent.stream, true);
    // genau eine Systemnachricht, die Datenbankfakten hängen daran
    assert.equal(sent.messages.filter((m) => m.role === 'system').length, 1);
    assert.match(sent.messages[0].content, /Katalysator Bank 1/);
    assert.equal(sent.messages[1].role, 'user');
  } finally { close(); }
});

test('Rückfall: Gateway ohne Streaming liefert JSON', async () => {
  const { url, close } = await serve({ fetchImpl: async () => Response.json({ choices: [{ message: { content: 'Antwort am Stück' } }] }) });
  try {
    const out = await lines(await ask(url, { messages: [{ role: 'user', content: 'Hallo' }] }));
    assert.equal(out.find((l) => l.delta).delta, 'Antwort am Stück');
    assert.deepEqual(out.at(-1), { done: true });
  } finally { close(); }
});

test('Datenbankfehler blockiert den Chat nicht, ungültiger Kontext wird ignoriert', async () => {
  let looked;
  const { url, close } = await serve({
    lookupCodes: async (codes, maker) => { looked = { codes, maker }; throw new Error('db weg'); },
    fetchImpl: async (_url, init) => { looked.system = JSON.parse(init.body).messages[0].content; return sse('ok'); },
  });
  const original = console.error; console.error = () => {};
  try {
    const out = await lines(await ask(url, { messages: [{ role: 'user', content: 'Hallo' }], context: { code: '<b>', manufacturer: 'DROP TABLE' } }));
    assert.deepEqual({ codes: looked.codes, maker: looked.maker }, { codes: [], maker: null });
    assert.deepEqual(out.at(-1), { done: true });
    // Ausfall ist für Nutzende und KI erkennbar
    assert.deepEqual(out[0], { sources: [], dataUnavailable: true });
    assert.match(looked.system, /Datenbasis ist gerade nicht erreichbar/);
  } finally { console.error = original; close(); }
});

test('Fehler des Gateways und leere Antwort', async () => {
  const down = await serve({ fetchImpl: async () => new Response('', { status: 500 }) });
  try { assert.equal((await ask(down.url, { messages: [{ role: 'user', content: 'Hallo' }] })).status, 503); } finally { down.close(); }
  const empty = await serve({ fetchImpl: async () => sse() });
  try { assert.ok((await lines(await ask(empty.url, { messages: [{ role: 'user', content: 'Hallo' }] }))).at(-1).error); } finally { empty.close(); }
  const bad = await serve({ fetchImpl: async () => sse() });
  try { assert.equal((await ask(bad.url, { messages: [{ role: 'assistant', content: 'x' }] })).status, 400); } finally { bad.close(); }
});

test('lehnt das Gateway Streaming ab, folgt ein Versuch ohne Streaming', async () => {
  const modes = [];
  const { url, close } = await serve({ fetchImpl: async (_u, init) => {
    const { stream } = JSON.parse(init.body); modes.push(stream);
    return stream ? new Response('stream not supported', { status: 400 }) : Response.json({ choices: [{ message: { content: 'ohne Stream' } }] });
  } });
  const original = console.error; console.error = () => {};
  try {
    const out = await lines(await ask(url, { messages: [{ role: 'user', content: 'Hallo' }] }));
    assert.deepEqual(modes, [true, false]);
    assert.equal(out.find((l) => l.delta).delta, 'ohne Stream');
    // danach direkt ohne Streaming, kein abgelehnter Versuch mehr
    await lines(await ask(url, { messages: [{ role: 'user', content: 'Noch mal' }] }));
    assert.deepEqual(modes, [true, false, false]);
  } finally { console.error = original; close(); }
});

const sseRaw = (...deltas) => new Response(new ReadableStream({
  start(c) {
    for (const d of deltas) c.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ choices: [{ delta: d }] })}\n\n`));
    c.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
    c.close();
  },
}), { headers: { 'content-type': 'text/event-stream' } });

test('Reasoning-Modell: Denkphase als Lebenszeichen, Denktext bleibt intern', async () => {
  const { url, close } = await serve({ fetchImpl: async () => sseRaw({ reasoning_content: 'geheimes Nachdenken' }, { reasoning_content: 'weiter' }, { content: 'Antwort' }) });
  try {
    const response = await ask(url, { messages: [{ role: 'user', content: 'Frage' }] });
    const text = await response.text();
    assert.doesNotMatch(text, /geheimes Nachdenken/);
    assert.deepEqual(text.trim().split('\n').map((l) => JSON.parse(l)), [{ sources: [] }, { thinking: true }, { delta: 'Antwort' }, { done: true }]);
  } finally { close(); }
});

test('Reasoning-Modell ohne Antworttext meldet zu langes Nachdenken', async () => {
  const { url, close } = await serve({ fetchImpl: async () => sseRaw({ reasoning_content: 'denkt nur' }) });
  try {
    const result = await lines(await ask(url, { messages: [{ role: 'user', content: 'Frage' }] }));
    assert.match(result.at(-1).error, /zu lange nachgedacht/);
  } finally { close(); }
});

test('withoutThinkTags entfernt Denkblöcke auch über Teilgrenzen', async () => {
  const run = async (...parts) => { const out = []; for await (const p of withoutThinkTags(parts)) out.push(p); return out; };
  const text = (out) => out.filter((p) => typeof p === 'string').join('');
  assert.equal(text(await run('<thi', 'nk>geheim', ' weiter</th', 'ink>Antwort ', 'mit <b>')), 'Antwort mit <b>');
  assert.ok((await run('<think>x</think>A')).some((p) => p.thinking));
  assert.equal(text(await run('Ohne Denkblock, 3 < 4')), 'Ohne Denkblock, 3 < 4');
  assert.equal(text(await run('Ende mit <thi')), 'Ende mit <thi');
});

test('factsMessage gibt die Weiterfahrt-Empfehlung der Seite mit', () => {
  const text = factsMessage({ entries: [{ ...P0420, urgency: 'Rot' }], manufacturerName: null }, ['P0420'], 'P0420');
  assert.match(text, /Einschätzung der Seite zur Weiterfahrt: nur eingeschränkt/);
  assert.match(text, /ohne sie als Freigabe zu formulieren/);
});

test('Sicherheitsrelevante Systeme gehen der Dringlichkeitsfarbe vor', () => {
  assert.match(drivingAdvice({ ...P0420, system: 'ABS & Fahrstabilität', urgency: 'Grün' }), /^nur nach Prüfung \(Bremsen/);
  assert.match(drivingAdvice({ ...P0420, system: 'Motorschmierung', urgency: 'Gelb' }), /Öldruckwarnung sofort sicher anhalten/);
  assert.match(drivingAdvice({ ...P0420, system: 'Hybrid-/Elektroantrieb', urgency: 'Grün' }), /Hochvolt/);
  assert.match(drivingAdvice({ ...P0420, system: 'Tankentlüftung', urgency: 'Grün' }), /^meist möglich/);
});

test('Modell ist konfigurierbar', async () => {
  let model;
  const { url, close } = await serve({ model: 'test-modell', fetchImpl: async (_u, init) => { model = JSON.parse(init.body).model; return sse('ok'); } });
  try { await (await ask(url, valid)).text(); assert.equal(model, 'test-modell'); } finally { close(); }
});

test('Importierte Einträge: keine Einschätzung nach automatisch abgeleiteter Farbe', () => {
  assert.match(drivingAdvice({ system: 'Tankentlüftung', urgency: 'Grün', source: 'Wal33D/dtc-database (MIT)' }), /keine fachlich geprüfte Einschätzung/);
  assert.match(drivingAdvice({ system: 'ABS & Fahrstabilität', urgency: 'Grün', source: 'Wal33D/dtc-database (MIT)' }), /keine fachlich geprüfte Einschätzung/);
  const text = factsMessage({ entries: [{ ...P0420, reviewStatus: 'pending', source: 'Wal33D/dtc-database (MIT)', urgency: 'Rot' }], manufacturerName: null }, ['P0420'], 'P0420');
  assert.match(text, /Dringlichkeit: nicht fachlich freigegeben/);
  assert.doesNotMatch(text, /Dringlichkeit: Rot/);
});

test('Abschalter sperrt den Chat ohne Gateway-Aufruf', async () => {
  const { url, close } = await serve({ disabled: true, fetchImpl: () => { throw Error('must not run'); } });
  try {
    const res = await ask(url, valid);
    assert.equal(res.status, 503);
    assert.match((await res.json()).error, /vorübergehend abgeschaltet/);
  } finally { close(); }
});

test('Hängender Gateway-Aufruf wird auch ohne Abort-Unterstützung begrenzt', async () => {
  const app = await serve({ limits:{first:30,idle:20,total:100,lookup:10}, fetchImpl:()=>new Promise(()=>{}) });
  try { const res=await ask(app.url,valid); assert.equal(res.status,504); assert.match((await res.json()).error,/zu lange/); }
  finally { app.close(); }
});

test('Gesamtdauer bleibt begrenzt, obwohl regelmäßig Antwortteile kommen', async () => {
  let timer;
  const stream=new ReadableStream({start(c){timer=setInterval(()=>c.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"A"}}]}\n\n')),5);},cancel(){clearInterval(timer);}});
  const app=await serve({limits:{first:100,idle:100,total:70,lookup:20},fetchImpl:async()=>new Response(stream,{headers:{'content-type':'text/event-stream'}})});
  try {const out=await lines(await ask(app.url,valid));assert.ok(out.some(p=>p.delta));assert.match(out.at(-1).error,/zu lange/);}
  finally {clearInterval(timer);app.close();}
});

test('Denkphasen verlängern das Limit für den ersten Antworttext nicht', async () => {
  let timer;
  const stream=new ReadableStream({start(c){timer=setInterval(()=>c.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"reasoning_content":"intern"}}]}\n\n')),5);},cancel(){clearInterval(timer);}});
  const app=await serve({limits:{first:40,idle:100,total:200,lookup:20},fetchImpl:async()=>new Response(stream,{headers:{'content-type':'text/event-stream'}})});
  try {const out=await lines(await ask(app.url,valid));assert.match(out.at(-1).error,/zu lange/);assert.ok(!out.some(p=>p.delta));}
  finally {clearInterval(timer);app.close();}
});

test('Hängende Datenbankabfrage führt begrenzt zum erkennbaren Fallback', async () => {
  const app=await serve({limits:{first:200,idle:100,total:300,lookup:20},lookupCodes:()=>new Promise(()=>{}),fetchImpl:async()=>sse('Antwort')});
  try {const out=await lines(await ask(app.url,valid));assert.equal(out[0].dataUnavailable,true);assert.equal(out.at(-1).done,true);}
  finally {app.close();}
});

test('Fehlende oder veraltete Freigabe schaltet Empfehlungen aus', () => {
  assert.match(drivingAdvice({...P0420,reviewStatus:'pending'}),/keine fachlich geprüfte Einschätzung/);
  assert.match(drivingAdvice({...P0420,reviewedHash:'anderer-stand'}),/keine fachlich geprüfte Einschätzung/);
});

test('Modell entscheidet über Webrecherche und erhält das MCP-Ergebnis', async () => {
  const requests = [];
  let query;
  const toolCall = {
    id: 'research-1',
    type: 'function',
    function: { name: 'research_vehicle_web', arguments: JSON.stringify({ query: 'AGR Ventil aktuelle Informationen' }) },
  };
  const app = await serve({
    researchWeb: async value => {
      query = value;
      return { query: value, results: [{ title: 'AGR-Fachinformation', url: 'https://example.org/agr', domain: 'example.org', snippet: 'Das AGR-System führt Abgas zurück.' }] };
    },
    fetchImpl: async (_url, init) => {
      const body = JSON.parse(init.body); requests.push(body);
      return requests.length === 1
        ? Response.json({ choices: [{ finish_reason: 'tool_calls', message: { role: 'assistant', content: null, tool_calls: [toolCall] } }] })
        : sse('Antwort mit Recherche');
    },
  });
  try {
    const out = await lines(await ask(app.url, { messages: [{ role: 'user', content: 'Was macht ein AGR-Ventil und gibt es neue Erkenntnisse?' }] }));
    assert.equal(query, 'AGR Ventil aktuelle Informationen');
    assert.equal(requests[0].stream, false);
    assert.equal(requests[0].tool_choice, 'auto');
    assert.equal(requests[0].tools[0].function.name, 'research_vehicle_web');
    assert.equal(requests[1].messages.at(-2).role, 'assistant');
    assert.equal(requests[1].messages.at(-1).role, 'tool');
    assert.match(requests[1].messages.at(-1).content, /AGR-Fachinformation/);
    assert.deepEqual(out[0].webSources, [{ title: 'AGR-Fachinformation', url: 'https://example.org/agr', domain: 'example.org' }]);
    assert.equal(out.filter(part => part.delta).map(part => part.delta).join(''), 'Antwort mit Recherche');
    assert.deepEqual(out.at(-1), { done: true });
  } finally { app.close(); }
});

test('Modell kann ohne Webrecherche direkt antworten', async () => {
  let searched = false, request;
  const app = await serve({
    researchWeb: async () => { searched = true; return { results: [] }; },
    fetchImpl: async (_url, init) => {
      request = JSON.parse(init.body);
      return Response.json({ choices: [{ message: { content: 'Direkte Antwort' } }] });
    },
  });
  try {
    const out = await lines(await ask(app.url, { messages: [{ role: 'user', content: 'Hallo' }] }));
    assert.equal(searched, false);
    assert.equal(request.stream, false);
    assert.equal(out.find(part => part.delta).delta, 'Direkte Antwort');
  } finally { app.close(); }
});

test('ausdrückliche Bitte um aktuelle Quellen erzwingt den Rechercheaufruf', async () => {
  const requests = [];
  const toolCall = {
    id: 'forced-research',
    type: 'function',
    function: { name: 'research_vehicle_web', arguments: JSON.stringify({ query: 'HU Änderungen Deutschland 2026' }) },
  };
  const app = await serve({
    researchWeb: async query => ({ query, results: [{ title: 'Quelle', url: 'https://example.org/hu', domain: 'example.org', snippet: 'Aktuelle Information' }] }),
    fetchImpl: async (_url, init) => {
      const body = JSON.parse(init.body); requests.push(body);
      if (requests.length === 1) return Response.json({ choices: [{ message: { content: 'unbelegte Antwort' } }] });
      if (requests.length === 2) return Response.json({ choices: [{ message: { role: 'assistant', content: null, tool_calls: [toolCall] } }] });
      return sse('Belegte Antwort');
    },
  });
  try {
    const out = await lines(await ask(app.url, { messages: [{ role: 'user', content: 'Recherchiere aktuelle HU-Änderungen und nenne Quellen.' }] }));
    assert.equal(requests.length, 3);
    assert.equal(requests[0].tool_choice, 'auto');
    assert.deepEqual(requests[1].tool_choice, { type: 'function', function: { name: 'research_vehicle_web' } });
    assert.equal(out.filter(part => part.delta).map(part => part.delta).join(''), 'Belegte Antwort');
    assert.equal(out[0].webSources[0].domain, 'example.org');
  } finally { app.close(); }
});

test('erkennt ausdrücklichen Recherchebedarf konservativ', () => {
  assert.equal(explicitlyRequestsResearch('Recherchiere bitte aktuelle Änderungen und nenne Quellen.'), true);
  assert.equal(explicitlyRequestsResearch('Was bedeutet ein AGR-Ventil grundsätzlich?'), false);
  assert.equal(explicitlyRequestsResearch('Hallo'), false);
});
