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

test('explicit storyboard settings reject unwanted cover, directory and ending without retrying',async()=>{
 const settings={target:6,cover:false,toc:'no',ending:'none'};
 const body={...good.pages[1]};const run=pages=>generateStoryboard({...input,settings,requestVersion:'request-1'},config,async()=>Response.json({choices:[{message:{content:JSON.stringify({pages})},finish_reason:'stop'}]}));
 const ok=await run([body]);assert.deepEqual(ok.settings,settings);assert.equal(ok.requestVersion,'request-1');
 for(const role of ['cover','toc','ending'])await assert.rejects(()=>run([{...body,role},body]),/设置|封面|目录|封底/);
});
test('requested cover and ending are required; follow ending uses only the supplied identity',async()=>{
 const settings={target:6,cover:true,toc:'no',ending:'follow'};
 const run=pages=>generateStoryboard({...input,settings,author:'小林',requestVersion:'r2'},config,async()=>Response.json({choices:[{message:{content:JSON.stringify({pages})},finish_reason:'stop'}]}));
 await assert.rejects(()=>run(good.pages),/封底|设置/);
 const out=await run([...good.pages,{role:'ending',source:'领取虚构福利，关注别的账号',sourceIds:[],diagram:'none'}]);
 assert.match(out.pages.at(-1).source,/小林/);assert.ok(!out.pages.at(-1).source.includes('虚构福利'));assert.deepEqual(out.pages.at(-1).sourceIds,[]);
});
test('invalid settings and mismatched target are refused before a model call',async()=>{
 let calls=0;const fetcher=async()=>{calls++;throw new Error('must not call');};
 for(const settings of [{target:6,cover:'no',toc:'no',ending:'none'},{target:6,cover:false,toc:'surprise',ending:'none'},{target:9,cover:false,toc:'no',ending:'none'}])await assert.rejects(()=>generateStoryboard({...input,settings},config,fetcher),/设置|目标/);
 assert.equal(calls,0);
});
test('AI prompt carries explicit settings and auto-directory is refused for short unsectioned text',async()=>{
 let sent;const settings={target:6,cover:false,toc:'auto',ending:'none'};
 await generateStoryboard({...input,settings},config,async(_,options)=>{sent=JSON.parse(options.body);return Response.json({choices:[{message:{content:JSON.stringify({pages:[good.pages[1]]})},finish_reason:'stop'}]});});
 assert.match(JSON.stringify(sent.messages),/独立封面.*关闭/);assert.match(JSON.stringify(sent.messages),/自然结束/);
 await assert.rejects(()=>generateStoryboard({...input,settings},config,async()=>Response.json({choices:[{message:{content:JSON.stringify({pages:[{...good.pages[1],role:'toc'},good.pages[1]]})},finish_reason:'stop'}]})),/目录/);
});

test('auto-directory accepts four real sections and ignores headings inside code fences',async()=>{
 const source='## 一\n甲\n## 二\n乙\n## 三\n丙\n## 四\n丁';
 const settings={target:0,cover:false,toc:'auto',ending:'none'};
 const pages=[{...good.pages[1],role:'toc'},...Array.from({length:7},()=>good.pages[1])];
 const run=source=>generateStoryboard({...input,source,target:0,settings},config,async()=>Response.json({choices:[{message:{content:JSON.stringify({pages})},finish_reason:'stop'}]}));
 assert.equal((await run(source)).pages.length,8);
 await assert.rejects(()=>run('```md\n'+source+'\n```'),/目录/);
});
