import {readUsage} from './usage-store.mjs';
const featureByPath={'/api/ai':'copy','/api/storyboard':'storyboard','/api/page-ai':'page','/api/chat':'chat','/api/inspiration':'inspiration','/api/visual-ai':'visual'};
export function meterCall({store,fetcher,path,signal}){
 let reservation=null,usage=null,attempted=false,finished=false;
 return {
  fetch:async(url,init)=>{
   if(store===undefined)return fetcher(url,init);
   if(!store)throw Error('AI 用量服务暂不可用，已停止新调用，请检查电脑存储。');
   if(reservation)throw Error('本次请求不允许自动重复调用模型。');
   const provider=url==='https://api.deepseek.com/chat/completions'?'deepseek':url==='http://127.0.0.1:11434/api/chat'?'ollama':null;
   if(!provider)throw Error('模型地址不在允许的用量统计范围。');const body=JSON.parse(init.body);
   signal?.throwIfAborted();reservation=await store.reserve({feature:featureByPath[path],provider,model:body.model,inputBytes:Buffer.byteLength(init.body),maxOutput:provider==='deepseek'?body.max_tokens:body.options.num_predict});
   signal?.throwIfAborted();attempted=true;const response=await fetcher(url,init);
   return {ok:response.ok,status:response.status,json:async()=>{const data=await response.json();usage=readUsage(provider,data);return data;}};
  },
  finish:async status=>{if(!reservation||finished)return '';finished=true;try{await store.finish(reservation.id,{status,usage:attempted?usage:{input:0,output:0,cacheHit:null,cacheMiss:null}});return '';}catch{return '本次结果已保留，但用量未能完整保存。新 AI 调用已暂停，请在“我的 → AI 用量与预算”核对后检查电脑存储。';}}
 };
}
export async function usageRequest(req,res,store,send){
 if(!store){send(res,503,{error:'AI 用量服务暂不可用，原文件保留，新调用已暂停。'});return;}
 const path=req.url?.split('?')[0];if(req.method==='GET'&&path==='/api/usage'){try{const data=await store.snapshot();const unresolved=data.rows.filter(r=>r.provider==='deepseek'&&r.status!=='running'&&r.estimatedYuan===null&&!r.manual);send(res,200,{...data,totalRows:data.rows.length,rows:data.rows.slice(0,100),unresolvedRows:unresolved.slice(0,100),unresolvedCount:unresolved.length});}catch(e){send(res,503,{error:e.message});}return;}
 if(req.method==='GET'&&path==='/api/usage/export'){try{send(res,200,await store.snapshot());}catch(e){send(res,503,{error:e.message});}return;}
 if(!(req.method==='PUT'&&path==='/api/usage/settings'||req.method==='POST'&&path==='/api/usage/reconcile')){send(res,404,{error:'未找到用量操作。'});return;}
 const timer=setTimeout(()=>req.destroy(),20000);try{let bytes=0,chunks=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>12000){send(res,413,{error:'用量设置过长。'});return;}chunks.push(chunk);}let value;try{value=JSON.parse(Buffer.concat(chunks).toString());}catch{send(res,400,{error:'用量设置格式无效。'});return;}if(!value||typeof value!=='object'){send(res,400,{error:'用量设置格式无效。'});return;}
  const result=path.endsWith('/settings')?await store.configure(value.settings,value.expected):await store.reconcile(value.id,value.yuan,value.checkedOn,value.expected);send(res,200,result);
 }catch(e){if(!res.destroyed)send(res,409,{error:e.message||'用量设置未保存，请重新读取核对。'});}finally{clearTimeout(timer);}
}
