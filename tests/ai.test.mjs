import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { buildMessages, generateCopy, createAiHandler } from '../server/ai.mjs';
const input={provider:'deepseek',mode:'polish',source:'我的早晨 ✨ (｡･ω･｡)',topic:'保留颜文字',tone:'真诚自然',length:300,symbols:'适量 emoji 和颜文字'};
const config={deepseekKey:'test-only-secret',deepseekModel:'deepseek-flash',ollamaModel:'local-test'};
test('AI prompt retains original and chosen symbols, never includes credentials',()=>{
  const messages=buildMessages(input);assert.ok(messages[1].content.includes(input.source));assert.ok(messages[1].content.includes(input.symbols));assert.ok(!JSON.stringify(messages).includes(config.deepseekKey));
});
test('DeepSeek request uses fixed official endpoint and returns actual provider result',async()=>{
  const result=await generateCopy(input,config,async(url,options)=>{assert.equal(url,'https://api.deepseek.com/chat/completions');assert.equal(options.headers.Authorization,`Bearer ${config.deepseekKey}`);assert.equal(JSON.parse(options.body).model,'deepseek-flash');return Response.json({choices:[{message:{content:'# 测试文案 ✨'},finish_reason:'stop'}]});});assert.equal(result.text,'# 测试文案 ✨');
});
test('Ollama stays on localhost and sends no cloud credential',async()=>{
  await generateCopy({...input,provider:'ollama'},config,async(url,options)=>{assert.equal(url,'http://127.0.0.1:11434/api/chat');assert.equal(options.headers.Authorization,undefined);return Response.json({message:{content:'本地生成'},done:true});});
});
test('missing key, malformed input, empty output, truncation and provider errors are explicit',async()=>{
  await assert.rejects(()=>generateCopy(input,{...config,deepseekKey:''}),/尚未配置/);
  assert.throws(()=>buildMessages({...input,source:''}),/原文/);
  await assert.rejects(()=>generateCopy(input,config,async()=>Response.json({choices:[{message:{content:''}}]})),/没有返回/);
  await assert.rejects(()=>generateCopy(input,config,async()=>Response.json({choices:[{message:{content:'半句'},finish_reason:'length'}]})),/长度上限/);
  await assert.rejects(()=>generateCopy(input,config,async()=>new Response('secret provider info',{status:401})),/Key 无效/);
});
test('HTTP API requires pairing, validates origins and keeps keys out of status',async()=>{
  const server=createServer(createAiHandler(config,'12345678',async()=>Response.json({choices:[{message:{content:'生成成功'}}]})));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  try{
    const status=await(await fetch(base+'/api/status')).text();assert.ok(!status.includes(config.deepseekKey));
    const denied=await fetch(base+'/api/ai',{method:'POST'});assert.equal(denied.status,401);
    const malformed=await fetch(base+'/api/ai',{method:'POST',headers:{'X-Shiye-Code':'éééééééé'}});assert.equal(malformed.status,401);
    const foreign=await fetch(base+'/api/ai',{method:'POST',headers:{Origin:'https://evil.example','X-Shiye-Code':'12345678'}});assert.equal(foreign.status,403);
    const good=await fetch(base+'/api/ai',{method:'POST',headers:{'Content-Type':'application/json','X-Shiye-Code':'12345678'},body:JSON.stringify(input)});assert.equal(good.status,200);assert.equal((await good.json()).text,'生成成功');
  }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
