import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowUpRight,Check,Leaf,LockKeyhole,Stamp} from 'lucide-react';
import {BottomNav} from '../hub/BottomNav.tsx';
import {PaperSpirit} from './Xiaoshi.tsx';
import {useCompanion} from './useCompanion.ts';
import {APPEARANCES,KEEPSAKES,appearanceAvailable} from './companion-profile.ts';
import type {Appearance} from './companion-profile.ts';
import {saveAppearance} from './companion-store.ts';
import './journal.css';
import './companion.css';
export default function CompanionPage(){
 const data=useCompanion(0,false),[choice,setChoice]=useState<Appearance>('leaf'),[dirty,setDirty]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const writing=useRef(false),leaving=useRef(false);
 useEffect(()=>{if(data.profile&&!dirty)setChoice(data.profile.appearance);},[data.profile,dirty]);
 useEffect(()=>{const before=(e:BeforeUnloadEvent)=>{if(!leaving.current&&(writing.current||dirty)){e.preventDefault();e.returnValue='';}};addEventListener('beforeunload',before);return()=>removeEventListener('beforeunload',before);},[dirty]);
 function leave(href:string){if(writing.current)return;if(dirty&&!confirm('装扮预览尚未保存，离开会丢弃这次选择。确定离开吗？'))return;leaving.current=true;location.href=href;}
 function choose(value:Appearance){setChoice(value);setDirty(value!==data.profile?.appearance);setError('');setNotice('');}
 async function save(){
  if(writing.current||!data.profile)return;writing.current=true;setBusy(true);setError('');setNotice('');
  try{const saved=await saveAppearance(choice,data.profile.revision);data.setProfile(saved);setDirty(false);setNotice('小拾的新装扮已保存到本机。');}catch(e){setError((e as Error).message);}finally{writing.current=false;setBusy(false);}
 }
 async function reload(){
  if(writing.current||dirty&&!confirm('重新读取会丢弃尚未保存的装扮选择，确定继续吗？'))return;
  const profile=await data.refresh();if(profile){setChoice(profile.appearance);setDirty(false);setError('');setNotice('已读取本机最新的小拾资料。');}
 }
 return <main className="journal-app next-studio has-main-nav companion-page">
  <header className="journal-header"><button aria-label="返回我的" disabled={busy} onClick={()=>leave('/?view=mine')}><ArrowLeft size={19}/></button><a href="/?view=mine" onClick={e=>{e.preventDefault();leave('/?view=mine');}}>拾页<span>陪你慢慢留下日常</span></a><Leaf size={20}/></header>
  <div className="journal-container">
   <section className="companion-hero"><div><p>不用打卡，不用赶路</p><h1>小拾与成长</h1><span>你留下的每一点，<br/>我都认真收好。</span></div><PaperSpirit appearance={choice} mood="idle"/></section>
   <p className="journal-small">装扮和纪念来自本机保存的积累。没有连续签到要求，也不会因一段时间没来而退回。</p>
   {(error||data.error)&&<div className="journal-error" role="alert">{error||data.error}<div className="journal-actions"><button disabled={busy||data.loading} onClick={()=>void reload()}>重新读取小拾资料</button></div></div>}
   {data.loading&&<p className="journal-notice" role="status">正在核对已保存的积累…</p>}
   {notice&&<p className="journal-notice" role="status">{notice}</p>}
   <section className="companion-section"><div className="companion-heading"><h2>今天，换枚书签</h2><span>{dirty?'预览中 · 尚未保存':'当前装扮'}</span></div>
    <div className="companion-looks">{APPEARANCES.map(look=>{const available=!!data.profile&&appearanceAvailable(data.profile,look.id);return <button key={look.id} aria-label={'预览装扮：'+look.name} aria-pressed={choice===look.id} disabled={!available||busy||data.loading||!!data.error} onClick={()=>choose(look.id)}><PaperSpirit appearance={look.id} small/><strong>{look.name}</strong><small>{available?(choice===look.id?'已选择':'可以使用'):look.hint}</small>{!available?<LockKeyhole size={14}/>:choice===look.id?<Check size={15}/>:null}</button>;})}</div>
    <div className="journal-actions"><button className="journal-primary" disabled={!dirty||busy||data.loading||!!data.error} onClick={()=>void save()}>{busy?'正在保存装扮…':'保存装扮'}</button>{dirty&&<button className="journal-secondary" disabled={busy} onClick={()=>{setChoice(data.profile?.appearance||'leaf');setDirty(false);setError('');}}>撤销预览</button>}</div>
   </section>
   <section className="companion-section"><div className="companion-heading"><h2>一起收好的纪念</h2>{data.profile&&!data.error&&<span>{data.profile.earned.length} / {KEEPSAKES.length} 枚</span>}</div>
    <div className="companion-keepsakes">{KEEPSAKES.map(item=>{const earned=data.profile?.earned.includes(item.id);return <article className={earned?'earned':''} key={item.id} data-testid={'keepsake-'+item.id} data-earned={!!earned}><Stamp size={22}/><div><h3>{item.name}</h3><p>{item.hint}</p></div><span>{data.loading?'核对中':data.error?'未能读取':earned?'已收好':'慢慢来'}</span></article>;})}</div>
   </section>
   <a className="journal-memory-link" href="/?view=journal" onClick={e=>{e.preventDefault();leave('/?view=journal');}}><Leaf size={18}/><span>留下一点今天的细节<small>记一句话、收一张照片，或和小拾聊聊</small></span><ArrowUpRight size={17}/></a>
   <p className="journal-small">“随心记 → 备份全部记录”包含小拾资料；恢复时合并纪念，并保留本机已保存的装扮。仅恢复到空白设备时采用备份里的装扮。这里不会调用 AI，也没有额外费用。</p>
  </div><BottomNav active="mine" disabled={busy||data.loading} onNavigate={leave}/>
 </main>;
}
