import test from 'node:test';import assert from 'node:assert/strict';import {createServer} from 'node:http';
import {createAiHandler} from '../server/ai.mjs';
const input={reference:{id:'reference-1',revision:2},records:[{id:'my-record',revision:4,date:'2026-10-05',text:'窗边读书时听见雨声。',tags:['PRIVATE_TAG']}],instruction:'先从声音写起',symbols:'少量 emoji',unselectedHistory:'PRIVATE_HISTORY'};
const source={id:'reference-1',revision:2,kind:'reference',title:'声音叙事',canonicalUrl:'https://example.com/note',author:{name:'作者'},summary:'从声音进入场景',analysis:'感觉、场景、反应',rights:{checkedAt:100}};
const valid={ideas:[{title:'雨声里的阅读',angle:'用自己的窗边观察打开场景',recordIds:['my-record']}],draft:{title:'在雨声里读一页',sections:[{heading:'窗边片刻',text:'窗边读书时，我听见雨声。',recordIds:['my-record']}]},questions:['那时读到了什么？']};
async function run(fn){let calls=0,sent,current=source,output=valid,finish='stop',onCall=()=>{};const handler=createAiHandler({deepseekKey:'test-secret',deepseekModel:'test-model'},'12345678',async(url,init)=>{calls++;sent=JSON.parse(init.body);onCall();return Response.json({choices:[{message:{content:JSON.stringify(output)},finish_reason:finish}]});},{getInspirationSource:async()=>current});const server=createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;const request=(body=input,headers={'X-Shiye-Code':'12345678'})=>fetch(base+'/api/inspiration',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});try{await fn({request,get calls(){return calls;},get sent(){return sent;},setSource:s=>current=s,setOutput:o=>output=o,setFinish:f=>finish=f,onCall:f=>onCall=f});}finally{await new Promise(r=>server.close(r));}}
test('inspiration route sends only selected text and approved structural notes, returning cited draft',()=>run(async c=>{
 assert.equal((await c.request(input,{})).status,401);assert.equal((await c.request({...input,records:[]})).status,400);assert.equal(c.calls,0);
 const response=await c.request();assert.equal(response.status,200);const result=await response.json();assert.deepEqual(result.proposal,valid);assert.equal(result.source.id,source.id);assert.equal(result.source.revision,2);assert.equal(result.model,'test-model');assert.deepEqual(result.records,[{id:'my-record',revision:4,date:'2026-10-05'}]);const body=JSON.stringify(c.sent);assert.ok(body.includes(input.records[0].text));assert.ok(body.includes(source.analysis));assert.ok(!body.includes('PRIVATE_'));assert.ok(!body.includes('test-secret'));assert.equal(c.calls,1);
}));
test('stale source and invalid selections never invoke the model',()=>run(async c=>{
 for(const records of [[...input.records,...input.records],[{...input.records[0],date:'2026-02-30'}],[{...input.records[0],text:'文'.repeat(8001)}],[{...input.records[0],revision:-1}]])assert.equal((await c.request({...input,records})).status,400);
 c.setSource(null);assert.equal((await c.request()).status,502);assert.equal(c.calls,0);c.setSource({...source,revision:3});assert.equal((await c.request()).status,502);assert.equal(c.calls,0);
}));
test('unknown citations, truncated output and revoked source during generation are rejected',()=>run(async c=>{
 c.setOutput({...valid,draft:{...valid.draft,sections:[{...valid.draft.sections[0],recordIds:['unselected-record']}]}});assert.equal((await c.request()).status,502);
 c.setOutput(valid);c.setFinish('length');assert.equal((await c.request()).status,502);c.setFinish('stop');c.onCall(()=>c.setSource(null));assert.equal((await c.request()).status,502);assert.equal(c.calls,3);
}));

test('a short personal record must not be padded into a long invented narrative',()=>run(async c=>{c.setOutput({...valid,draft:{...valid.draft,sections:[{...valid.draft.sections[0],text:'补写的细节。'.repeat(50)}]}});assert.equal((await c.request()).status,502);}));
