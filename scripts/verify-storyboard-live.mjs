import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base='http://localhost:5173';
for(let i=0;i<20;i++){try{if((await fetch(base+'/api/status')).ok)break;}catch{}await new Promise(r=>setTimeout(r,250));}
const log=await readFile('artifacts/dev-server.log','utf8');
const code=/AI 连接码：(\d{8})/.exec(log)?.[1];if(!code)throw Error('Missing local pairing code');
const blocks=[{id:'a',text:'## 记录具体细节\n分享经历时先写下实际做过的事情，不编造数据。'},{id:'b',text:'## 保留自己的表达\n选择一句自己说过的话，再补充解释。'},{id:'c',text:'## 发布前检查\n逐页检查文字是否完整，图片是否清楚。'}];
const source='# 把经历写清楚\n\n'+blocks.map(b=>b.text).join('\n\n');
const response=await fetch(base+'/api/storyboard',{method:'POST',headers:{'Content-Type':'application/json','X-Shiye-Code':code},body:JSON.stringify({source,sourceHash:'live-verification',target:6,blocks}),signal:AbortSignal.timeout(85000)});
const data=await response.json();assert.equal(response.status,200,JSON.stringify(data));assert.ok(data.pages.length>=1);assert.equal(data.sourceHash,'live-verification');
await writeFile('artifacts/live-storyboard-result.json',JSON.stringify({testedAt:new Date().toISOString(),source,response:data},null,2));
console.log(JSON.stringify({liveDeepSeek:true,pages:data.pages.length,model:data.model,roles:data.pages.map(p=>p.role)}));
