import test from 'node:test';import assert from 'node:assert/strict';import {createServer} from 'node:http';
import {validatePageInput,generatePageCopy} from '../server/page-ai.mjs';import {createAiHandler} from '../server/ai.mjs';
const data={source:'## 第一次尝试\n\n我自己试了 2 次。',revision:'page-version-1',task:'polish',instruction:'保留我的语气',symbols:'少量 emoji',context:[{id:'part-a',text:'是在周二完成的。'}]};
const config={deepseekKey:'test-secret',deepseekModel:'test-model'};
test('single-page AI sends only the current page and explicitly chosen context',async()=>{
 let sent;const controller=new AbortController();
 const result=await generatePageCopy({...data,history:'PRIVATE_DO_NOT_SEND'},config,async(url,opt)=>{sent=JSON.parse(opt.body);assert.equal(opt.signal,controller.signal);assert.equal(url,'https://api.deepseek.com/chat/completions');return Response.json({choices:[{message:{content:'## 我的尝试\n\n我在周二试了 2 次。'},finish_reason:'stop'}]});},controller.signal);
 assert.equal(result.revision,data.revision);assert.equal(result.text,'## 我的尝试\n\n我在周二试了 2 次。');assert.ok(!JSON.stringify(sent).includes('PRIVATE_DO_NOT_SEND'));assert.ok(!JSON.stringify(sent.messages).includes('test-secret'));assert.ok(JSON.stringify(sent).includes('是在周二完成的。'));
 assert.throws(()=>validatePageInput({...data,context:[{id:'x',text:'文'.repeat(8001)}]}),/上下文/);
 assert.throws(()=>validatePageInput({...data,task:'execute'}));
});
test('single-page AI rejects empty, truncated and overlarge results without applying',async()=>{
 for(const [content,finish] of [['','stop'],['部分结果','length'],['文'.repeat(8001),'stop']])await assert.rejects(()=>generatePageCopy(data,config,async()=>Response.json({choices:[{message:{content},finish_reason:finish}]})));
});
test('single-page route shares authentication and rejects unwanted origins and invalid input',async()=>{
 let calls=0;const server=createServer(createAiHandler(config,'12345678',async()=>{calls++;return Response.json({choices:[{message:{content:'修改建议'},finish_reason:'stop'}]});}));await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 try{
  const request=(headers={},body=data)=>fetch(base+'/api/page-ai',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
  assert.equal((await request()).status,401);assert.equal((await request({'X-Shiye-Code':'12345678',Origin:'https://other.invalid'})).status,403);
  assert.equal((await request({'X-Shiye-Code':'12345678'},{...data,source:''})).status,400);
  const ok=await request({'X-Shiye-Code':'12345678'});assert.equal(ok.status,200);assert.equal((await ok.json()).revision,data.revision);assert.equal(calls,1);
 }finally{await new Promise(r=>server.close(r));}
});
