import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { addVersionRoute, releaseInfo } from './version.js';
import { verifyRelease } from '../tools/verify-release.js';

test('Releasekennung ist reproduzierbar und der Prüfaufruf erkennt falsche Stände', async()=>{
  const info=releaseInfo();assert.deepEqual(info,releaseInfo());assert.match(info.revision,/^[a-f0-9]{64}$/);
  const app=express();addVersionRoute(app,info);app.get('/api/health',(_q,r)=>r.json({ok:true}));
  app.use(express.static(new URL('../dist/',import.meta.url).pathname.replace(/^\/(.:)/,'$1')));
  const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  try {
    const url=`http://127.0.0.1:${server.address().port}/`;
    assert.deepEqual(await verifyRelease(url,{expected:info}),info);
    await assert.rejects(verifyRelease(url,{expected:{...info,revision:'falsch'}}),/Stand/);
    await assert.rejects(verifyRelease(url,{expected:info,fetchImpl:async(target,init)=>
      new URL(target).pathname==='/chat.js' ? new Response('abweichende Datei') : fetch(target,init)}),/abweichender Inhalt/);
  }finally {await new Promise(r=>server.close(r));}
});
