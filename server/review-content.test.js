import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { reviewCode, contentHash } from './review-content.js';

test('Migration, Fachfreigabe und Rücknahme bei Inhaltsänderungen', async () => {
  process.env.DATABASE_URL ||= 'postgres://unused:unused@127.0.0.1:1/unused';
  const { importData }=await import('./seed.js');
  const { pool }=await import('./db.js');
  const db=new PGlite();
  const transaction=fn=>db.transaction(tx=>fn(tx));
  try {
    const schema=await readFile(new URL('../db/schema.sql',import.meta.url),'utf8');
    await db.exec(schema);await db.exec(schema);
    const data={components:[{id:'engine',label:'Motor'}],codes:[{code:'P0300',title:'Fehlzündung',system:'Motor',urgency:'Rot',explanation:'Mögliche Fehlzündung',location:'Motor',source:'redaktionell',causes:['Zündung'],vehicle:{active:['engine'],context:[],labels:['Motor']}}]};
    assert.equal((await importData(data,{transaction})).inserted,1);
    const row=async()=> (await db.query('SELECT * FROM dtc_codes')).rows[0];
    assert.equal((await row()).review_status,'pending');
    const inspect=()=>transaction(tx=>reviewCode(tx,{code:'P0300'}));
    let snapshot=await inspect();assert.equal(snapshot.hash,contentHash(data.codes[0]));
    await assert.rejects(transaction(tx=>reviewCode(tx,{code:'P0300',approve:true,reviewer:'Prüfer',expectedHash:'veraltet'})),/prüfwert/i);
    const approve=async()=>{const {hash}=await inspect();return transaction(tx=>reviewCode(tx,{code:'P0300',approve:true,reviewer:'Test-Fachprüfer',expectedHash:hash}));};
    await approve();assert.equal((await row()).review_status,'approved');
    await db.exec(schema);assert.equal((await row()).review_status,'approved');
    assert.equal((await importData(data,{transaction})).updated,0);assert.equal((await row()).review_status,'approved');
    data.codes[0].explanation='Geänderte Erklärung';
    await importData(data,{transaction});assert.equal((await row()).review_status,'pending');
    await approve();await db.query("UPDATE dtc_causes SET cause='Neue Ursache'");assert.equal((await row()).review_status,'pending');
    await approve();await db.query("UPDATE dtc_components SET role='context'");assert.equal((await row()).review_status,'pending');
    await approve();await db.query("UPDATE dtc_codes SET source_removed_at=now()");assert.equal((await row()).review_status,'pending');
    const audit=(await db.query('SELECT action FROM content_reviews ORDER BY id')).rows;
    assert.equal(audit.filter(a=>a.action==='approved').length,4);
    assert.equal(audit.filter(a=>a.action==='invalidated').length,4);
    await assert.rejects(db.query("UPDATE dtc_codes SET review_status='approved',reviewed_hash=NULL"),/dtc_review_complete/);
  } finally {await db.close();await pool.end();}
});
