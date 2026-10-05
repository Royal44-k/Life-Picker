import {useCallback,useEffect,useRef,useState} from 'react';
import {Clock3,RefreshCw} from 'lucide-react';
import {sourceRequest} from './api.ts';
import type {SourceCollectionStatus} from './types.ts';
const time=(n:number)=>new Date(n).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
const labels={running:'正在核验公开素材',succeeded:'检查完成',partial:'部分完成',failed:'检查失败',interrupted:'上次检查已中断'};
export function SourceCollection({code,disabled,onSettled}:{code:string;disabled:boolean;onSettled:(signal:AbortSignal)=>Promise<boolean>}){
 const [data,setData]=useState<SourceCollectionStatus|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const alive=useRef(false),life=useRef(0),sequence=useRef(0),acting=useRef(false),readController=useRef<AbortController|null>(null);
 const controllers=useRef(new Set<AbortController>()),timer=useRef<ReturnType<typeof setTimeout>|null>(null),seen=useRef<string|null>(null),settled=useRef(onSettled);
 settled.current=onSettled;
 const stopTimer=()=>{if(timer.current)clearTimeout(timer.current);timer.current=null;};
 const load=useCallback(async()=>{
  if(!alive.current||acting.current)return;stopTimer();readController.current?.abort();const controller=new AbortController(),request=++sequence.current;
  readController.current=controller;controllers.current.add(controller);setError('');let refreshPending=false;
  try{
   const next=await sourceRequest<SourceCollectionStatus>('collection',code,{signal:controller.signal});
   if(controller.signal.aborted||request!==sequence.current||!alive.current)return;setData(next);
   if(next.ready&&!next.error&&next.latest&&!next.running&&seen.current!==next.latest.id){
    const applied=await settled.current(controller.signal);refreshPending=!applied;
    if(controller.signal.aborted||request!==sequence.current||!alive.current)return;if(applied)seen.current=next.latest.id;
   }
   if(next.ready&&!next.error&&alive.current)timer.current=setTimeout(()=>{if(document.visibilityState!=='hidden')void load();},next.running||refreshPending?1200:30_000);
  }catch(e){if(!controller.signal.aborted&&request===sequence.current&&alive.current)setError((e as Error).message);}
  finally{controllers.current.delete(controller);}
 },[code]);
 useEffect(()=>{
  alive.current=true;life.current++;acting.current=false;seen.current=null;setData(null);setBusy(false);void load();
  const visible=()=>{if(document.visibilityState==='visible')void load();};document.addEventListener('visibilitychange',visible);
  return()=>{alive.current=false;life.current++;sequence.current++;stopTimer();for(const controller of controllers.current)controller.abort();controllers.current.clear();document.removeEventListener('visibilitychange',visible);};
 },[load]);
 async function action(path:string,method:string,body:unknown){
  if(acting.current||disabled)return;acting.current=true;setBusy(true);setError('');stopTimer();sequence.current++;readController.current?.abort();
  const controller=new AbortController(),generation=life.current;controllers.current.add(controller);let success=false;
  try{await sourceRequest(path,code,{method,body:JSON.stringify(body),signal:controller.signal});success=true;}
  catch(e){if(!controller.signal.aborted&&alive.current&&life.current===generation)setError((e as Error).message);}
  finally{controllers.current.delete(controller);if(alive.current&&life.current===generation){acting.current=false;if(success)await load();if(alive.current&&life.current===generation)setBusy(false);}}
 }
 const state=data?.ready?data:null,latest=state?.latest;
 return <section className="source-collection-status" aria-label="公开素材检查">
  <div className="source-section-head"><div><p className="hub-eyebrow">有出处的设计素材</p><h2>公开素材检查</h2></div><RefreshCw size={22}/></div>
  <p className="source-help">核对精选清单中的插画，新增素材先放入待审核。检查时间表示本次核验时间。</p>
  {!data&&!error&&<p role="status" className="source-help">正在读取任务状态…</p>}
  {busy&&<p className="source-help" role="status">正在确认操作…</p>}
  {(error||data?.error)&&<p role="alert" className="source-error">{error||data?.error}</p>}
  {state&&<>
   <label className="source-check"><input type="checkbox" aria-label="每日 09:00 自动检查" checked={state.enabled} disabled={busy||disabled||!!state.error} onChange={e=>void action('collection/schedule','PUT',{enabled:e.target.checked})}/><span>每日 09:00 自动检查<small>北京时间 · 需要电脑服务保持运行</small></span></label>
   <p className="source-next-time"><Clock3 size={13}/>{state.enabled?(state.running?'本次任务进行中':state.nextRunAt?'下次计划：'+time(state.nextRunAt):'自动检查暂不可用'):'已关闭自动检查，可随时手动检查'}</p>
   {state.running&&!state.enabled&&<p className="source-help">当前任务将继续完成，之后不再自动检查。</p>}
   {latest&&!state.error&&<div className="source-job-result" aria-live="polite"><strong>{labels[latest.state]}</strong><p>新增 {latest.added} · 更新 {latest.updated} · 已有 {latest.duplicates} · 略过 {latest.skipped} · 失败 {latest.failed}</p><small>{latest.reason==='manual'?'手动检查':'自动检查'} · {time(latest.startedAt)}{latest.finishedAt?' 结束于 '+time(latest.finishedAt):''}</small>{latest.error&&<p className="source-error">{latest.error}</p>}{latest.items.some(item=>item.error)&&<details><summary>查看失败原因</summary>{latest.items.filter(item=>item.error).map(item=><p key={item.id}>{item.title}：{item.error}</p>)}</details>}</div>}
   {!latest&&!state.error&&<p className="source-help">尚未检查这份素材清单。点击下方按钮开始核验。</p>}
   <div className="source-actions"><button className="source-primary" disabled={busy||disabled||state.running||!!state.error} onClick={()=>void action('collection/run','POST',{})}>检查公开素材更新</button><button disabled={busy||disabled} onClick={()=>void load()}>刷新任务状态</button></div>
   <p className="source-help source-xhs-state">{state.personalXhs.message}</p>
  </>}
  {!state&&error&&<button disabled={busy||disabled} onClick={()=>void load()}>重新读取任务状态</button>}
  {data&&!data.ready&&!error&&<button disabled={busy||disabled} onClick={()=>void load()}>重新读取任务状态</button>}
 </section>;
}
