import test from 'node:test';
import assert from 'node:assert/strict';
import {createModelCatalog} from './model-catalog.js';

test('shares concurrent inventory calls, caches briefly, refreshes and filters malformed records',async()=>{
  let now=0,calls=0;
  const catalog=createModelCatalog({gatewayUrl:'http://private/',gatewayKey:'secret',clock:()=>now,ttl:10,fetchImpl:async(url,options)=>{
    calls++;assert.equal(url,'http://private/v1/models');assert.equal(options.headers.Authorization,'Bearer secret');
    return Response.json({data:[{id:'a',name:'A'},{id:'a'},{id:''},{id:'bad\nmodel'},{id:'b',name:'<img src=x>'}]});
  }});
  const [a,b]=await Promise.all([catalog(),catalog()]);assert.deepEqual(a,b);assert.equal(calls,1);
  assert.deepEqual(a,[{id:'a',name:'A'},{id:'b',name:'<img src=x>'}]);
  await catalog();assert.equal(calls,1);now=11;await catalog();assert.equal(calls,2);
});

test('a failed inventory is not cached indefinitely',async()=>{
  let calls=0;
  const catalog=createModelCatalog({gatewayUrl:'http://private',gatewayKey:'secret',fetchImpl:async()=>++calls===1?new Response('',{status:502}):Response.json({data:[]})});
  await assert.rejects(catalog());assert.deepEqual(await catalog(),[]);assert.equal(calls,2);
});
