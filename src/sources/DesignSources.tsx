import {useEffect,useRef,useState} from 'react';
import {sourceRequest} from './api.ts';
import type {DesignSourceStatus,SourceRecord} from './types.ts';

export function DesignSources({code,disabled,onSettled}:{code:string;disabled:boolean;onSettled:(signal:AbortSignal)=>Promise<boolean>}){
 const [data,setData]=useState<DesignSourceStatus|null>(null),[kind,setKind]=useState('marp'),[busy,setBusy]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState('');
 const generation=useRef(0),request=useRef<AbortController|null>(null),acting=useRef(false),settled=useRef(onSettled);settled.current=onSettled;
 useEffect(()=>{
  const n=++generation.current,c=new AbortController();request.current=c;acting.current=false;setBusy('');setMessage('');setError('');setData(null);
  void sourceRequest<DesignSourceStatus>('designs',code,{signal:c.signal}).then(value=>{if(!c.signal.aborted&&generation.current===n)setData(value);}).catch(e=>{if(!c.signal.aborted&&generation.current===n)setError((e as Error).message);});
  return()=>{generation.current++;request.current?.abort();};
 },[code]);
 async function action(name:'discover'|'import'|'refresh',key?:string){
  if(disabled||acting.current)return;request.current?.abort();const c=new AbortController(),n=generation.current;request.current=c;acting.current=true;setBusy(name);setError('');setMessage('');
  const current=()=>!c.signal.aborted&&n===generation.current;
  try{
   if(name==='import'){
    const result=await sourceRequest<{record:SourceRecord;duplicate:boolean}>('designs/import',code,{method:'POST',body:JSON.stringify({key}),signal:c.signal});if(!current())return;
    const refreshed=await settled.current(c.signal);if(!current())return;
    setMessage((result.duplicate?'已在来源夹，未重复添加。':'已加入待审核。')+(refreshed?'':'当前编辑已保留，保存后可刷新来源夹。'));
   }else{
    const result=await sourceRequest<DesignSourceStatus>(name==='refresh'?'designs':'designs/discover',code,{...(name==='discover'?{method:'POST',body:JSON.stringify({kind})}:{}),signal:c.signal},100000);if(!current())return;setData(result);
    if(name==='discover')setMessage(result.results.length?'已找到 '+result.results.length+' 个许可已读取的候选。':'本次没有取得可确认许可的候选，请查看检查结果。');
   }
  }catch(e){if(current())setError((e as Error).message);}
  finally{if(current()){acting.current=false;setBusy('');}}
 }
 function cancel(){request.current?.abort();acting.current=false;setBusy('');setMessage('已取消本次查找，已有候选保留。');}
 return <section className="source-collection-status" aria-label="开放设计发现"><p className="hub-eyebrow">GitHub 官方接口 · 无需账号</p><h2>发现开放设计</h2>
  <p className="source-help">查找免费开源的版式项目，每次最多核对 6 个。这里是待适配的设计源码参考；加入来源夹后仍需人工检查，暂不能直接套用为拾页模板。</p>
  <label>设计类型<select aria-label="开放设计类型" value={kind} disabled={disabled||!!busy} onChange={e=>setKind(e.target.value)}><option value="marp">Marp 图文演示主题</option><option value="reveal">reveal.js 演示主题</option></select></label>
  <div className="source-actions"><button className="source-primary" disabled={disabled||!!busy} onClick={()=>void action('discover')}>查找开放设计</button>{busy==='discover'?<button onClick={cancel}>取消查找</button>:<button disabled={disabled||!!busy} onClick={()=>void action('refresh')}>刷新候选状态</button>}</div>
  {busy&&<p role="status">{busy==='discover'?'正在连接 GitHub 并逐个读取许可…':busy==='import'?'正在加入来源夹…':'正在读取候选…'}</p>}
  {message&&<p role="status">{message}</p>}{(error||data?.error)&&<p role="alert" className="source-error">{error||data?.error}</p>}
  {data?.checkedAt&&<p className="source-help">本次检查 {new Date(data.checkedAt).toLocaleString('zh-CN')} · 未确认 {data.failures} 个{data.partial?' · 部分结果':''}。候选保留至电脑服务重启，超过一天需重新检查。</p>}
  <div className="source-design-list">{data?.results.map(item=><article className="source-job-result" key={item.key}><strong>{item.title}</strong><p>{item.description||'打开原项目查看设计介绍。'}</p><small>MIT · 待适配 · 第三方字体与图片需另行核对</small><div className="source-actions"><a href={item.url} target="_blank" rel="noreferrer">查看原项目</a><a href={item.licenseUrl} target="_blank" rel="noreferrer">许可原文</a><button disabled={disabled||!!busy} onClick={()=>void action('import',item.key)}>加入待审核</button></div></article>)}</div>
  <p className="source-help">网络失败或触发免费接口限流时，可保留候选，稍后手动再查。不会下载或执行项目代码。</p>
 </section>;
}
