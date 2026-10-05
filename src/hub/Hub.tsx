import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ArrowUpRight,BookOpen,Camera,ChevronRight,Download,Feather,Layers,Leaf,RotateCcw} from 'lucide-react';
import {allStories,migrateLegacy,saveStory} from '../studio/database.ts';
import type {Story} from '../studio/model.ts';
import {listEntries,listMemories} from '../journal/database.ts';
import type {JournalEntry,MemoryAlbum} from '../journal/model.ts';
import {LOCAL_PROMPTS} from '../journal/companion.ts';
import {PaperSpirit} from '../journal/Xiaoshi.tsx';
import {TEMPLATES} from '../studio/templates.ts';
import type {TemplateId} from '../studio/templates.ts';
import {planStory} from '../studio/planner.ts';
import {DEFAULT_OPTIONS} from '../core/layout.ts';
import {createMeasure} from '../core/renderer.ts';
import {layoutStory} from '../studio/scene.ts';
import {ScenePreview} from '../studio/ScenePreview.tsx';
import {Modal} from '../components/Modal.tsx';
import {BottomNav} from './BottomNav.tsx';
import type {MainView} from './BottomNav.tsx';
import '../studio/studio.css';
import '../journal/journal.css';
import './hub.css';
const titleOf=(e:JournalEntry)=>e.text.trim().split('\n')[0].replace(/^#+\s*/,'').slice(0,70)||'用照片记下的一天';
function useCollection(){
 const [data,setData]=useState<{stories:Story[];entries:JournalEntry[];memories:MemoryAlbum[]}>({stories:[],entries:[],memories:[]}),[loading,setLoading]=useState(true),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);setError('');void migrateLegacy().then(()=>Promise.all([allStories(),listEntries(),listMemories()])).then(([stories,entries,memories])=>{if(active)setData({stories,entries:entries.sort((a,b)=>b.updatedAt-a.updatedAt),memories});}).catch(e=>{if(active)setError(e.message||'暂时无法读取本机内容。');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[attempt]);
 return {...data,loading,error,retry:useCallback(()=>setAttempt(n=>n+1),[])};
}
function HubHeader(){return <header className="hub-header"><a href="/" className="hub-brand"><Layers size={25}/><strong>拾页</strong></a><span>把生活，拾成一页</span><a href="/guide-v1.2.html" aria-label="打开使用指南">使用指南<ArrowUpRight size={14}/></a></header>;}
export default function Hub({view}:{view:Exclude<MainView,'studio'>}){
 return <div className="next-studio hub-app has-main-nav"><HubHeader/>{view==='templates'?<Templates/>:view==='mine'?<Mine/>:<Home/>}<BottomNav active={view}/></div>;
}
function ReadState({loading,error,retry}:{loading:boolean;error:string;retry:()=>void}){return loading?<p role="status" className="hub-note">正在读取本机积累…</p>:error?<div className="hub-read-error" role="alert"><p>{error}</p><button onClick={retry}><RotateCcw size={15}/>重新读取</button></div>:null;}
function Home(){
 const data=useCollection();const [prompt,setPrompt]=useState(()=>new Date().getDate()%LOCAL_PROMPTS.length);const recent=data.stories[0];
 return <main className="hub-main"><section className="hub-hero"><div><p className="hub-eyebrow">从属于你的细节开始</p><h1>让日常，长成<br/>自己的作品。</h1><p className="hub-lead">一个瞬间，一段原话，一次小小的发现。<br/>先留下来，再慢慢表达。</p><a className="hub-primary" href="/?view=journal&new=1"><Feather size={18}/>记下此刻<ArrowUpRight size={17}/></a></div><div className="hub-paper"><span>今日一页</span><PaperSpirit/><p>不必等到精彩，<br/>才值得记下。</p></div></section>
 <ReadState {...data}/>{!data.loading&&!data.error&&<section className="hub-section"><div className="hub-section-heading"><h2>接着上次，慢慢写</h2><a href="/?view=studio">创作工作台<ChevronRight size={15}/></a></div>{recent?<a className="hub-continue" href={'/?view=studio&id='+encodeURIComponent(recent.id)}><span className="hub-icon"><BookOpen size={25}/></span><div><small>继续创作 · {recent.pages.length} 个分镜</small><h3>{recent.title}</h3><p>{new Date(recent.updatedAt).toLocaleDateString('zh-CN')} 更新 · 本机作品</p></div><ArrowUpRight size={21}/></a>:<a className="hub-continue" href="/?view=templates"><span className="hub-icon"><Layers size={25}/></span><div><small>第一篇，从这里开始</small><h3>选个模板，写自己的故事</h3><p>12 种原创结构，可以换文字、配照片。</p></div><ArrowUpRight size={21}/></a>}</section>}
 <section className="hub-prompt"><div><span className="hub-eyebrow">本地灵感 · 不调用 AI</span><button aria-label="换一个灵感问题" onClick={()=>setPrompt(n=>(n+1)%LOCAL_PROMPTS.length)}><RotateCcw size={14}/>换一句</button></div><h2>{LOCAL_PROMPTS[prompt]}</h2><a href={'/?view=journal&new=1&prompt='+prompt}>带着这个问题记一笔<ArrowUpRight size={15}/></a></section>
 {!data.loading&&!data.error&&<section className="hub-section"><div className="hub-section-heading"><h2>最近留下的日常</h2><a href="/?view=journal">全部记录<ChevronRight size={15}/></a></div>{data.entries.length?<div className="hub-recent">{data.entries.slice(0,3).map(e=><a key={e.id} href={'/?view=journal&entry='+encodeURIComponent(e.id)}><time>{e.date.slice(5).replace('-',' / ')}</time><div><h3>{titleOf(e)}</h3><p>{e.assetIds.length?e.assetIds.length+' 张照片 · ':''}随心记</p></div><ChevronRight size={16}/></a>)}</div>:<p className="hub-empty">还没有记录。先写一句话，或留下一张照片。</p>}</section>}
 <a className="hub-memory" href="/?view=memories"><Camera size={27}/><div><h2>回头看，都是自己的光</h2><p>按周、月、年，把日常收成图文册或短片。</p></div><ArrowUpRight size={20}/></a><p className="hub-local-note">作品和记录保存在当前浏览器。记得在“我的”备份。</p></main>;
}
function Mine(){const data=useCollection();return <main className="hub-main hub-mine"><p className="hub-eyebrow">我的小小收藏室</p><h1>自己的积累，<br/>慢慢生长。</h1><ReadState {...data}/>{!data.loading&&!data.error&&<div className="hub-counts"><div><strong>{data.entries.length}</strong><span>页随心记</span></div><div><strong>{data.stories.length}</strong><span>篇作品</span></div><div><strong>{data.memories.length}</strong><span>本回忆</span></div></div>}
 <div className="hub-menu"><a href="/?view=sources"><Layers size={22}/><div><h2>来源与审核</h2><p>收好参考链接、自己的观察，核对出处与使用范围。</p></div><ChevronRight size={18}/></a><a href="/?view=journal#backup"><Feather size={22}/><div><h2>随心记与记录备份</h2><p>文字、照片、回收站，以及完整备份恢复。</p></div><ChevronRight size={18}/></a><a href="/?view=memories"><BookOpen size={22}/><div><h2>回忆册</h2><p>选材、确认图文，或生成一段回忆短片。</p></div><ChevronRight size={18}/></a><a href="/?view=studio#backup"><Download size={22}/><div><h2>作品与作品备份</h2><p>继续编辑，在工作台备份或恢复作品。</p></div><ChevronRight size={18}/></a></div>
 <section className="hub-storage"><Leaf size={20}/><div><h2>先收好，再安心创作</h2><p>当前为本机个人试用，尚未开通云同步。电脑与手机的浏览器各自保存内容；清理浏览器数据会移除本机记录。请定期下载备份到“文件”。</p><p>排版和记录可在本机完成；AI 与短片需要连接正在运行的电脑服务。离线功能以已缓存的页面为准。</p><a href="/guide-v1.2.html">查看手机操作指南<ArrowUpRight size={15}/></a></div></section><a className="hub-classic" href="/?classic=1">打开已保留的经典 v1<ArrowUpRight size={15}/></a></main>;}
const templateOptions={...DEFAULT_OPTIONS,theme:'forest' as const,series:'我的表达'};
function fromTemplate(id:TemplateId,text:string){const story=planStory(text,templateOptions,{target:0,cover:false,toc:'no',ending:'none'},createMeasure(templateOptions));return {...story,pages:story.pages.map(p=>({...p,template:id,diagram:'none' as const}))};}
function Templates(){
 const leaving=useRef(false);
 const [chosen,setChosen]=useState<TemplateId|null>(null),[text,setText]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const previews=useMemo(()=>TEMPLATES.map(t=>{const story=fromTemplate(t.id,t.sample);return {...t,scene:layoutStory(story,createMeasure(templateOptions))[0]};}),[]);
 const preview=useMemo(()=>{if(!chosen)return {story:null,scenes:[],error:''};try{const story=fromTemplate(chosen,text);return {story,scenes:layoutStory(story,createMeasure(templateOptions)),error:''};}catch(e){return {story:null,scenes:[],error:(e as Error).message};}},[chosen,text]);
 useEffect(()=>{const leave=(e:BeforeUnloadEvent)=>{if(!leaving.current&&(busy||chosen&&text!==TEMPLATES.find(t=>t.id===chosen)?.sample)){e.preventDefault();e.returnValue='';}};addEventListener('beforeunload',leave);return()=>removeEventListener('beforeunload',leave);},[chosen,text,busy]);
 async function create(){if(!preview.story||busy)return;setBusy(true);setError('');try{await saveStory(preview.story,0);try{localStorage.setItem('shiye:studio:active',preview.story.id);}catch{}leaving.current=true;location.href='/?view=studio&id='+encodeURIComponent(preview.story.id);}catch(e){setError((e as Error).message);setBusy(false);}}
 return <main className="hub-main"><p className="hub-eyebrow">模板广场 · 拾页原创</p><h1>给自己的故事，<br/>选一种表达。</h1><p className="hub-lead">12 种免费结构。示例只是起点，内容由你来写。</p><div className="hub-template-grid">{previews.map(t=><button className="hub-template" key={t.id} aria-label={'预览'+t.name} onClick={()=>{setChosen(t.id);setText(t.sample);setError('');}}><ScenePreview scene={t.scene} options={templateOptions}/><div><h2>{t.name}</h2><p>{t.hint}</p><ArrowUpRight size={17}/></div></button>)}</div><p className="hub-local-note">以上均为拾页原创结构。外部设计来源与授权审核将另行接入。</p>
 {chosen&&<Modal title={TEMPLATES.find(t=>t.id===chosen)!.name+' · 写自己的版本'} wide onClose={()=>{if(!busy&&(text===TEMPLATES.find(t=>t.id===chosen)!.sample||confirm('文字还没有另存为作品。关闭会丢弃这些修改，确定关闭吗？')))setChosen(null);}}><p className="hub-note">下方为示例文字，可以直接替换。另存会创建新作品，已有作品保留。照片可进入工作台后添加。</p><label className="next-field">模板里的文字<textarea aria-label="模板里的文字" rows={6} maxLength={20000} value={text} disabled={busy} onChange={e=>{setText(e.target.value);setError('');}}/></label>{(error||preview.error)&&<p role="alert" className="next-error">{error||preview.error}</p>}<button className="next-primary next-wide" disabled={busy||!text.trim()||!preview.story} onClick={()=>void create()}>{busy?'正在另存…':'另存为新作品'}</button><p className="hub-note">实际排版 · {preview.scenes.length} 页；长内容会自动续页。</p><div className="hub-template-preview">{preview.scenes.map(s=><ScenePreview key={s.id} scene={s} options={templateOptions}/>)}</div></Modal>}</main>;
}
