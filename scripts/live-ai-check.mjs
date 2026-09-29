import {existsSync} from 'node:fs';
import {writeFile} from 'node:fs/promises';
import {generateCopy} from '../server/ai.mjs';
if(existsSync('.env'))process.loadEnvFile('.env');
const config={deepseekKey:process.env.DEEPSEEK_API_KEY||'',deepseekModel:process.env.DEEPSEEK_MODEL||'deepseek-flash',ollamaModel:''};
try{
  const result=await generateCopy({provider:'deepseek',mode:'generate',source:'',topic:'随手记录生活灵感，包含颜文字，不编造数据或引用。',tone:'真诚自然',length:300,symbols:'适量 emoji 和颜文字'},config,fetch,AbortSignal.timeout(75_000));
  await writeFile('artifacts/live-ai-result.json',JSON.stringify({testedAt:new Date().toISOString(),...result},null,2));
  console.log(JSON.stringify({success:true,model:result.model,characters:result.text.length}));
}catch(e){console.log(JSON.stringify({success:false,error:e.message,causeCode:e.cause?.code}));process.exitCode=1;}
