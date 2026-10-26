import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createChatRouter, codesFor, factsMessage } from './chat.js';

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
    assert.equal(body.model, 'devstral-small-2-24b-instruct-2512');
    assert.equal(body.messages[0].role, 'system');
    assert.equal(body.messages.at(-1).content, 'Was bedeutet P0300?');
    assert.equal(body.max_tokens, 768); assert.equal(body.stream, true);
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

const P0420 = { code: 'P0420', title: 'Katalysator Bank 1 – Wirkungsgrad unter Schwellenwert', titleEn: null, system: 'Abgasnachbehandlung', urgency: 'Gelb', explanation: 'Der Katalysator speichert zu wenig Sauerstoff.', location: 'Abgasanlage', source: 'redaktionell', manufacturer: null, causes: ['Katalysator gealtert', 'Lambdasonde hinten defekt'] };

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
    fetchImpl: async () => sse('ok'),
  });
  const original = console.error; console.error = () => {};
  try {
    const out = await lines(await ask(url, { messages: [{ role: 'user', content: 'Hallo' }], context: { code: '<b>', manufacturer: 'DROP TABLE' } }));
    assert.deepEqual(looked, { codes: [], maker: null });
    assert.deepEqual(out.at(-1), { done: true });
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
  } finally { console.error = original; close(); }
});
