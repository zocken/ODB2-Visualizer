import http from 'node:http';
import {readFileSync,existsSync,writeFileSync} from 'node:fs';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {loadedLanguageModels,selectLoadedModel,modelSelection,FALLBACK_MODEL} from './loaded-model.mjs';
import {forwardEventStream} from './stream-response.mjs';
const root=fileURLToPath(new URL('.',import.meta.url));
const keyPath=root+'gateway-key.txt';
if(!existsSync(keyPath)) writeFileSync(keyPath,randomBytes(32).toString('hex'),{mode:0o600});
const key=readFileSync(keyPath,'utf8').trim();
if(key.length<32) throw Error('Gateway key too short');
let active=0, calls=[], fallbackLoad;
function send(res,status,data){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
const server=http.createServer(async(req,res)=>{
  const auth=Buffer.from(req.headers.authorization||'');const expected=Buffer.from('Bearer '+key);
  if(auth.length!==expected.length||!timingSafeEqual(auth,expected)) return send(res,401,{error:'Unauthorized'});
  if(req.method==='GET'&&req.url==='/health')return send(res,200,{status:'ok',streaming:true,modelSelection:'explicit-or-single-loaded',fallbackModel:FALLBACK_MODEL,upstreamTokenConfigured:!!readFileSync(root+'lm-token.txt','utf8').trim()});
  const models=req.method==='GET'&&req.url==='/v1/models';
  const chat=req.method==='POST'&&req.url==='/v1/chat/completions';
  if(!models&&!chat)return send(res,404,{error:'Endpoint not available'});
  const now=Date.now();calls=calls.filter(t=>t>now-60000);
  if(calls.length>=20||active>=2){res.setHeader('Retry-After','10');return send(res,429,{error:'Capacity exceeded'});}
  calls.push(now);active++;
  const abort=new AbortController();let timer;
  const armTimeout=ms=>{clearTimeout(timer);timer=setTimeout(()=>abort.abort(),ms);};
  armTimeout(180000);
  res.on('close',()=>{if(!res.writableEnded)abort.abort();});
  try{
    const token=readFileSync(root+'lm-token.txt','utf8').trim();
    if(!token)return send(res,503,{error:'LM Studio token not configured'});
    const inventoryResponse=await fetch('http://127.0.0.1:1234/api/v1/models',{headers:{Authorization:'Bearer '+token},signal:abort.signal});
    if(!inventoryResponse.ok)return send(res,502,{error:'LM Studio model inventory unavailable',upstreamStatus:inventoryResponse.status});
    const inventory=await inventoryResponse.json();
    if(models)return send(res,200,{object:'list',data:loadedLanguageModels(inventory).map(m=>({id:m.id,name:m.name,object:'model',owned_by:'local'}))});
    let body, streaming=false;
    if(chat){
      let chunks=[],size=0;
      for await(const chunk of req){size+=chunk.length;if(size>65536){send(res,413,{error:'Request too large'});return;}chunks.push(chunk);}
      let input;try{input=JSON.parse(Buffer.concat(chunks).toString());}catch{return send(res,400,{error:'Invalid JSON'});}
      if(!input||!Array.isArray(input.messages)||input.messages.length<1||input.messages.length>64)return send(res,400,{error:'Invalid messages'});
      if(input.stream!==undefined&&typeof input.stream!=='boolean')return send(res,400,{error:'stream must be a boolean'});
      if(input.model!==undefined&&(typeof input.model!=='string'||!input.model.trim()||input.model.length>200))return send(res,400,{error:'Invalid model identifier'});
      if(input.require_model_match!==undefined&&typeof input.require_model_match!=='boolean')return send(res,400,{error:'require_model_match must be a boolean'});
      streaming=input.stream===true;
      if(!input.messages.every(m=>m&&['system','user','assistant'].includes(m.role)&&typeof m.content==='string'))return send(res,400,{error:'Only text messages supported'});
      const max=input.max_tokens??512;
      if(!Number.isInteger(max)||max<1||max>2048)return send(res,400,{error:'max_tokens must be 1..2048'});
      // Explicit selections use loaded instances only; legacy single-model callers retain their behavior.
      let selection=modelSelection(inventory,input.model,input.require_model_match===true);
      if(selection.needsLoad){
        if(!fallbackLoad){
          fallbackLoad=(async()=>{
            const load=await fetch('http://127.0.0.1:1234/api/v1/models/load',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({model:FALLBACK_MODEL}),signal:AbortSignal.timeout(120000)});
            if(!load.ok)throw Error('Default model could not be loaded');
            await load.json();
          })().finally(()=>{fallbackLoad=undefined;});
        }
        await fallbackLoad;
        const refreshed=await fetch('http://127.0.0.1:1234/api/v1/models',{headers:{Authorization:'Bearer '+token},signal:abort.signal});
        if(!refreshed.ok)throw Error('Model inventory unavailable after loading');
        selection={id:selectLoadedModel(await refreshed.json(),input.model,input.require_model_match===true)};
      }
      body=JSON.stringify({model:selection.id,messages:input.messages,max_tokens:max,stream:streaming});
    }
    const upstream=await fetch('http://127.0.0.1:1234'+req.url,{method:req.method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body,signal:abort.signal});
    if(!upstream.ok)return send(res,502,{error:'LM Studio rejected request',upstreamStatus:upstream.status});
    if(streaming&&(upstream.headers.get('content-type')||'').includes('text/event-stream')){
      await forwardEventStream(upstream,res,{signal:abort.signal,onChunk:()=>armTimeout(60000)});
      return;
    }
    const result=await upstream.json();
    send(res,200,result);
  }catch(error){if(!res.headersSent&&!res.destroyed)send(res,error.status||502,{error:error.status?error.message:'LM Studio unavailable or timeout',...(error.code&&error.status?{code:error.code}:{})});else if(!res.writableEnded&&!res.destroyed)res.destroy();}
  finally{clearTimeout(timer);active--;}
});
server.requestTimeout=20000;server.headersTimeout=10000;
server.listen(8787,'127.0.0.1',()=>console.log('Gateway listening on 127.0.0.1:8787'));
