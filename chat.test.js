import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createChatRouter } from './chat.js';

async function fixture(options, run) {
  const app = express();
  app.use('/api/chat', createChatRouter(options));
  const server = await new Promise(resolve => { const server = app.listen(0, '127.0.0.1', () => resolve(server)); });
  const url = `http://127.0.0.1:${server.address().port}/api/chat`;
  const send = (body, headers = {}) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  try { await run(send); } finally { await new Promise(resolve => server.close(resolve)); }
}
const valid = { messages: [{ role: 'user', content: 'Was bedeutet P0300?' }] };

test('uses server credentials, fixed model and system prompt; returns only answer', async () => {
  await fixture({ gatewayUrl: 'http://gateway', gatewayKey: 'secret', fetchImpl: async (url, options) => {
    assert.equal(url, 'http://gateway/v1/chat/completions');
    assert.equal(options.headers.Authorization, 'Bearer secret');
    const body = JSON.parse(options.body);
    assert.equal(body.model, 'devstral-small-2-24b-instruct-2512');
    assert.equal(body.messages[0].role, 'system');
    assert.equal(body.messages[1].content, 'Was bedeutet P0300?');
    assert.equal(body.max_tokens, 768); assert.equal(body.stream, false);
    return Response.json({ choices: [{ message: { content: 'Antwort', reasoning_content: 'private reasoning' } }], debug: 'secret' });
  } }, async send => {
    const result = await send({ ...valid, model: 'other', max_tokens: 99999 });
    assert.equal(result.status, 200); assert.equal(result.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await result.json(), { answer: 'Antwort' });
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
