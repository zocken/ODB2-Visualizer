import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {forwardEventStream} from './stream-response.mjs';

test('forwards the first SSE frame before completion and preserves all bytes', async () => {
  let release;
  const gate = new Promise(resolve => {release = resolve;});
  const first = 'data: {"choices":[{"delta":{"content":"Grüße"}}]}\n\n';
  const last = 'data: [DONE]\n\n';
  const encoder = new TextEncoder();
  const body = new ReadableStream({async start(controller) {
    const bytes=encoder.encode(first);const split=bytes.indexOf(0xc3)+1;
    controller.enqueue(bytes.slice(0,split));controller.enqueue(bytes.slice(split));
    await gate;controller.enqueue(encoder.encode(last));controller.close();
  }});
  let activities=0;
  const server=http.createServer((_req,res)=>forwardEventStream(new Response(body),res,{onChunk:()=>activities++}).catch(()=>res.destroy()));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    const response=await fetch(`http://127.0.0.1:${server.address().port}`);
    assert.match(response.headers.get('content-type'),/text\/event-stream/);
    assert.equal(response.headers.get('x-accel-buffering'),'no');
    const reader=response.body.getReader();const decoder=new TextDecoder();let received='';
    while(!received.includes('\n\n')){const part=await reader.read();assert.equal(part.done,false);received+=decoder.decode(part.value,{stream:true});}
    assert.equal(received,first); // The source is still blocked; JSON buffering would hang here.
    release();
    for(;;){const part=await reader.read();received+=decoder.decode(part.value||new Uint8Array(),{stream:!part.done});if(part.done)break;}
    assert.equal(received,first+last);assert.ok(activities>=2);
  } finally {release();await new Promise(resolve=>server.close(resolve));}
});

test('cancels the upstream reader when the client disconnects', async () => {
  let cancelled;const sourceCancelled=new Promise(resolve=>{cancelled=resolve;});
  const body=new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('data: first\n\n'));},cancel(){cancelled();}});
  const server=http.createServer((_req,res)=>forwardEventStream(new Response(body),res).catch(()=>{}));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    const response=await fetch(`http://127.0.0.1:${server.address().port}`);
    const reader=response.body.getReader();await reader.read();await reader.cancel();
    await Promise.race([sourceCancelled,new Promise((_resolve,reject)=>setTimeout(()=>reject(Error('Source not cancelled')),2000).unref())]);
  } finally {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
