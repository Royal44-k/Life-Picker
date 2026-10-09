import {PersonalXhs} from './PersonalXhs.tsx';
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowUpRight,Check,Download,Link,Plus,RotateCcw,Trash2} from 'lucide-react';
import {BottomNav} from '../hub/BottomNav.tsx';
import {sourceRequest} from './api.ts';
import {fromSourceForm,toSourceForm} from './types.ts';
import type {SourceBackup,SourceForm,SourceRecord,SourceStatus} from './types.ts';
import {SourceFacts,SourceFields} from './SourceFields.tsx';
import {SourceCollection} from './SourceCollection.tsx';
import {SourceAssetPreview} from './SourceAssetPreview.tsx';
import '../studio/studio.css';
import './sources.css';

type Editor={row:SourceRecord|null;form:SourceForm;baseline:string};
type Filter='pending'|'approved'|'rejected'|'trash'|'all';
const names:Record<Filter,string>={pending:'待审核',approved:'已通过',rejected:'未通过',trash:'回收站',all:'全部'};
function initialCode(){try{return sessionStorage.getItem('shiye:storyboard:code')||'';}catch{return '';}}
function remember(code:string){try{sessionStorage.setItem('shiye:storyboard:code',code);}catch{}}
function saveDownload(name:string,value:unknown){
 const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60_000);
}
function openEditor(row:SourceRecord|null):Editor{const form=toSourceForm(row||undefined);return {row,form,baseline:JSON.stringify(form)};}
function sourceHost(url:string){try{return new URL(url).hostname;}catch{return '来源链接';}}

export default function Sources(){
 const [code,setCode]=useState(initialCode),[status,setStatus]=useState<SourceStatus|null>(null),[loading,setLoading]=useState(true),[connected,setConnected]=useState(false);
 const [records,setRecords]=useState<SourceRecord[]>([]),[filter,setFilter]=useState<Filter>('pending'),[query,setQuery]=useState('');
 const [editor,setEditor]=useState<Editor|null>(null),[ack,setAck]=useState(false),[note,setNote]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[undo,setUndo]=useState<SourceRecord|null>(null);
 const [backup,setBackup]=useState<{bundle:SourceBackup;count:number;name:string}|null>(null),[recoveryAck,setRecoveryAck]=useState(false);
 const catalogEpoch=useRef(0);
 const inFlight=useRef(false),leaving=useRef(false),editTop=useRef<HTMLElement>(null);
 const dirty=!!editor&&JSON.stringify(editor.form)!==editor.baseline,unsaved=dirty||!!note.trim();
 const api=<T,>(path:string,method='GET',body?:unknown)=>sourceRequest<T>(path,code,{method,body:body===undefined?undefined:JSON.stringify(body)});
 useEffect(()=>{
  const controller=new AbortController(),saved=initialCode();
  void sourceRequest<SourceStatus>('status','',{signal:controller.signal}).then(async next=>{
   if(controller.signal.aborted)return;setStatus(next);
   if(next.ready&&/^\d{8}$/.test(saved)){
    const data=await sourceRequest<{records:SourceRecord[]}>('catalog',saved,{signal:controller.signal});
    if(!controller.signal.aborted){catalogEpoch.current++;setRecords(data.records);setConnected(true);}
   }
  }).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[]);
 useEffect(()=>{
  const guard=(e:BeforeUnloadEvent)=>{if(!leaving.current&&(unsaved||busy)){e.preventDefault();e.returnValue='';}};
  addEventListener('beforeunload',guard);return()=>removeEventListener('beforeunload',guard);
 },[unsaved,busy]);
 function discardAllowed(){return !unsaved||confirm('当前编辑内容尚未保存。可以先下载编辑内容；确定放弃这些修改吗？');}
 function navigate(href:string){if(inFlight.current||!discardAllowed())return;leaving.current=true;location.href=href;}
 function select(row:SourceRecord|null){if(inFlight.current||!discardAllowed())return;setEditor(openEditor(row));setAck(false);setNote('');setError('');setMessage('');requestAnimationFrame(()=>editTop.current?.scrollIntoView({block:'start'}));}
 function upsert(row:SourceRecord){catalogEpoch.current++;setRecords(old=>[row,...old.filter(r=>r.id!==row.id)].sort((a,b)=>b.updatedAt-a.updatedAt));}
 function accept(row:SourceRecord){upsert(row);setEditor(openEditor(row));setAck(false);setNote('');}
 async function run(action:()=>Promise<void>){
  if(inFlight.current)return;inFlight.current=true;setBusy(true);setError('');setMessage('');
  try{await action();}catch(e){setError(e instanceof Error?e.message:'操作未完成，编辑内容仍保留，请重试。');}
  finally{inFlight.current=false;setBusy(false);}
 }
 async function connect(){
  const next=await sourceRequest<SourceStatus>('status');setStatus(next);
  if(!next.ready){setConnected(false);throw new Error(next.error||'来源库暂时不可用，原文件保留。');}
  const data=await api<{records:SourceRecord[]}>('catalog');catalogEpoch.current++;setRecords(data.records);setConnected(true);remember(code);setMessage('已连接电脑来源库');
 }
 async function save(){
  if(!editor)return;const draft=fromSourceForm(editor.form,editor.row);
  const result=await api<{record:SourceRecord}>(editor.row?'records/'+editor.row.id:'records',editor.row?'PUT':'POST',editor.row?{expected:editor.row.revision,draft}:draft);
  accept(result.record);setFilter('pending');setMessage('已保存到电脑来源库');
 }
 async function review(action:'approve'|'reject'|'reopen'){
  if(!editor?.row||dirty)return;
  const result=await api<{record:SourceRecord}>('records/'+editor.row.id+'/review','POST',{expected:editor.row.revision,action,acknowledged:ack,note});
  accept(result.record);setFilter(result.record.review.state);setMessage(action==='approve'?'审核已通过':action==='reject'?'已记录未通过原因':'已移回待审核');
 }
 async function trash(row:SourceRecord,trashed:boolean){
  const result=await api<{record:SourceRecord}>('records/'+row.id+'/trash','POST',{expected:row.revision,trashed});
  upsert(result.record);setAck(false);setNote('');
  if(trashed){setUndo(result.record);setEditor(null);setMessage('已移入回收站，可以撤销。');}
  else{setUndo(null);setEditor(openEditor(result.record));setFilter(result.record.review.state);setMessage('来源已恢复');}
 }
 async function reloadEditor(){
  if(!editor?.row||!discardAllowed())return;
  const data=await api<{records:SourceRecord[]}>('catalog'),latest=data.records.find(r=>r.id===editor.row!.id);catalogEpoch.current++;setRecords(data.records);
  if(!latest)throw new Error('这条来源已被永久删除。当前编辑内容仍保留，可下载后重新添加。');
  accept(latest);setMessage('已载入电脑上的最新版本');
 }
 async function erase(){
  if(!editor?.row||!confirm('永久删除这条来源后无法撤销。已有备份不会一同删除，确定永久删除吗？'))return;
  const id=editor.row.id;await api('records/'+id,'DELETE',{expected:editor.row.revision});catalogEpoch.current++;setRecords(old=>old.filter(r=>r.id!==id));setEditor(null);if(undo?.id===id)setUndo(null);setMessage('来源已永久删除');
 }
 async function readBackup(file:File){
  if(file.size>18_000_000)throw new Error('来源备份超过 18 MB，无法读取。');
  let value:SourceBackup,payload:{records:unknown[]};
  try{value=JSON.parse(await file.text());if(value.format!=='shiye-sources'||value.version!==1||typeof value.payload!=='string')throw new Error();payload=JSON.parse(value.payload);if(!Array.isArray(payload.records)||payload.records.length>500)throw new Error();}
  catch{throw new Error('这不是有效的拾页来源备份。现有数据保留，请重新选择。');}
  setBackup({bundle:value,count:payload.records.length,name:file.name});setRecoveryAck(false);
 }
 async function restore(){
  if(!backup)return;const repairing=status?.ready===false;
  if(repairing&&!recoveryAck)throw new Error('请先确认保留损坏原文件并恢复备份。');
  const result=await api<{added:number;skipped?:number}>(repairing?'recover':'restore','POST',{bundle:backup.bundle,acknowledged:recoveryAck});
  setStatus({ready:true,mode:'local-computer',requiresPairing:true,maxRecords:500});setBackup(null);setRecoveryAck(false);remember(code);
  const success=repairing?'已从备份修复，损坏原文件保留。新增 '+result.added+' 条，均需重新审核。':'恢复完成：新增 '+result.added+' 条，跳过已有 '+(result.skipped||0)+' 条。';
  try{const data=await api<{records:SourceRecord[]}>('catalog');catalogEpoch.current++;setRecords(data.records);setConnected(true);setMessage(success);}
  catch{setMessage(success);throw new Error('恢复已完成，但列表暂未读回。请刷新列表，不要重复恢复。');}
 }
 async function refreshCollected(signal:AbortSignal){
  if(inFlight.current)return false;const epoch=catalogEpoch.current,data=await sourceRequest<{records:SourceRecord[]}>('catalog',code,{signal});
  if(signal.aborted||epoch!==catalogEpoch.current||inFlight.current)return false;
  catalogEpoch.current++;setRecords(data.records);return true;
 }
 const matches=(r:SourceRecord,f:Filter)=>f==='trash'?r.trashedAt!==null:r.trashedAt===null&&(f==='all'||r.review.state===f);
 const visible=records.filter(r=>matches(r,filter)&&[r.title,r.summary,r.analysis,r.author.name,...r.tags].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
 const row=editor?.row,trashed=!!row&&row.trashedAt!==null;
 return <div className="next-studio hub-app source-app has-main-nav">
  <header className="hub-header"><a href="/?view=mine" onClick={e=>{e.preventDefault();navigate('/?view=mine');}} className="source-back"><ArrowLeft size={18}/>我的</a><strong>来源与审核</strong><span>让每个启发，有迹可循</span></header>
  <main className="hub-main source-main">
   <div className="source-intro"><p className="hub-eyebrow">把观察，也认真收藏</p><h1>把启发，连同出处收好。</h1><p>先留下链接和自己的理解，再确认使用范围。<br/>审核通过后，才进入灵感与素材的可用列表。</p></div>
   <section className="source-connection" aria-label="来源库连接">
    <div><span className={'source-dot '+(connected?'connected':'')}/><strong>{loading?'正在检查电脑服务…':connected?'已连接电脑来源库':'连接电脑上的来源库'}</strong><small>这里保存到电脑，手机与电脑浏览器可共同管理。随心记不会自动上传。</small></div>
    <form onSubmit={e=>{e.preventDefault();void run(connect);}}><label>电脑连接码<input inputMode="numeric" autoComplete="off" pattern="[0-9]{8}" maxLength={8} required value={code} disabled={busy||loading} onChange={e=>{setCode(e.target.value.replace(/\D/g,''));setConnected(false);}} placeholder="启动窗口里的 8 位码"/></label><button type="submit" disabled={busy||loading}>{connected?'刷新列表':'连接来源库'}</button></form>
   </section>
   {error&&(!editor||!connected)&&<p className="source-error" role="alert">{error}</p>}
   {message&&<p className="source-message" role="status"><Check size={16}/>{message}</p>}
   {undo&&<div className="source-undo"><span>“{undo.title}”已移入回收站</span><button disabled={busy} onClick={()=>void run(()=>trash(undo,false))}><RotateCcw size={16}/>撤销删除</button></div>}
   {status?.ready===false&&<p className="source-error">{status.error||'来源库暂时不可用，原文件保留。'}{status.canRecover?'可在下方选择来源备份进行修复。':''}</p>}
   {connected&&<><SourceCollection code={code} disabled={busy} onSettled={refreshCollected}/><PersonalXhs code={code} disabled={busy} onSettled={refreshCollected}/></>}
   {connected&&<div className="source-workspace">
    <section className="source-collection" aria-label="来源列表">
     <div className="source-section-head"><h2>我的来源夹 <small>{records.length} / 500</small></h2><button className="source-primary" disabled={busy} onClick={()=>select(null)}><Plus size={17}/>添加来源</button></div>
     <div className="source-filters" aria-label="筛选来源">{(Object.keys(names) as Filter[]).map(f=><button key={f} aria-pressed={filter===f} onClick={()=>setFilter(f)}>{names[f]} <span>{records.filter(r=>matches(r,f)).length}</span></button>)}</div>
     <label className="source-search">搜索来源<input type="search" value={query} maxLength={200} placeholder="搜标题、作者、标签或自己的分析" onChange={e=>setQuery(e.target.value)}/></label>
     {visible.length?<div className="source-list">{visible.map(r=><button key={r.id} disabled={busy} className={'source-card '+(editor?.row?.id===r.id?'selected':'')} aria-label={'查看来源：'+r.title} onClick={()=>select(r)}><div><span>{r.kind==='asset'?'设计素材':'参考链接'} · {names[r.trashedAt!==null?'trash':r.review.state]}</span><ArrowUpRight size={17}/></div><h3>{r.title}</h3><p>{r.summary||r.analysis||'还没有写下自己的观察'}</p><small>{sourceHost(r.canonicalUrl)} · {r.author.name||'作者未知'}</small></button>)}</div>:<div className="source-empty"><Link size={28}/><h3>{query?'没有找到相关来源':filter==='trash'?'回收站是空的':'这里还没有'+(filter==='all'?'来源':names[filter]+'的来源')}</h3><p>{query?'换个词试试，或切换上方分类。':'可以先添加一个链接，写下它为什么打动你。'}</p></div>}
    </section>
    {editor&&<section ref={editTop} className="sources-detail" aria-label="编辑来源">
     <div className="source-section-head"><h2>{trashed?'回收站里的来源':row?'整理这条来源':'留下一条新来源'}</h2><button disabled={busy} onClick={()=>{if(discardAllowed()){setEditor(null);setNote('');setAck(false);setError('');}}}>收起</button></div>
     <p className="sources-detail-state">{dirty?'修改尚未保存到电脑':row?names[trashed?'trash':row.review.state]+' · 修订 '+row.revision:'填写后保存到电脑来源库'}</p>
     {error&&<p className="source-error" role="alert">{error}</p>}
     {row?.asset&&<SourceAssetPreview row={row} code={code}/>}
     {row&&records.some(r=>r.id===row.id&&r.revision!==row.revision)&&<p className="source-error">电脑上的来源已更新。当前编辑内容保留，请先下载或重新载入已保存版本。</p>}
     {trashed&&row?<><h3>{row.title}</h3><p className="source-body">{row.summary||row.analysis}</p><SourceFacts row={row}/><div className="source-actions"><button disabled={busy} className="source-primary" onClick={()=>void run(()=>trash(row,false))}>恢复来源</button><button disabled={busy} className="source-danger" onClick={()=>void run(erase)}>永久删除</button></div></>:<>
      <form onSubmit={e=>{e.preventDefault();void run(save);}}>
       <SourceFields form={editor.form} onChange={form=>{setEditor({...editor,form});setAck(false);}} disabled={busy} kind={row?.kind||'reference'}/>
       <button className="source-primary source-wide" disabled={busy||!editor.form.title.trim()||!editor.form.originalUrl.trim()||!!row&&!dirty} type="submit">{busy?'正在处理…':row?'保存修改并重新审核':'保存为待审核'}</button>
       {row&&<p className="source-help">保存修改后会重新进入待审核，已通过的旧版本将退出可用列表。</p>}
      </form>
      <div className="source-actions"><button disabled={busy} onClick={()=>{saveDownload('拾页-来源编辑内容.json',{format:'shiye-source-draft',version:1,draft:fromSourceForm(editor.form,row),reviewNote:note});}}><Download size={16}/>下载当前编辑内容</button>{row&&<button disabled={busy} onClick={()=>void run(reloadEditor)}>重新载入已保存版本</button>}</div>
      {row&&<><SourceFacts row={row}/><section className="source-review"><h3>核对后，再使用</h3>{dirty?<p>先保存修改，再审核当前内容。</p>:<><label className="source-check"><input type="checkbox" checked={ack} disabled={busy} onChange={e=>setAck(e.target.checked)}/>我已打开来源并核对内容与使用范围</label><label>审核说明<textarea aria-label="审核说明" rows={2} maxLength={1000} disabled={busy} value={note} onChange={e=>setNote(e.target.value)} placeholder="未通过时，请写下原因。"/></label><div className="source-actions"><button className="source-primary" disabled={busy||!ack||row.review.state==='approved'} onClick={()=>void run(()=>review('approve'))}>通过审核</button><button disabled={busy||!note.trim()} onClick={()=>void run(()=>review('reject'))}>记录为未通过</button>{row.review.state!=='pending'&&<button disabled={busy} onClick={()=>void run(()=>review('reopen'))}>移回待审核</button>}</div></>}</section><button className="source-danger source-delete" disabled={busy} onClick={()=>{if(discardAllowed())void run(()=>trash(row,true));}}><Trash2 size={16}/>移入回收站</button></>}
     </>}
    </section>}
   </div>}
   {editor&&!connected&&<section className="source-detached"><p>当前编辑内容仍在。请连接来源库后继续保存。</p><button onClick={()=>saveDownload('拾页-来源编辑内容.json',{format:'shiye-source-draft',version:1,draft:fromSourceForm(editor.form,editor.row),reviewNote:note})}>下载当前编辑内容</button></section>}
   <section className="source-backup" aria-label="来源备份"><div><Download size={23}/><h2>把来源也备一份</h2></div><p>来源备份保存出处、分析与审核信息，与随心记、作品备份分开。恢复时合并新增来源，已有链接跳过；素材图片需重新核验，新增内容需要重新审核。</p><div className="source-actions"><button disabled={busy||!connected} onClick={()=>void run(async()=>{const data=await api<SourceBackup>('backup');saveDownload('拾页-来源备份-'+new Date().toISOString().slice(0,10)+'.json',data);setMessage('来源备份已生成，请在浏览器下载中确认保存。');})}>下载来源备份</button><label className="source-upload">选择来源备份<input type="file" aria-label="恢复来源备份" accept=".json,application/json" disabled={busy||loading||!connected&&!status?.canRecover} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void run(()=>readBackup(file));}}/></label></div>
    {backup&&<div className="source-import"><p>备份包含 {backup.count} 条来源 · {backup.name}</p>{status?.ready===false&&<label className="source-check"><input type="checkbox" checked={recoveryAck} disabled={busy} onChange={e=>setRecoveryAck(e.target.checked)}/>保留损坏原文件，并从这份备份修复来源库</label>}<div className="source-actions"><button className="source-primary" disabled={busy||!/^\d{8}$/.test(code)||status?.ready===false&&!recoveryAck} onClick={()=>void run(restore)}>{status?.ready===false?'保留原文件并修复':'合并恢复备份'}</button><button disabled={busy} onClick={()=>setBackup(null)}>取消恢复</button></div></div>}
   </section>
   <p className="source-footnote">当前为个人电脑来源库，电脑服务需保持运行。已通过的内容可由连接此服务的设备查看；不要把私密随心记粘贴到这里。</p>
  </main><BottomNav active="mine" disabled={busy||loading} onNavigate={navigate}/>
 </div>;
}
