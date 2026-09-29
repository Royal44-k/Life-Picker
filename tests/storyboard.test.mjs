import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {generateStoryboard,validateStoryboardInput} from '../server/storyboard.mjs';
import {createAiHandler} from '../server/ai.mjs';
const input={source:'我试了两次，第二次更顺利。',sourceHash:'abc',target:6,blocks:[{id:'a',text:'我试了两次，第二次更顺利。'}]};
const config={deepseekKey:'test-secret',deepseekModel:'deepseek-flash'};
const good={pages:[{role:'cover',source:'第二次尝试',sourceIds:['a'],diagram:'none'},{role:'body',source:'我试了两次，第二次更顺利。',sourceIds:['a'],diagram:'none'}]};
test('storyboard calls JSON mode with selected source and preserves its revision',async()=>{
 let sent;
 const result=await generateStoryboard(input,config,async(url,options)=>{sent=JSON.parse(options.body);assert.equal(url,'https://api.deepseek.com/chat/completions');return Response.json({choices:[{message:{content:JSON.stringify(good)},finish_reason:'stop'}]});});
 assert.equal(sent.response_format.type,'json_object');assert.equal(result.sourceHash,'abc');assert.equal(result.pages[1].source,'我试了两次，第二次更顺利。');
 assert.ok(!JSON.stringify(sent.messages).includes('test-secret'));
});
test('storyboard refuses invented references, invalid roles and truncated responses',async()=>{
 for(const page of [{...good.pages[0],sourceIds:['unknown']},{...good.pages[0],role:'script'}]){
  await assert.rejects(()=>generateStoryboard(input,config,async()=>Response.json({choices:[{message:{content:JSON.stringify({pages:[page]})},finish_reason:'stop'}]})),/页面|来源/);
 }
 await assert.rejects(()=>generateStoryboard(input,config,async()=>Response.json({choices:[{message:{content:'{}'},finish_reason:'length'}]})),/长度/);
 assert.throws(()=>validateStoryboardInput({...input,source:'文'.repeat(20001)}));
});
test('storyboard route requires pairing code and rejects cross-origin calls',async()=>{
 const server=createServer(createAiHandler(config,'12345678',async()=>Response.json({choices:[{message:{content:JSON.stringify(good)},finish_reason:'stop'}]})));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 try{
  const req=(headers={})=>fetch(base+'/api/storyboard',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(input)});
  assert.equal((await req()).status,401);
  assert.equal((await req({'X-Shiye-Code':'12345678',Origin:'https://elsewhere.example'})).status,403);
  const ok=await req({'X-Shiye-Code':'12345678'});assert.equal(ok.status,200);assert.equal((await ok.json()).pages.length,2);
 }finally{await new Promise(r=>server.close(r));}
});
