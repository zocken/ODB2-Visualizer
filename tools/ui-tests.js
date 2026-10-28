import assert from 'node:assert/strict';
import express from 'express';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

const app = express();
let mode = 'pending';
let approved = false;
const sockets = new Set();
app.get('/api/health', (_q,r) => r.json({ ok:true, genericCodes:1 }));
app.get('/api/manufacturers', (_q,r) => r.json([]));
app.get('/api/codes', (_q,r) => r.json([]));
app.get('/api/codes/P0300', (_q,r) => r.json({ code:'P0300', title:'Fehlzündung',system:'Motor',urgency:'Grün',source:'redaktionell',explanation:'Testeintrag',causes:[],location:'Motor', reviewStatus:approved?'approved':'pending',reviewedBy:'Test-Prüfer',reviewedAt:'2026-10-28',contentHash:'test-hash',reviewedHash:'test-hash' }));
app.post('/api/events', (_q,r) => r.sendStatus(204));
app.post('/api/chat', (_q,r) => {
  r.set('Content-Type','application/x-ndjson');
  if (mode === 'failure') return r.status(503).end(JSON.stringify({error:'Testausfall'}));
  if (mode === 'pending') { r.flushHeaders(); return; }
  r.write(JSON.stringify({ sources:[],dataUnavailable:true })+'\n');
  const timer=setTimeout(() => {
    if (mode === 'unavailable-error') { r.end(JSON.stringify({error:'Die Antwort dauert zu lange.'})+'\n'); return; }
    r.write(JSON.stringify({delta:'Testantwort ohne Projektdaten.'})+'\n');
    r.end(JSON.stringify({done:true})+'\n');
  },300);
  r.on('close',()=>clearTimeout(timer));
});
app.use(express.static(fileURLToPath(new URL('../dist',import.meta.url))));
const server=app.listen(0,'127.0.0.1');
server.on('connection', socket=>{sockets.add(socket);socket.on('close',()=>sockets.delete(socket));});
await new Promise(resolve=>server.once('listening',resolve));
let browser;
try {
  browser=await chromium.launch({ headless:true, ...(process.env.BROWSER_CHANNEL ? {channel:process.env.BROWSER_CHANNEL} : {}) });
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const url=`http://127.0.0.1:${server.address().port}`;
  const wait=async fn=>page.waitForFunction(fn,null,{timeout:5000});
  const fresh=async()=>{await page.goto(url);await page.waitForFunction(()=>document.querySelector('#ai-chat-log')?.textContent.includes('Hallo!'));};
  const submit=async text=>{await page.locator('#ai-chat-input').fill(text);await page.locator('#ai-chat-send').click();};
  await fresh();
  await submit('Ich kann nicht mehr bremsen.');
  await wait(()=>document.querySelector('.ai-chat-safety')?.textContent.includes('nicht weiterfahren'));
  assert.equal(await page.locator('.ai-chat-message--assistant:not(.is-pending)').count(),1);
  await page.locator('#ai-chat-send').click();
  await wait(()=>document.querySelector('#ai-chat-status')?.textContent==='Abgebrochen');
  assert.equal(await page.locator('.ai-chat-safety').count(),1);
  console.log('PASS: Sofortwarnung ohne Modellantwort bleibt bei Abbruch sichtbar.');
  mode='failure';await fresh();await submit('Das Bremspedal sinkt bis zum Boden.');
  await wait(()=>!document.querySelector('#ai-chat-error').hidden);
  assert.equal(await page.locator('.ai-chat-safety').count(),1);
  console.log('PASS: Bremswarnung bleibt bei Serverausfall sichtbar.');
  mode='unavailable';await fresh();
  await page.evaluate(()=>{
    window.observed=[];
    new MutationObserver(()=>{
      const text=document.querySelector('.ai-chat-message--assistant:last-child p')?.textContent||'';
      if(text.includes('Testantwort'))window.observed.push(Boolean(document.querySelector('.ai-chat-notice-line')));
    }).observe(document.querySelector('#ai-chat-log'),{childList:true,subtree:true,characterData:true});
  });
  await submit('Was bedeutet P0300?');
  await wait(()=>document.querySelector('.ai-chat-notice-line')?.textContent.includes('nicht erreichbar'));
  assert.equal(await page.locator('.ai-chat-message--assistant:last-child p').textContent().then(t=>t.includes('Testantwort')),false);
  await wait(()=>document.querySelector('#ai-chat-status').textContent==='Antwort erhalten');
  assert.deepEqual(await page.evaluate(()=>window.observed.every(Boolean)),true);
  assert.equal(await page.locator('.ai-chat-notice-line').count(),1);
  console.log('PASS: Datenbankwarnung erscheint vor Antworttext und bleibt erhalten.');
  mode='unavailable-error';await fresh();await submit('Was bedeutet P0300?');
  await wait(()=>document.querySelector('#ai-chat-status').textContent==='Bitte erneut versuchen');
  assert.equal(await page.locator('.ai-chat-notice-line').count(),1);
  assert.match(await page.locator('.ai-chat-message--assistant:last-child').textContent(),/Keine Antwort erhalten/);
  console.log('PASS: Datenbankwarnung bleibt bei Antwortfehler erhalten.');
  await page.locator('#code-input').fill('P0300');await page.locator('#code-form button[type=submit]').click();
  await wait(()=>!document.querySelector('#result').hidden);
  assert.match(await page.locator('#r-verdict').textContent(),/Nicht geprüft/);
  assert.match(await page.locator('#r-urgency').textContent(),/nicht geprüft/);
  assert.doesNotMatch(await page.locator('#r-advice').textContent(),/meist möglich/);
  assert.deepEqual(errors,[]);
  console.log('PASS: Redaktionelle Quelle ohne Fachfreigabe bleibt eingeschränkt.');
  approved=true;await fresh();
  await page.locator('#code-input').fill('P0300');await page.locator('#code-form button[type=submit]').click();
  await wait(()=>!document.querySelector('#result').hidden);
  assert.match(await page.locator('#r-stand').textContent(),/Fachlich freigegeben/);
  assert.match(await page.locator('#r-verdict').textContent(),/Meist möglich/);
  console.log('PASS: Explizite Freigabe des passenden Inhaltsstands wird übernommen.');
} finally {
  await browser?.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(resolve));
}
