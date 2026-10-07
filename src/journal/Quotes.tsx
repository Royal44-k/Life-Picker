import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,ArrowUpRight,BookOpen,Check,Download,Quote,RotateCcw,Search,Trash2} from 'lucide-react';
import {BottomNav} from '../hub/BottomNav.tsx';
import {Modal} from '../components/Modal.tsx';
import {DEFAULT_OPTIONS} from '../core/layout.ts';
import {download} from '../core/export.ts';
import {listEntries,saveEntry} from './database.ts';
import {saveStory} from '../studio/database.ts';
import {planStory} from '../studio/planner.ts';
import type {JournalEntry,JournalQuote} from './model.ts';
import {collectQuotes,quotesToSource,removeQuote,resolveQuotes,restoreQuote} from './quotes.ts';
import type {QuoteRow} from './quotes.ts';
import './journal.css';
import './quotes.css';

export default function Quotes(){
 const [entries,setEntries]=useState<JournalEntry[]>([]),[loading,setLoading]=useState(true),[query,setQuery]=useState('');
 const [selected,setSelected]=useState<string[]>([]),[busy,setBusy]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [undo,setUndo]=useState<{entryId:string;quote:JournalQuote;index:number}|null>(null);
 const [composition,setComposition]=useState<{rows:QuoteRow[];text:string}|null>(null);
 const lock=useRef(false),navigationAllowed=useRef(false);
 const rows=useMemo(()=>collectQuotes(entries),[entries]),shown=rows.filter(r=>[r.quote.text,r.quote.sourceDate].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
 function update(entry:JournalEntry){setEntries(old=>old.map(e=>e.id===entry.id?entry:e));}
 async function read(){
  const records=await listEntries();setEntries(records);const available=new Set(collectQuotes(records).map(r=>r.key));setSelected(old=>old.filter(key=>available.has(key)));return records;
 }
 async function run(label:string,action:()=>Promise<void>){
  if(lock.current)return;lock.current=true;setBusy(label);setError('');setNotice('');
  try{await action();}catch(e){setError((e as Error).message);}finally{lock.current=false;setBusy('');}
 }
 useEffect(()=>{let alive=true;void listEntries().then(records=>{if(alive)setEntries(records);}).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};},[]);
 useEffect(()=>{const guard=(e:BeforeUnloadEvent)=>{if(!navigationAllowed.current&&(lock.current||composition)){e.preventDefault();e.returnValue='';}};addEventListener('beforeunload',guard);return()=>removeEventListener('beforeunload',guard);},[composition]);
 function toggle(key:string){setError('');setSelected(old=>old.includes(key)?old.filter(k=>k!==key):old.length<9?[...old,key]:old);}
 async function remove(row:QuoteRow){
  await run('正在移除…',async()=>{
   const entry=entries.find(e=>e.id===row.entryId);if(!entry)throw new Error('原记录已变化，请重新读取。');
   const index=entry.quotes!.findIndex(q=>q.id===row.quote.id),next=removeQuote(entry,row.quote.id);
   const revision=await saveEntry(next,entry.revision);update({...next,revision});
   setSelected(old=>old.filter(key=>key!==row.key));setUndo({entryId:entry.id,quote:row.quote,index});setNotice('已移除这句收藏，原记录文字仍保留。');
  });
 }
 async function restore(){
  if(!undo)return;
  await run('正在恢复…',async()=>{
   const entry=entries.find(e=>e.id===undo.entryId);if(!entry)throw new Error('原记录已不在当前列表，请重新读取；若已删除，先去随心记回收站恢复。');
   const next=restoreQuote(entry,undo.quote,undo.index),revision=await saveEntry(next,entry.revision);update({...next,revision});setUndo(null);setNotice('这句原话已恢复。');
  });
 }
 async function begin(){
  await run('正在核对原话…',async()=>{const records=await read(),chosen=resolveQuotes(records,selected);setComposition({rows:chosen,text:quotesToSource(chosen)});});
 }
 async function create(){
  if(!composition)return;const snapshot=composition;
  await run('正在另存作品…',async()=>{
   const records=await read(),current=resolveQuotes(records,snapshot.rows.map(r=>r.key));
   if(current.some((r,i)=>r.quote.text!==snapshot.rows[i].quote.text))throw new Error('所选原话已变化。请先下载当前文案，再关闭弹窗重新选择。');
   if(!snapshot.text.trim())throw new Error('先留下一点想分享的文字。');
   const story=planStory(snapshot.text,DEFAULT_OPTIONS,{target:0,cover:false,toc:'no',ending:'none'});
   story.pages=story.pages.map(page=>({...page,template:'quote'}));
   await saveStory(story,0);try{localStorage.setItem('shiye:studio:active',story.id);}catch{}
   setComposition(null);lock.current=false;navigationAllowed.current=true;location.href='/?view=studio&id='+encodeURIComponent(story.id);
  });
 }
 function closeComposition(){
  if(busy)return;
  if(composition&&composition.text!==quotesToSource(composition.rows)&&!confirm('关闭会丢弃这次修改的公开文案，原话收藏仍保留。需要时可先下载文案。'))return;
  setComposition(null);setError('');
 }
 const selectedHidden=selected.filter(key=>!shown.some(row=>row.key===key)).length;
 return <main className="journal-app next-studio has-main-nav quotes-app">
  <header className="journal-header"><button aria-label="返回我的" disabled={!!busy} onClick={()=>{location.href='/?view=mine';}}><ArrowLeft size={19}/></button><a href="/?view=mine" onClick={e=>{if(busy)e.preventDefault();}}>拾页<span>留住自己的声音</span></a><Quote size={23}/></header>
  <div className="journal-container quotes-container">
   <div className="journal-intro"><div><p>自己的句子，自己的声音</p><h1>原话簿</h1><span>{loading?'正在打开收藏…':rows.length+' 句原话 · 保存在本机'}</span></div><a className="journal-secondary" href="/?view=journal" onClick={e=>{if(busy)e.preventDefault();}}><BookOpen size={17}/>去随心记</a></div>
   <p className="quotes-lead">写过的话，值得再读。<br/>挑几句，继续写成自己的下一篇。</p>
   <label className="journal-search"><Search size={17}/><input aria-label="搜索原话" value={query} onChange={e=>setQuery(e.target.value)} placeholder="找一句话，或一个日期"/></label>
   <p className="quotes-help">在随心记中点“摘一句原话”即可收藏。修改原文后，收藏时的文字仍会保留。</p>
   {error&&!composition&&<div className="journal-error" role="alert">{error}<div className="journal-actions"><button disabled={!!busy} onClick={()=>void run('正在重新读取…',async()=>{await read();setLoading(false);setNotice('已重新读取本机原话。');})}>重新读取原话</button></div></div>}
   {notice&&<p className="journal-notice" role="status">{notice}</p>}
   {undo&&<button className="journal-text-button" disabled={!!busy} onClick={()=>void restore()}><RotateCcw size={15}/>撤销移除原话</button>}
   <section className="quotes-list" aria-label="收藏的原话">{shown.map(row=>{
    const chosen=selected.includes(row.key);
    return <article className={'quote-card'+(chosen?' is-selected':'')} data-testid="quote-card" key={row.key}>
     <div className="quote-card-top"><time>{row.quote.sourceDate}</time><button aria-label={'移除原话：'+row.quote.text} disabled={!!busy} onClick={()=>void remove(row)}><Trash2 size={16}/></button></div>
     <button className="quote-pick" aria-label={'选择原话：'+row.quote.text} aria-pressed={chosen} disabled={!!busy||!chosen&&selected.length>=9} onClick={()=>toggle(row.key)}>
      <span className="quote-mark" aria-hidden="true">“</span><p>{row.quote.text}</p><span className="quote-check">{chosen?<Check size={16}/>:<span/>}{chosen?'已选 '+(selected.indexOf(row.key)+1):'选择'}</span>
     </button>
     {row.sourceChanged&&<p className="quote-changed">原文后来有调整 · 这里保留收藏时的文字</p>}
     <a className="quote-source" aria-disabled={!!busy} onClick={e=>{if(busy)e.preventDefault();}} href={'/?view=journal&entry='+encodeURIComponent(row.entryId)}><span>回到原记录 · {row.entryTitle}</span><ArrowUpRight size={15}/></a>
    </article>;
   })}</section>
   {!loading&&!error&&!shown.length&&<div className="journal-empty"><Quote size={30}/><h2>{rows.length?'暂时没找到这句话':'先收藏一句自己的话'}</h2><p>{rows.length?'试试其他关键词，已选原话会保留。':'打开一篇随心记，点“摘一句原话”。那句让你停留的话，就从这里收好。'}</p>{!rows.length&&<a className="journal-secondary" href="/?view=journal">打开随心记</a>}</div>}
   <p className="quotes-help">原记录进回收站时，相关原话一起隐藏；恢复记录后重新可见。完整备份在“随心记 → 备份全部记录”，包含原话。</p>
  </div>
  <aside className="quotes-compose-bar" aria-label="原话创作"><div><strong>已选 {selected.length} / 9 句</strong><small>{selectedHidden?selectedHidden+' 句在当前搜索之外':'按选择顺序整理，可再修改文案'}</small></div><button className="journal-primary" disabled={!selected.length||!!busy||loading} onClick={()=>void begin()}>整理为新作品</button>{selected.length>0&&<button className="quotes-clear" disabled={!!busy} onClick={()=>setSelected([])}>清空选择</button>}</aside>
  {composition&&<Modal title="用自己的原话，接着写" onClose={closeComposition} wide>
   <p className="quotes-help">只带入你选中的 {composition.rows.length} 句。原记录全文、标签和照片留在私藏中；这里另存作品，不会自动发布。</p>
   <label className="quotes-field">想分享的文案<textarea aria-label="原话公开文案" rows={10} maxLength={20000} value={composition.text} disabled={!!busy} onChange={e=>setComposition({...composition,text:e.target.value})}/></label>
   <p className="quotes-help">可修改文字，用单独一行 --- 分页。默认使用引语卡，可在工作台换样式。原话簿里的收藏不会跟着改。</p>
   {error&&<p className="journal-error" role="alert">{error}</p>}
   <div className="journal-actions"><button className="journal-secondary" disabled={!!busy} onClick={()=>download(new Blob([composition.text],{type:'text/plain;charset=utf-8'}),'拾页-原话创作文案.txt')}><Download size={15}/>下载当前文案</button><button className="journal-primary" disabled={!!busy||!composition.text.trim()} onClick={()=>void create()}>{busy||'另存到创作工作台'}</button></div>
  </Modal>}
  <BottomNav active="mine" disabled={!!busy||!!composition}/>
 </main>;
}
