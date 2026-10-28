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


test('Releasekennung entspricht dem gefilterten Docker-Laufzeitpaket', async()=>{
  const fs=await import('node:fs/promises');
  const path=await import('node:path');
  const os=await import('node:os');
  const {fileURLToPath}=await import('node:url');
  const source=fileURLToPath(new URL('../',import.meta.url));
  const target=await fs.mkdtemp(path.join(os.tmpdir(),'obd2-build-test-'));
  try {
    for(const name of ['server','dist','db','package.json','package-lock.json']){
      await fs.cp(path.join(source,name),path.join(target,name),{recursive:true,filter:p=>{
        const relative=path.relative(source,p).split(path.sep).join('/');
        return relative!=='db/source'&&!relative.endsWith('.md');
      }});
    }
    assert.deepEqual(releaseInfo(target),releaseInfo(source));
    const ignore=(await fs.readFile(new URL('../.dockerignore',import.meta.url),'utf8')).split(/\r?\n/).map(s=>s.trim());
    assert.ok(!ignore.includes('tools'),'tools muss im Docker-Buildkontext verfügbar sein');
    const dockerfile=await fs.readFile(new URL('../Dockerfile',import.meta.url),'utf8');
    assert.match(dockerfile,/COPY tools \.\/tools/);
  } finally {
    assert.equal(path.dirname(path.resolve(target)),path.resolve(os.tmpdir()));
    assert.ok(path.basename(target).startsWith('obd2-build-test-'));
    await fs.rm(target,{recursive:true,force:true});
  }
});
