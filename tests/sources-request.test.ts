import test from 'node:test';import assert from 'node:assert/strict';
import {sourceRequest,SourceApiError} from '../src/sources/api.ts';
test('source requests time out stalled response bodies and preserve actionable retry wording',async()=>{
 const saved=globalThis.fetch;
 globalThis.fetch=(async(_url,init)=>({ok:true,json:()=>new Promise((_resolve,reject)=>init?.signal?.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true}))})) as typeof fetch;
 try{await assert.rejects(()=>sourceRequest('catalog','12345678',{},20),/超时.*编辑内容仍保留.*确认是否已保存/);}finally{globalThis.fetch=saved;}
});
test('source requests retain revision conflict status and never silently retry',async()=>{
 const saved=globalThis.fetch;let calls=0;
 globalThis.fetch=(async()=>{calls++;return new Response(JSON.stringify({error:'另一窗口已更新'}),{status:409});}) as typeof fetch;
 try{await assert.rejects(()=>sourceRequest('records/test','12345678',{method:'PUT',body:'{}'}),e=>e instanceof SourceApiError&&e.status===409);assert.equal(calls,1);}finally{globalThis.fetch=saved;}
});
test('source requests report invalid response format without clearing editor or retrying',async()=>{
 const saved=globalThis.fetch;globalThis.fetch=(async()=>new Response('<html>offline</html>')) as typeof fetch;
 try{await assert.rejects(()=>sourceRequest('catalog','12345678'),/格式异常.*编辑内容仍保留/);}finally{globalThis.fetch=saved;}
});
