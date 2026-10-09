import {useCallback,useEffect,useRef,useState} from 'react';import {sourceRequest} from './api.ts';import type {PersonalXhsStatus} from './types.ts';
const time=(n:number)=>new Date(n).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'});
export function PersonalXhs({code,disabled,onSettled}:{code:string;disabled:boolean;onSettled:(signal:AbortSignal)=>Promise<boolean>}){
 const [browserLogin,setBrowserLogin]=useState(false);
 const [data,setData]=useState<PersonalXhsStatus|null>(null),[error,setError]=useState(''),[readError,setReadError]=useState(''),[busy,setBusy]=useState(''),[mode,setMode]=useState<'home'|'search'>('home'),[keyword,setKeyword]=useState(''),[recent,setRecent]=useState(true),[qr,setQr]=useState<{image:string;expiresAt:number}|null>(null),[expired,setExpired]=useState(false);
 const life=useRef(0),alive=useRef(false),acting=useRef(0),serial=useRef(0),read=useRef<AbortController|null>(null),mutation=useRef<AbortController|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null),controllers=useRef(new Set<AbortController>()),seen=useRef(''),settled=useRef(onSettled);settled.current=onSettled;
 const stopTimer=()=>{if(timer.current)clearTimeout(timer.current);timer.current=null;};
 const load=useCallback(async()=>{
  if(!alive.current||acting.current)return;stopTimer();read.current?.abort();const c=new AbortController(),generation=life.current;read.current=c;controllers.current.add(c);
  try{const value=await sourceRequest<PersonalXhsStatus>('xhs/status',code,{signal:c.signal});if(c.signal.aborted||generation!==life.current)return;setData(value);setReadError('');
   if(value.latest?.finishedAt&&seen.current!==value.latest.id){const applied=await settled.current(c.signal);if(applied&&!c.signal.aborted&&generation===life.current)seen.current=value.latest.id;}
   if(alive.current&&generation===life.current&&!c.signal.aborted)timer.current=setTimeout(()=>{if(document.visibilityState!=='hidden')void load();},value.running?1500:30000);
  }catch(e){if(!c.signal.aborted&&generation===life.current)setReadError((e as Error).message);}finally{controllers.current.delete(c);}
 },[code]);
 useEffect(()=>{alive.current=true;life.current++;acting.current=0;seen.current='';setData(null);setQr(null);setBrowserLogin(false);setBusy('');setError('');setReadError('');void load();const visible=()=>{if(document.visibilityState==='visible')void load();};document.addEventListener('visibilitychange',visible);return()=>{alive.current=false;life.current++;stopTimer();for(const c of controllers.current)c.abort();controllers.current.clear();document.removeEventListener('visibilitychange',visible);};},[load]);
 useEffect(()=>{setExpired(false);if(!qr)return;const t=setTimeout(()=>setExpired(true),Math.max(0,qr.expiresAt-Date.now()));return()=>clearTimeout(t);},[qr]);
 async function action(name:'login'|'check'|'run'|'stop'|'schedule',body:unknown={}){
  if(disabled||acting.current&&name!=='stop')return;const generation=life.current,ticket=++serial.current;acting.current=ticket;mutation.current?.abort();read.current?.abort();stopTimer();setBusy(name);setError('');if(name==='stop'||name==='login')setQr(null);
  const c=new AbortController();mutation.current=c;controllers.current.add(c);
  try{const result=await sourceRequest<{image?:string;expiresAt?:number;isLoggedIn?:boolean;browserLogin?:boolean;error?:string}>('xhs/'+name,code,{method:name==='schedule'?'PUT':'POST',body:JSON.stringify(body),signal:c.signal},name==='login'||name==='check'?200000:20000);
   if(c.signal.aborted||generation!==life.current||acting.current!==ticket)return;if(result.error)throw Error(result.error);
   if(name==='login')setBrowserLogin(result.browserLogin===true);if(name==='check'&& !result.error||name==='stop')setBrowserLogin(false);
   if(name==='login')setQr(result.image&&result.expiresAt?{image:result.image,expiresAt:result.expiresAt}:null);
   if(name==='check'||name==='run')setQr(null);
  }catch(e){if(!c.signal.aborted&&generation===life.current&&acting.current===ticket)setError((e as Error).message);}
  finally{controllers.current.delete(c);if(alive.current&&generation===life.current&&acting.current===ticket){acting.current=0;setBusy('');await load();}}
 }
 const canCollect=data&&['connected','succeeded'].includes(data.state)&&!data.running;
 return <section className="source-collection-status" aria-label="个人小红书参考"><p className="hub-eyebrow">本人账号 · 本机只读</p><h2>个人小红书参考</h2><p className="source-help">先本人扫码，再手动获取最多 6 条标题、作者、链接与可见互动量。需要写下自己的概括再审核；不会复制全文、图片或评论。</p>
 {(error||readError||!data?.ready&&data?.message)&&<p role="alert" className="source-error">{error||readError||data?.message}</p>}{!data&&!error&&<p role="status">正在读取个人来源状态…</p>}
 {data&&<><p role="status">{busy==='login'||busy==='check'?'正在检查本人登录，请稍候…':data.message}</p>{!data.installed&&<p className="source-help">电脑上的个人来源工具尚未准备完成。请先按使用指南完成本机准备，再刷新状态。</p>}
 <div className="source-actions"><button disabled={disabled||!!busy||!data.installed||data.running} onClick={()=>void action('login')}>{data.connection==='visible-browser'?'打开电脑登录窗口':'本人扫码登录'}</button><button disabled={disabled||!!busy||!data.installed||data.running} onClick={()=>void action('check')}>检查登录状态</button><button disabled={disabled||busy==='stop'} onClick={()=>void action('stop')}>停止个人来源</button></div>
 {data.connection==='visible-browser'&&<p className="source-help">检查、采集会在电脑打开拾页专用 Edge 窗口；只使用该窗口的登录。电脑需要保持开机，窗口工作时请勿操作。停止个人来源会关闭专用窗口并保留登录。</p>}
 {browserLogin&&<p role="status" className="source-help">请在电脑打开的 Edge 窗口，用自己的小红书 App 扫码或正常登录。完成后回到这里点“检查登录状态”。</p>}
 {qr&&<div className="source-xhs-qr">{expired?<p>二维码已过期，可点“本人扫码登录”重新获取。</p>:<><img src={qr.image} alt="本人小红书登录二维码"/><p>使用自己的小红书 App 扫码。完成后点“检查登录状态”。</p><small>二维码仅本次登录使用，请勿转发。</small></>}</div>}
 <label>参考入口<select aria-label="小红书参考入口" disabled={disabled||!!busy||data.running} value={mode} onChange={e=>setMode(e.target.value as 'home'|'search')}><option value="home">本人推荐页</option><option value="search">按关键词找参考</option></select></label>
 {mode==='search'&&<><label>关键词<input aria-label="小红书参考关键词" value={keyword} maxLength={80} disabled={disabled||!!busy||data.running} onChange={e=>setKeyword(e.target.value)}/></label><label className="source-check"><input type="checkbox" checked={recent} disabled={disabled||!!busy||data.running} onChange={e=>setRecent(e.target.checked)}/>按最近一周图文筛选（网页筛选结果，非全站榜单）</label></>}
 <button className="source-primary" disabled={disabled||!!busy||!canCollect||mode==='search'&&!keyword.trim()} onClick={()=>void action('run',{mode,keyword,recent})}>获取参考 · 最多 6 条</button>
 <label className="source-check"><input type="checkbox" aria-label="个人参考每日自动更新" checked={data.enabled} disabled={disabled||!!busy||data.running||!data.verified&&!data.enabled} onChange={e=>void action('schedule',{enabled:e.target.checked})}/><span>每日 09:00 检查这一入口<small>首次成功手动采集后可开启 · 电脑需保持运行</small></span></label>
 {data.enabled&&<p className="source-help">自动入口：{data.mode==='search'?data.keyword:'本人推荐页'}{data.recent?' · 最近一周图文':''}{data.nextRunAt?'；下次 '+time(data.nextRunAt):''}。使用当前选择手动获取成功后，可更新自动入口。</p>}
 {data.latest&&<div className="source-job-result"><strong>{data.latest.finishedAt?'上次任务':'本次任务'}</strong><p>新增 {data.latest.added} · 已有 {data.latest.duplicates} · {time(data.latest.startedAt)}</p><p>{data.latest.items.map(i=>i.title).join(' / ')||'暂无已收录结果'}</p><small>完整结果在下方来源夹。发布时间未知时保留未知；采集时间不是发布时间。</small></div>}
 </>}<button disabled={disabled||!!busy} onClick={()=>void load()}>刷新个人来源状态</button>
 </section>;
}
