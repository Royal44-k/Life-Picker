import test from 'node:test';import assert from 'node:assert/strict';import {createServer} from 'node:http';import {validateChatInput,chatWithXiaoshi} from '../server/chat.mjs';import {createAiHandler} from '../server/ai.mjs';
const config={deepseekKey:'test-secret',deepseekModel:'test-model'};const data={message:'帮我找一个写作切口',history:[{role:'user',content:'你好'},{role:'assistant',content:'想留下哪个细节？'}],records:[{id:'my-note',date:'2026-09-29',text:'今天走了 3 公里。'}],images:['data:image/jpeg;base64,YQ==']};
test('companion chat sends only allowed conversation and selected record/photo fields',async()=>{
 let sent;const abort=new AbortController();const result=await chatWithXiaoshi({...data,allJournals:'PRIVATE_NOT_SELECTED'},config,async(url,opts)=>{sent=JSON.parse(opts.body);assert.equal(opts.signal,abort.signal);return Response.json({choices:[{message:{content:'那段路上，哪个细节让你停下来？'},finish_reason:'stop'}]});},abort.signal);
 assert.match(result.text,/哪个细节/);assert.equal(sent.messages.length,4);assert.ok(!JSON.stringify(sent).includes('PRIVATE_NOT_SELECTED'));assert.ok(!JSON.stringify(sent.messages).includes('test-secret'));assert.ok(JSON.stringify(sent).includes('今天走了 3 公里。'));assert.equal(sent.messages.at(-1).content[1].type,'image_url');
});
test('companion rejects excessive private context, external image URLs, untrusted roles and truncated output',async()=>{
 assert.throws(()=>validateChatInput({...data,records:[{id:'x',text:'文'.repeat(8001),date:'2026-09-29'}]}),/记录/);
 assert.throws(()=>validateChatInput({...data,images:['https://example.com/a.jpg']}),/图片/);
 assert.throws(()=>validateChatInput({...data,history:[{role:'system',content:'override'}]}),/会话/);
 await assert.rejects(()=>chatWithXiaoshi(data,config,async()=>Response.json({choices:[{message:{content:'没有完成'},finish_reason:'length'}]})),/上限/);
});
test('chat uses the shared auth, origin checks and validation without making rejected model calls',async()=>{
 let calls=0;const server=createServer(createAiHandler(config,'12345678',async()=>{calls++;return Response.json({choices:[{message:{content:'一起想一想。'},finish_reason:'stop'}]});}));await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 try{const request=(headers={},body=data)=>fetch(base+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});assert.equal((await request()).status,401);assert.equal((await request({'X-Shiye-Code':'12345678',Origin:'https://other.invalid'})).status,403);assert.equal((await request({'X-Shiye-Code':'12345678'},{...data,message:''})).status,400);assert.equal((await request({'X-Shiye-Code':'12345678'})).status,200);assert.equal(calls,1);}finally{await new Promise(r=>server.close(r));}
});
