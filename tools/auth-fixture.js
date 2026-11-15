import express from 'express';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createAuth, mountAuthProtection } from '../server/auth.js';
import { addVersionRoute } from '../server/version.js';
import { randomBytes } from 'node:crypto';

export async function authFixture({ secure = false } = {}) {
  const db = new PGlite();
  const schema = await readFile(new URL('../db/auth-schema.sql', import.meta.url), 'utf8');
  await db.exec(schema); await db.exec(schema);
  const mails = [];
  const mailer = { ready: true, fail: false, async send(mail) { if(this.fail)throw new Error('Synthetic SMTP failure');mails.push(mail); } };
  const config = { origin: 'http://127.0.0.1', secure, adminEmails: ['admin@example.test'],mfaKey:randomBytes(32) };
  const auth=createAuth({pool:db,transaction:fn=>db.transaction(fn),mailer,config});
  const app=express();
  addVersionRoute(app);
  app.get('/api/health', (_q,r)=>r.json({ok:true,genericCodes:1}));
  mountAuthProtection(app,auth);
  app.get('/api/codes', (_q,r)=>r.json([]));
  app.get('/api/stats', (_q,r)=>r.json({}));
  app.get('/api/manufacturers', (_q,r)=>r.json([]));
  app.get('/api/chat/models', (_q,r)=>r.json({models:[],defaultModel:null}));
  app.post('/api/events', (_q,r)=>r.status(204).end());
  app.use(express.static(fileURLToPath(new URL('../dist',import.meta.url)),{extensions:['html']}));
  app.use((error,_q,r,_next)=>r.status(error.status||500).json({error:error.publicMessage||error.message}));
  const server=app.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;config.origin=base;
  const request = (route,{body,cookie,method=body?'POST':'GET',origin=base,...options}={})=>fetch(`${base}${route}`,{
    method,redirect:'manual',headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{cookie}:{}),...(origin?{Origin:origin}:{})},
    ...(body?{body:JSON.stringify(body)}:{}),...options,
  });
  return {db,auth,mails,mailer,config,base,request,async close(){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await db.close();}};
}
