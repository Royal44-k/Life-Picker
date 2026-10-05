import {createHash,randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile,rename,rm,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {sourceIdentity} from './source-model.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex'),LIMIT=1_000_000;
const states=['running','succeeded','partial','failed','interrupted'];
const dayAt=now=>new Date(now+8*3_600_000).toISOString().slice(0,10);
const morningAt=day=>Date.parse(day+'T01:00:00Z');
const safeError=error=>error?.code?'电脑来源任务读写失败，请检查存储空间后重试。':String(error?.message||'来源任务未完成，请手动重试。').slice(0,600);
function validate(value){
 if(!value||value.version!==1||typeof value.enabled!=='boolean'||value.lastScheduledDay!==null&&!/^\d{4}-\d{2}-\d{2}$/.test(value.lastScheduledDay)||value.lastSuccessAt!==null&&(!Number.isSafeInteger(value.lastSuccessAt)||value.lastSuccessAt<0)||!Array.isArray(value.runs)||value.runs.length>10)throw new Error('来源任务状态损坏，原文件保留。');
 for(const run of value.runs){
  if(!run||typeof run.id!=='string'||!/^[\w-]{1,80}$/.test(run.id)||!['manual','automatic'].includes(run.reason)||!states.includes(run.state)||!Number.isSafeInteger(run.startedAt)||run.startedAt<0||run.finishedAt!==null&&(!Number.isSafeInteger(run.finishedAt)||run.finishedAt<0)||!Array.isArray(run.items)||run.items.length>24||typeof run.error!=='string'||run.error.length>600)throw new Error('来源任务状态损坏，原文件保留。');
  for(const key of ['added','updated','duplicates','skipped','failed'])if(!Number.isSafeInteger(run[key])||run[key]<0||run[key]>24)throw new Error('来源任务计数损坏，原文件保留。');
  for(const item of run.items)if(!item||typeof item.id!=='string'||typeof item.title!=='string'||!['added','updated','duplicate','skipped','failed'].includes(item.outcome)||typeof item.error!=='string'||item.error.length>600)throw new Error('来源任务明细损坏，原文件保留。');
 }
 return value;
}
function encode(value){const payload=JSON.stringify(validate(value));if(Buffer.byteLength(payload)>LIMIT/2)throw new Error('来源任务记录过大，请检查任务状态。');return JSON.stringify({format:'shiye-source-jobs',version:1,payload,sha256:hash(payload)});}
function decode(raw){try{const bundle=JSON.parse(raw);if(bundle.format!=='shiye-source-jobs'||bundle.version!==1||typeof bundle.payload!=='string'||hash(bundle.payload)!==bundle.sha256)throw new Error();return validate(JSON.parse(bundle.payload));}catch{throw new Error('来源任务状态损坏，原文件保留，请在电脑上检查。');}}
export async function createSourceJobs({root,getStore,assets,now=Date.now,beforeCommit=async()=>{}}){
 const folder=resolve(root),file=join(folder,'collection.json');await mkdir(folder,{recursive:true});
 let state={version:1,enabled:true,lastScheduledDay:null,lastSuccessAt:null,runs:[]},fingerprint=null,tail=Promise.resolve(),active=null,timer=null,closed=false,fatal='';
 try{if((await stat(file)).size>LIMIT)throw new Error('来源任务状态文件损坏或过大，原文件保留。');const raw=await readFile(file,'utf8');state=decode(raw);fingerprint=hash(raw);}catch(error){if(error.code!=='ENOENT')throw error;}
 function update(change){
  const task=tail.then(async()=>{
   const next=change(structuredClone(state)),raw=encode(next);let current=null;
   try{if((await stat(file)).size>LIMIT)throw new Error('来源任务状态文件已变化，请重新启动来源服务。');current=hash(await readFile(file));}catch(error){if(error.code!=='ENOENT')throw error;}
   if(current!==fingerprint)throw new Error('来源任务状态已被其他进程修改，请重新启动来源服务。');
   await beforeCommit();const temp=file+'.'+randomUUID()+'.tmp';
   try{await writeFile(temp,raw,{flag:'wx',mode:0o600});await rename(temp,file);}catch(error){await rm(temp,{force:true}).catch(()=>{});throw error;}
   state=next;fingerprint=hash(raw);
  });
  tail=task.catch(()=>{});return task;
 }
 if(state.runs.some(run=>run.state==='running'))await update(next=>({...next,runs:next.runs.map(run=>run.state==='running'?{...run,state:'interrupted',finishedAt:now(),error:'上次来源任务随电脑服务中断；已入库内容保留，可手动检查更新。'}:run)}));
 function nextRunAt(){
  if(!state.enabled||closed||fatal)return null;const time=now(),day=dayAt(time),morning=morningAt(day);
  if(time<morning)return morning;
  return state.lastScheduledDay===null||state.lastScheduledDay<day?time:morning+86_400_000;
 }
 function status(){return {enabled:state.enabled,running:!!active,latest:state.runs[0]?structuredClone(state.runs[0]):null,history:structuredClone(state.runs),lastScheduledDay:state.lastScheduledDay,lastSuccessAt:state.lastSuccessAt,nextRunAt:nextRunAt(),timezone:'Asia/Shanghai',time:'09:00',mode:'local-computer',error:fatal||null,sources:assets.manifest.map(entry=>({id:entry.id,sourceId:entry.sourceId,title:entry.title})),personalXhs:{state:'not_connected',message:'个人小红书来源尚未连接，当前任务仅检查公开素材清单。'}};}
 async function execute(current,reason,started,failedStart){
  let begun=false;
  const run={id:current.id,reason,state:'running',startedAt:now(),finishedAt:null,added:0,updated:0,duplicates:0,skipped:0,failed:0,items:[],error:''};
  try{
   await update(next=>{next.runs=[structuredClone(run),...next.runs].slice(0,10);if(reason==='automatic'||run.startedAt>=morningAt(dayAt(run.startedAt)))next.lastScheduledDay=dayAt(run.startedAt);return next;});
   begun=true;started({id:run.id,existing:false});const store=getStore();if(!store)throw new Error('来源库暂时不可用，请先修复来源库再检查更新。');
   const memo=new Map();
   for(const item of assets.manifest){
    current.controller.signal.throwIfAborted();let outcome='failed',error='';
    try{
     const result=await assets.acquire(item.id,{signal:current.controller.signal,memo});current.controller.signal.throwIfAborted();
     const rows=await store.list(),identity=sourceIdentity(result.draft),existing=rows.find(row=>sourceIdentity(row)===identity);
     if(existing?.trashedAt!==null&&existing){outcome='skipped';run.skipped++;}
     else if(existing){
      if(existing.asset?.sha256===result.draft.asset.sha256){outcome='duplicate';run.duplicates++;}
      else{await store.edit(existing.id,existing.revision,{...result.draft,title:existing.title,summary:existing.summary||result.draft.summary,analysis:existing.analysis,tags:existing.tags});outcome='updated';run.updated++;}
     }else if(rows.some(row=>row.kind==='asset'&&row.asset?.sha256===result.draft.asset.sha256)){outcome='duplicate';run.duplicates++;}
     else{await store.create(result.draft);outcome='added';run.added++;}
    }catch(cause){if(current.controller.signal.aborted)throw cause;error=safeError(cause);run.failed++;}
    run.items.push({id:item.id,title:item.title,outcome,error});await update(next=>({...next,runs:next.runs.map(row=>row.id===run.id?structuredClone(run):row)}));
   }
   run.state=run.failed?(run.added+run.updated+run.duplicates+run.skipped?'partial':'failed'):'succeeded';
  }catch(error){
   if(!begun){fatal=safeError(error);failedStart(error);return;}
   run.state=current.controller.signal.aborted?'interrupted':'failed';run.error=current.controller.signal.aborted?'来源检查已随服务停止；已入库内容保留。':safeError(error);
  }finally{
   if(begun){
    run.finishedAt=now();
    try{await update(next=>({...next,lastSuccessAt:run.state==='succeeded'?run.finishedAt:next.lastSuccessAt,runs:next.runs.map(row=>row.id===run.id?structuredClone(run):row)}));}
    catch(error){fatal='来源任务结果尚未保存。'+safeError(error);}
   }
   if(active===current)active=null;
  }
 }
 async function trigger(reason='manual'){
  if(closed)throw new Error('来源任务服务已停止。');if(!['manual','automatic'].includes(reason))throw new Error('来源触发方式无效。');if(fatal)throw new Error(fatal);
  if(active){const begun=await active.started;return {...begun,existing:true};}
  let started,failedStart;const begin=new Promise((ok,fail)=>{started=ok;failedStart=fail;}),current={id:randomUUID(),controller:new AbortController(),started:begin,done:null};
  active=current;current.done=execute(current,reason,started,failedStart);return begin;
 }
 async function tick(){
  if(closed||fatal||!state.enabled||active)return false;
  const time=now(),day=dayAt(time);if(time<morningAt(day)||state.lastScheduledDay!==null&&state.lastScheduledDay>=day)return false;
  return !(await trigger('automatic')).existing;
 }
 async function setEnabled(enabled){if(typeof enabled!=='boolean')throw new Error('自动检查设置无效。');if(closed||fatal)throw new Error(fatal||'来源服务已停止。');await update(next=>({...next,enabled}));return status();}
 function startScheduler(){if(timer||closed)return;const check=()=>{void tick().catch(error=>{fatal=safeError(error);});};timer=setInterval(check,30_000);timer.unref?.();check();}
 function close(){closed=true;if(timer)clearInterval(timer);timer=null;active?.controller.abort();}
 return {status,trigger,tick,setEnabled,startScheduler,close,waitForIdle:()=>active?.done||Promise.resolve()};
}
