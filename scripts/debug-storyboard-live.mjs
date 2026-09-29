import {readFile,writeFile} from 'node:fs/promises';
import {generateStoryboard} from '../server/storyboard.mjs';
process.loadEnvFile('.env');
const blocks=[{id:'a',text:'## 记录具体细节\n分享经历时先写下实际做过的事情，不编造数据。'},{id:'b',text:'## 保留自己的表达\n选择一句自己说过的话，再补充解释。'},{id:'c',text:'## 发布前检查\n逐页检查文字是否完整，图片是否清楚。'}];
const input={source:'# 把经历写清楚\n\n'+blocks.map(b=>b.text).join('\n\n'),sourceHash:'live-debug',target:6,blocks};
let wire;
try{
 const result=await generateStoryboard(input,{deepseekKey:process.env.DEEPSEEK_API_KEY,deepseekModel:process.env.DEEPSEEK_MODEL||'deepseek-flash'},async(...args)=>{const r=await fetch(...args);wire=await r.clone().json();return r;},AbortSignal.timeout(80000));
 await writeFile('artifacts/live-storyboard-debug.json',JSON.stringify({input,result,provider:wire},null,2));
 console.log(JSON.stringify({ok:true,pages:result.pages.length,model:result.model}));
}catch(e){await writeFile('artifacts/live-storyboard-debug.json',JSON.stringify({input,provider:wire,error:e.message},null,2));console.log(JSON.stringify({error:e.message,returned:wire?.choices?.[0]?.message?.content}));process.exitCode=1;}
