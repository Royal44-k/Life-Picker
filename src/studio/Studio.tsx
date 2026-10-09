import {SplitWorksPanel} from './SplitWorksPanel.tsx';
import {saveSplitWorks} from './database.ts';
import {inspectLayout} from './diagnostics.ts';
import {LayoutChecks} from './LayoutChecks.tsx';
import {PURPOSES,purposeAdvice} from './purpose.ts';
import {SourceUpdatePanel} from './SourceUpdatePanel.tsx';
import {buildSourceUpdate} from './source-update.ts';
import {HistoryPanel} from './HistoryPanel.tsx';
import {restoreStoryHistory,checkpointStory,clearStoryHistory} from './database.ts';
import {SeriesAssignment} from '../series/SeriesAssignment.tsx';
import {PublicationEditor} from '../series/PublicationEditor.tsx';
import {listSeries,applySeriesToStory} from '../series/database.ts';
import type {PersonalSeries,Publication} from '../series/model.ts';
import {StoryMaterialCredits,StoryInspirationCredit} from '../sources/SourceCredits.tsx';
import {BottomNav} from '../hub/BottomNav.tsx';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Layers,Plus,ArrowLeft,ArrowRight,ArrowUp,ArrowDown,LockKeyhole,Unlock,Download,FolderOpen,Sparkles,Scissors,Trash2,RotateCcw,Check,BookOpen,Upload,ChevronRight,X} from 'lucide-react';
import type {Story,StoryPage,MediaAsset,Diagram,StorySettings} from './model.ts';
import {DEFAULT_SETTINGS,ROLE_NAMES,DIAGRAM_NAMES} from './model.ts';
import {planStory,editPage,movePage,rebuildStory,newPage,splitPage,mergePage,hashText} from './planner.ts';
import {layoutStory} from './scene.ts';
import {allStories,migrateLegacy,saveStory,listAssets,putAsset,getAsset,importStory,importStories} from './database.ts';
import {prepareAsset,loadImage} from './media.ts';
import {makeBundle,readBundle,validateStory,restoreIdentity} from './backup.ts';
import {storyZip,scenePng,confirmedScenes} from './render.ts';
import {ScenePreview} from './ScenePreview.tsx';
import {PageAI} from './PageAI.tsx';
import {applyPageSuggestion} from './page-ai.ts';
import {TemplateGallery} from './TemplateGallery.tsx';
import {TEMPLATES,applyTemplate} from './templates.ts';
import type {TemplateId} from './templates.ts';
import {MediaPanel} from './MediaPanel.tsx';
import {StoryboardAI} from './StoryboardAI.tsx';
import {DEFAULT_OPTIONS} from '../core/layout.ts';
import {createMeasure} from '../core/renderer.ts';
import {THEMES} from '../core/themes.ts';
import {download,safeName} from '../core/export.ts';
import {makeId} from '../core/storage.ts';
import {SAMPLE} from '../core/sample.ts';
import {Modal} from '../components/Modal.tsx';
import {AiPanel} from '../components/AiPanel.tsx';
import './studio.css';

let bootPromise:Promise<Story[]>|null=null;
function boot(){return bootPromise??=migrateLegacy().then(allStories).then(async rows=>{
 if(rows.length)return rows;
 const sample={...planStory(SAMPLE,DEFAULT_OPTIONS,DEFAULT_SETTINGS),id:'welcome-v1-1'};
 try{await saveStory(sample,0);}catch{/* Another tab may have saved the welcome story. */}
 return allStories();
});}
export default function Studio(){
 const [story,setStory]=useState<Story|null>(null),[stories,setStories]=useState<Story[]>([]),[assets,setAssets]=useState<MediaAsset[]>([]);
 const [splitSnapshot,setSplitSnapshot]=useState<Story|null>(null);
 const [tab,setTab]=useState('source'),[index,setIndex]=useState(0),[modal,setModal]=useState<'library'|'page'|'image'|'ai'|'storyboard'|'templates'|'pageAI'|'publication'|'history'|'sourceUpdate'|'checks'|'splitWorks'|null>(null);
 const [templateReturn,setTemplateReturn]=useState<'page'|null>(null);
 const [editId,setEditId]=useState(''),[saveStatus,setSaveStatus]=useState('正在读取本机作品…'),[error,setError]=useState(''),[toast,setToast]=useState(''),[busy,setBusy]=useState('');
 const [image,setImage]=useState<{url:string;blob:Blob;index:number;title:string}|null>(null),[imageBusy,setImageBusy]=useState(false),[canShare,setCanShare]=useState(false);
 const [undo,setUndo]=useState<Story[]>([]),[imageError,setImageError]=useState('');
 const revs=useRef(new Map<string,number>()),queue=useRef(Promise.resolve()),blocked=useRef(false),pending=useRef(false),sequence=useRef(0),currentId=useRef(''),imageTicket=useRef(0);
 const restoreInput=useRef<HTMLInputElement>(null),textInput=useRef<HTMLInputElement>(null);
 useEffect(()=>{let active=true;void boot().then(async rows=>{const photos=await listAssets(true);if(!active)return;setStories(rows);rows.forEach(s=>revs.current.set(s.id,s.revision));setAssets(photos);let id='';try{id=localStorage.getItem('shiye:studio:active')||'';}catch{}const requested=new URLSearchParams(location.search).get('id');const initial=rows.find(s=>s.id===(requested||id))||rows[0];setStory(initial);currentId.current=initial.id;setSaveStatus('已保存到本机');}).catch(e=>{if(active){setError(e.message);setSaveStatus('存储不可用');}});return()=>{active=false;};},[]);
 useEffect(()=>{if(!story)return;const url=new URL(location.href);url.searchParams.set('id',story.id);history.replaceState(null,'',url);try{localStorage.setItem('shiye:studio:active',story.id);}catch{}if(location.hash==='#publication'){setModal('publication');const clean=new URL(location.href);clean.hash='';history.replaceState(null,'',clean);}if(location.hash==='#backup')requestAnimationFrame(()=>document.getElementById('backup')?.scrollIntoView());},[story?.id]);
 useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),5000);return()=>clearTimeout(t);},[toast]);
 useEffect(()=>{const handler=(e:BeforeUnloadEvent)=>{if(pending.current||blocked.current){e.preventDefault();e.returnValue='';}};addEventListener('beforeunload',handler);return()=>removeEventListener('beforeunload',handler);},[saveStatus]);
 useEffect(()=>()=>{if(image)URL.revokeObjectURL(image.url);},[image]);
 const notify=(s:string)=>setToast(s);
 async function refreshPhotos(){setAssets(await listAssets(true));}
 async function beforePermanentDelete(){await queue.current;}
 function commit(next:Story,remember=false){
  try{validateStory(next);}catch(e){setError((e as Error).message);return false;}
  if(remember&&story)setUndo(old=>[...old.slice(-9),structuredClone(story)]);
  pending.current=true;next={...next,updatedAt:Date.now()};setStory(next);currentId.current=next.id;setStories(old=>[next,...old.filter(s=>s.id!==next.id)]);setSaveStatus('正在保存…');
  const ticket=++sequence.current;try{localStorage.setItem('shiye:studio:active',next.id);}catch{}
  queue.current=queue.current.then(async()=>{
   if(blocked.current)throw new Error('请先备份当前作品，再刷新以恢复保存。');
   const revision=await saveStory(next,revs.current.get(next.id)||0,remember);revs.current.set(next.id,revision);
   if(ticket===sequence.current){pending.current=false;setSaveStatus('已保存到本机');}
  }).catch(e=>{blocked.current=e.name!=='MissingAssetError';pending.current=true;setSaveStatus('修改尚未保存');setError(e.message||'保存失败，请先备份作品。');});
  return true;
 }
 async function leave(href:string){if(busy){setError('正在处理当前操作，请完成后再切换入口。');return;}await queue.current;if(pending.current||blocked.current){setError('修改尚未保存，请先重试保存或备份当前作品。');return;}location.href=href;}
 const attempt=(fn:()=>void)=>{try{fn();}catch(e){setError((e as Error).message);}};
 const layout=useMemo(()=>{if(!story)return {scenes:[],error:''};try{return {scenes:layoutStory(story,createMeasure(story.options)),error:''};}catch(e){return {scenes:[],error:(e as Error).message};}},[story]);
 const scenes=layout.scenes,scene=scenes[Math.min(index,Math.max(0,scenes.length-1))];
 const issues=useMemo(()=>story?inspectLayout(story,scenes,assets):[],[story,scenes,assets]);
 const page=story?.pages.find(p=>p.id===editId);
 const advice=page?purposeAdvice(page,story?.settings.purpose):undefined;
 const stale=!!story&&hashText(story.source)!==story.sourceHash;
 const warnings=Array.from(new Set([...(story?.warnings||[]).filter(w=>!/^完整内容需要.*超过目标/.test(w)),...scenes.flatMap(s=>s.warnings)]));
 function selectStory(s:Story){if(pending.current&&!blocked.current){setError('请等待保存完成，或先处理未保存提示后再切换作品。');return;}if(blocked.current){setError('当前有未保存修改，请先备份并刷新。');return;}setStory(s);currentId.current=s.id;setUndo([]);setIndex(0);setModal(null);try{localStorage.setItem('shiye:studio:active',s.id);}catch{}}
 function create(){if(blocked.current||pending.current)return;const next=planStory('',story?.options||DEFAULT_OPTIONS,DEFAULT_SETTINGS);commit(next);setUndo([]);setIndex(0);setTab('source');}
 function updatePage(change:Partial<StoryPage>){if(!story||!page)return;attempt(()=>commit(editPage(story,page.id,change)));}
 async function upload(files:FileList|null){
  if(!files?.length||!story)return;setBusy('正在整理照片…');try{if(files.length>10)throw new Error('每次最多添加 10 张照片。');const added:MediaAsset[]=[];for(const f of Array.from(files)){const a=await prepareAsset(f);await putAsset(a);added.push(a);}setAssets(old=>[...added,...old]);notify('照片已存本机，可选择放入页面。');}catch(e){setError((e as Error).message);setAssets(await listAssets(true));}finally{setBusy('');}
 }
 function useCover(asset:MediaAsset){if(!story)return;attempt(()=>{let next=story;let cover=next.pages.find(p=>p.role==='cover');if(!cover){cover=newPage(story.title,'cover');next={...next,pages:[cover,...next.pages]};}if(!commit(editPage(next,cover.id,{assetId:asset.id,layout:'photo'}),true))return;notify('封面照片已更新');});}
 async function backup(){if(!story)return;setBusy('正在打包原文、页面和照片…');try{download(await makeBundle(story,getAsset),safeName(story.title)+'-作品备份.zip');notify('备份包含页面修改和照片，可从“恢复备份”导入。');}catch(e){setError((e as Error).message);}finally{setBusy('');}}
 async function restore(file:File|undefined){
  if(!file)return;setBusy('正在检查备份…');try{
   if(file.size>55_000_000)throw new Error('备份超过 55 MB，请分批导入。');
   const data=readBundle(new Uint8Array(await file.arrayBuffer()));const mapping=new Map<string,string>();
   for(const a of data.assets){const img=await loadImage(a.blob);if(img.naturalWidth!==a.width||img.naturalHeight!==a.height)throw new Error('照片尺寸与备份记录不一致。');mapping.set(a.id,makeId());}
   const next=restoreIdentity(data.story,mapping);
   const photos=data.assets.map(a=>({...a,id:mapping.get(a.id)!}));await importStory(next,photos);revs.current.set(next.id,0);setAssets(await listAssets(true));setStories(old=>[next,...old]);selectStory(next);setTab('preview');notify('已恢复为新作品，原有作品保留。');
  }catch(e){setError((e as Error).message);}finally{setBusy('');if(restoreInput.current)restoreInput.current.value='';}
 }
 async function importText(files:FileList|null){
  if(!files?.length)return;setBusy('正在导入文字…');try{
   if(files.length>10)throw new Error('每次最多导入 10 篇。');
   const incoming:Story[]=[];for(const f of Array.from(files)){if(!/\.(md|markdown|txt)$/i.test(f.name)||f.size>80000)throw new Error('请选择不超过 80 KB 的 Markdown 或 TXT 文件。');const text=(await f.text()).replace(/^\uFEFF/,'');if(!text.trim())throw new Error(f.name+' 没有内容。');incoming.push(planStory(text,story?.options||DEFAULT_OPTIONS,DEFAULT_SETTINGS,createMeasure(story?.options||DEFAULT_OPTIONS)));}
   await importStories(incoming);for(const s of incoming){revs.current.set(s.id,1);s.revision=1;}
   setStories(old=>[...incoming,...old]);selectStory(incoming[0]);setTab('outline');notify('已导入 '+incoming.length+' 篇作品');
  }catch(e){setError((e as Error).message);}finally{setBusy('');if(textInput.current)textInput.current.value='';}
 }
 async function exportZip(){if(!story)return;setBusy('正在准备图片…');try{const blob=await storyZip(story,setBusy);download(blob,safeName(story.title)+'.zip');notify('整篇图片已导出，按文件名顺序发布即可。');}catch(e){setError((e as Error).message);}finally{setBusy('');}}
 async function previewImage(selected=index){
  if(!story)return;const ticket=++imageTicket.current;setModal('image');setImage(null);setImageBusy(true);setCanShare(false);setImageError('');
  try{
   const available=confirmedScenes(story),chosen=Math.max(0,Math.min(selected,available.length-1)),selectedScene=available[chosen];
   setIndex(chosen);const blob=await scenePng(selectedScene,story.options);if(imageTicket.current!==ticket)return;
   setImage({url:URL.createObjectURL(blob),blob,index:chosen,title:story.title});
   setCanShare(!!navigator.canShare?.({files:[new File([blob],'拾页.png',{type:'image/png'})]}));
  }catch(e){if(imageTicket.current===ticket){setImageError((e as Error).message);setError((e as Error).message);}}
  finally{if(imageTicket.current===ticket)setImageBusy(false);}
 }

 async function assignSeries(selected:PersonalSeries|null,appearance:boolean){if(!story)return;const stamp=sequence.current,id=story.id;setBusy('正在应用系列…');try{const current=selected?(await listSeries()).find(s=>s.id===selected.id):null;if(selected&&(!current||current.revision!==selected.revision))throw new Error('系列已更新或停用，请重新读取系列列表。');if(sequence.current!==stamp||currentId.current!==id)throw new Error('作品已发生变化，请核对当前内容后再应用。');if(blocked.current||pending.current)throw new Error('请先处理当前作品的未保存修改。');if(!commit(applySeriesToStory(story,current||null,appearance),true))throw new Error('系列设置尚未应用。');await queue.current;if(pending.current||blocked.current)throw new Error('系列设置尚未保存，请在工作台重试保存或备份。');setError('');}finally{setBusy('');}}
 async function savePublication(publication:Publication|undefined){if(!story)return;setBusy('正在保存回看…');setError('');try{await queue.current;blocked.current=false;const next={...story};if(publication)next.publication=publication;else delete next.publication;if(!commit(next))throw new Error('回看数据无效，输入仍保留。');await queue.current;if(pending.current||blocked.current)throw new Error('回看尚未保存，请重试；若另一窗口已更新，请先下载当前输入并刷新作品。');}finally{setBusy('');}}
 async function historyAction(action:(revision:number)=>Promise<void>){await queue.current;if(pending.current||blocked.current)throw new Error('请先处理未保存的修改，再操作历史。');await action(revs.current.get(story!.id)||0);}
 async function openHistory(){if(!story||busy)return;setBusy('正在读取历史…');try{await historyAction(async()=>{});setModal('history');}catch(e){setError((e as Error).message);}finally{setBusy('');}}
 async function restoreHistory(id:string){await historyAction(async revision=>{const restored=await restoreStoryHistory(story!.id,id,revision);revs.current.set(restored.id,restored.revision);setStory(restored);setStories(old=>[restored,...old.filter(s=>s.id!==restored.id)]);setUndo([]);setIndex(0);setModal(null);setTab('outline');setSaveStatus('已保存到本机');notify('已恢复历史版本，恢复前的作品仍在历史中。');});}
 async function openSplitWorks(){if(!story||busy)return;setBusy('正在检查当前作品…');try{await queue.current;if(pending.current||blocked.current)throw new Error('请先处理未保存的修改，再预览拆篇。');setSplitSnapshot(structuredClone({...story,revision:revs.current.get(story.id)||0}));setModal('splitWorks');}catch(e){setError((e as Error).message);}finally{setBusy('');}}
 async function createSplitWorks(drafts:Story[]){if(!splitSnapshot)throw new Error('请重新预览拆篇。');const saved=await saveSplitWorks(splitSnapshot.id,splitSnapshot.revision,drafts);saved.forEach(s=>revs.current.set(s.id,s.revision));setStories(old=>[...saved,...old]);selectStory(saved[0]);setTab('outline');notify('已另存 '+saved.length+' 篇作品，原作品完整保留。');}
 async function confirmAiReviewed(){if(!story||busy)return;setBusy('正在保存核对确认…');try{await queue.current;if(pending.current||blocked.current)throw new Error('请先处理未保存的修改。');if(!commit({...story,aiReviewed:true},true))throw new Error('核对状态尚未保存。');await queue.current;if(pending.current||blocked.current)throw new Error('核对状态尚未保存，请重试保存。');notify('已记录你的核对确认');}catch(e){setError((e as Error).message);}finally{setBusy('');}}
 function close(){setModal(null);imageTicket.current++;setImage(null);}
 if(!story)return <main className="next-studio loading"><Layers/><h1>拾页</h1><p>{error||'正在打开你的创作空间…'}</p><a href="?classic=1">打开经典工作台</a></main>;
 return <div className="next-studio has-main-nav">
  <header className="next-header"><a href="#" onClick={e=>e.preventDefault()} className="next-brand"><span><Layers size={23}/></span><strong>拾页</strong><small>创作工作台 <b>1.7.0</b></small></a><div className="next-header-actions"><a href="?classic=1" onClick={e=>{e.preventDefault();void leave('?classic=1');}}>经典版</a><button onClick={()=>setModal('library')} disabled={!!busy}><FolderOpen size={17}/><span>作品库</span></button></div></header>
  <main className="next-main">
   <div className="next-intro"><div><p className="next-eyebrow">留住自己的细节 · 写出自己的表达</p><h1>把经历，编成作品。</h1><p className="next-subtitle">从一段文字、一张照片，开始这一次分享。</p></div><button className="next-new" onClick={create} disabled={!!busy||blocked.current||pending.current}><Plus size={18}/><span>新建作品</span></button></div>
   <div className="next-work-title"><span className="next-document"><BookOpen size={17}/>{story.title}</span><span className={'next-save '+(blocked.current?'bad':'')}><Check size={13}/>{saveStatus}</span>{saveStatus==='修改尚未保存'&&<button className="next-save-retry" onClick={()=>{blocked.current=false;commit(story);}}>重试保存</button>}</div>
   {error&&<div role="alert" className="next-error">{error}<button aria-label="关闭提示" onClick={()=>setError('')}><X size={15}/></button></div>}
   {stale&&<div className="next-notice">原文已修改。点“生成分镜”后，再检查和导出最新页面。</div>}
   <button className="next-publication-entry" disabled={!!busy||!story.pages.length} onClick={()=>setModal('checks')}>排版检查 · {issues.length} 项</button>
   <button className="next-publication-entry" disabled={!!busy} onClick={()=>setModal('publication')}>发布与回看</button><div className="next-workspace">
    <section className="next-edit-panel">
     <div className="next-tabs" role="tablist" aria-label="作品编辑步骤">{[['source','原文'],['media','素材'],['outline','分镜'],['style','样式'],['preview','预览']].map(([id,name])=><button key={id} role="tab" aria-selected={tab===id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{name}</button>)}</div>
     {tab==='source'&&<div className="next-panel-body"><div className="next-section-title"><h2>写下你的内容</h2><button onClick={()=>textInput.current?.click()}><Upload size={15}/>导入文字</button></div>
      <textarea className="next-source" aria-label="作品原文" value={story.source} maxLength={20000} onChange={e=>commit({...story,source:e.target.value})} placeholder={'# 一个想分享的主题\n\n写下你的经历、观点或 Markdown。\n\n## 一个具体的发现\n\n也可以先上传照片，再慢慢补充文字。'}/>
      <StoryInspirationCredit origin={story.inspiration}/><StoryMaterialCredits assets={assets.filter(a=>story.pages.some(p=>p.assetId===a.id))}/><div className="next-source-meta"><span>{story.source.length.toLocaleString()} / 20,000 字符</span><button onClick={()=>setModal('ai')}><Sparkles size={14}/>AI 润色 / 写文案</button></div>
      <label className="next-field">创作目的<select aria-label="创作目的" value={story.settings.purpose||'knowledge'} onChange={e=>commit({...story,settings:{...story.settings,purpose:e.target.value as StorySettings['purpose']}})}>{Object.entries(PURPOSES).map(([key,value])=><option key={key} value={key}>{value.name}</option>)}</select></label><p className="next-hint">{PURPOSES[story.settings.purpose||'knowledge'].hint} 设置影响 AI 建议与模板推荐；已有页面由你确认后调整。</p>
      <div className="next-plan-settings"><label>目标篇幅<select aria-label="目标篇幅" value={story.settings.target} onChange={e=>commit({...story,settings:{...story.settings,target:Number(e.target.value) as StorySettings['target']}})}><option value={0}>自动 · 保留完整内容</option><option value={6}>尽量 6 页</option><option value={9}>尽量 9 页</option></select></label><label>结尾方式<select value={story.settings.ending} onChange={e=>commit({...story,settings:{...story.settings,ending:e.target.value as StorySettings['ending']}})}><option value="none">自然结束</option><option value="question">邀请交流</option><option value="collect">提示收藏</option><option value="follow">关注引导</option></select></label></div>
      <div className="next-checks"><label><input type="checkbox" checked={story.settings.cover} onChange={e=>commit({...story,settings:{...story.settings,cover:e.target.checked}})}/>生成独立封面</label><label>目录<select aria-label="目录设置" value={story.settings.toc||'auto'} onChange={e=>commit({...story,settings:{...story.settings,toc:e.target.value as StorySettings['toc']}})}><option value="auto">按内容建议</option><option value="yes">添加目录</option><option value="no">不添加</option></select></label></div>
      <button className="next-primary next-wide" disabled={(!story.source.trim()&&!story.pages.length)||!!busy} onClick={()=>attempt(()=>{if(story.pages.length){buildSourceUpdate(story,createMeasure(story.options));setModal('sourceUpdate');return;}if(!commit(rebuildStory(story,story.source,createMeasure(story.options)),true))return;setIndex(0);setTab('outline');notify('已完整编排，先看看每一页。');})}><Layers size={17}/>生成分镜</button><p className="next-hint">原文排版在本机完成。已有页面先检查受影响内容，再选择更新或保留；内容过多时增加续页。</p><button className="next-secondary next-wide" disabled={!story.source.trim()||!!busy} onClick={()=>setModal('storyboard')}><Sparkles size={16}/>AI 编辑成篇 · 先看建议</button>
     </div>}
     {tab==='media'&&<MediaPanel assets={assets} story={story} busy={busy} onUpload={upload} onUseCover={useCover} onRefresh={refreshPhotos} beforePermanentDelete={beforePermanentDelete} onError={setError} notify={notify}/>}
     {tab==='outline'&&<div className="next-panel-body"><div className="next-section-title"><h2>每一页，都有重点</h2><span>{story.pages.length} 个分镜 / {scenes.length} 张图片</span></div><div className="next-outline">{story.pages.map((p,i)=>{const first=scenes.find(s=>s.id===p.id);return <article className="next-outline-row" key={p.id}><button className="next-thumb-button" aria-label={'编辑第 '+(i+1)+' 页'} onClick={()=>{setEditId(p.id);setModal('page');}}>{first&&<ScenePreview scene={first} options={story.options} small/>}</button><div className="next-page-info"><span>{String(i+1).padStart(2,'0')} · {ROLE_NAMES[p.role]} {p.locked&&<LockKeyhole size={12}/>}</span><button onClick={()=>{setEditId(p.id);setModal('page');}}>{p.source.replace(/^#+\s*/,'').split('\n')[0]||'照片页'}</button><small>{p.assetId?'含照片 · ':''}{DIAGRAM_NAMES[p.diagram]}</small><div className="next-page-tools"><button aria-label={'保存分镜 '+(i+1)+' 的图片'} disabled={!first||stale||!!busy} onClick={()=>void previewImage(scenes.findIndex(s=>s.id===p.id))}><Download size={15}/></button><button aria-label={'上移第 '+(i+1)+' 页'} disabled={i===0} onClick={()=>commit(movePage(story,p.id,-1),true)}><ArrowUp size={15}/></button><button aria-label={'下移第 '+(i+1)+' 页'} disabled={i===story.pages.length-1} onClick={()=>commit(movePage(story,p.id,1),true)}><ArrowDown size={15}/></button><button aria-label={'删除第 '+(i+1)+' 页'} disabled={p.locked} onClick={()=>{if(confirm('删除这个分镜？原文仍保留，可以撤销。'))commit({...story,pages:story.pages.filter(x=>x.id!==p.id)},true);}}><Trash2 size={15}/></button></div></div><ChevronRight size={16}/></article>;})}</div>
      <button className="next-secondary next-wide" disabled={!!busy||!story.pages.length} onClick={()=>void openSplitWorks()}>拆成多篇 · 先看预览</button>
      <button className="next-secondary next-wide" disabled={story.pages.length>=60} onClick={()=>{const p=newPage('## 新的一页\n\n在这里补充内容。');if(!commit({...story,pages:[...story.pages,p]},true))return;setEditId(p.id);setModal('page');}}><Plus size={16}/>添加一页</button>
      {!!undo.length&&<button className="next-text-action" onClick={()=>{const old=undo.at(-1)!;setUndo(prev=>prev.slice(0,-1));commit(old);}}><RotateCcw size={15}/>撤销上一步</button>}
     </div>}
     {tab==='style'&&<div className="next-panel-body"><SeriesAssignment key={story.id} story={story} onApply={assignSeries} onManage={()=>leave('/?view=series')}/><div className="next-section-title"><h2>让整篇保持一致</h2><span>换样式无需调用 AI</span></div><button className="next-secondary next-wide" disabled={!story.pages.length} onClick={()=>{setEditId(scene?.pageId||story.pages[0].id);setTemplateReturn(null);setModal('templates');}}>选择结构模板 · 12 种</button><p className="next-hint">先选分镜，再预览套用后的真实内容。</p><div className="next-themes">{THEMES.map(t=><button key={t.id} aria-label={'选择'+t.name+'主题'} className={story.options.theme===t.id?'selected':''} onClick={()=>commit({...story,options:{...story.options,theme:t.id,accent:''}},true)}><div style={{background:t.paper,color:t.accent}}><span>拾</span><i style={{background:t.wash}}/><i style={{background:t.wash}}/></div><strong>{t.name}</strong><small>{t.description}</small></button>)}</div>
      <label className="next-field">图片比例<select aria-label="图片比例" value={story.options.ratio} onChange={e=>commit({...story,options:{...story.options,ratio:e.target.value as Story['options']['ratio']}},true)}><option value="portrait">3:4 · 图文笔记</option><option value="square">1:1 · 方形卡片</option><option value="story">9:16 · 竖屏故事</option></select></label>
      <label className="next-field">正文大小 · {Math.round(story.options.fontScale*100)}%<input aria-label="正文大小" type="range" min="90" max="120" step="5" value={Math.round(story.options.fontScale*100)} onChange={e=>commit({...story,options:{...story.options,fontScale:Number(e.target.value)/100}})}/></label>
      <label className="next-field">账号署名<input value={story.options.author} maxLength={32} onChange={e=>commit({...story,options:{...story.options,author:e.target.value}})}/></label><label className="next-field">系列名称<input value={story.options.series} maxLength={40} onChange={e=>commit({...story,options:{...story.options,series:e.target.value}})}/></label><label className="next-field">强调色<input type="color" value={story.options.accent||THEMES.find(t=>t.id===story.options.theme)!.accent} onChange={e=>commit({...story,options:{...story.options,accent:e.target.value}})}/></label>
     </div>}
     {tab==='preview'&&<div className="next-mobile-preview"><Preview/></div>}
     {!!warnings.length&&<details className="next-warnings"><summary>排版提示 · {warnings.length}</summary>{warnings.map(w=><p key={w}>{w}</p>)}</details>}
    </section>
    <aside className="next-desktop-preview"><Preview/></aside>
   </div>
   <div className="next-bottom"><div><strong>{scenes.length} 张图片</strong><span>{scenes.length?'当前第 '+(Math.min(index,scenes.length-1)+1)+' 张，可选页保存':'原文和页面分别保留'}</span></div><button className="next-secondary" disabled={!!busy||!scene||stale} onClick={()=>void previewImage()}>保存单图</button><button className="next-primary" disabled={!!busy||!scenes.length||stale} onClick={()=>void exportZip()}><Download size={16}/>整篇 ZIP</button></div>
   <div id="backup" className="next-utilities"><button disabled={!!busy} onClick={()=>void openHistory()}>作品历史</button><a href="/?view=journal" onClick={e=>{e.preventDefault();void leave('/?view=journal');}}>随心记</a><button onClick={()=>void backup()} disabled={!!busy}>备份作品</button><button onClick={()=>restoreInput.current?.click()} disabled={!!busy||blocked.current}>恢复备份</button><a href="/guide-v1.7.html" target="_blank" rel="noreferrer">使用指南</a><span>v1 已保留 · 作品只存本机</span></div>
  </main>
  <input hidden aria-label="选择作品备份" ref={restoreInput} type="file" accept=".zip" onChange={e=>void restore(e.target.files?.[0])}/><input hidden aria-label="选择文字文件" ref={textInput} type="file" multiple accept=".md,.markdown,.txt" onChange={e=>void importText(e.target.files)}/>
  {toast&&<div className="toast" role="status">{toast}</div>}{busy&&<div className="busy-overlay" role="status">{busy}</div>}
  {modal==='splitWorks'&&splitSnapshot&&<SplitWorksPanel story={splitSnapshot} onClose={close} onSave={createSplitWorks}/>}
  {modal==='checks'&&<LayoutChecks issues={issues} onClose={close} onPage={(id,at)=>{setEditId(id);if(at!==undefined)setIndex(at);setModal('page');}} onSource={()=>{close();setTab('source');}} onReviewed={()=>void confirmAiReviewed()} error={error} onSplit={()=>void openSplitWorks()} onAuto={()=>commit({...story,settings:{...story.settings,target:0}},true)} onAI={()=>setModal('storyboard')}/>}
  {modal==='publication'&&<PublicationEditor value={story.publication} onSave={savePublication} onClose={close}/>}
  {modal==='library'&&<Modal title="我的作品" onClose={close} wide><p className="next-hint">经典版草稿已复制到这里，原有草稿仍保留。作品保存在当前设备。</p><div className="next-library">{stories.map(s=><button key={s.id} onClick={()=>selectStory(s)}><BookOpen size={18}/><span><strong>{s.title}</strong><small>{s.pages.length} 个分镜 · {new Date(s.updatedAt).toLocaleDateString('zh-CN')}</small></span><ChevronRight size={17}/></button>)}</div></Modal>}
  {modal==='page'&&page&&<Modal title={'编辑'+ROLE_NAMES[page.role]} onClose={close} wide>
   <div className="next-dialog-top"><span>原文保持不变 · {saveStatus}</span><button className="next-secondary" onClick={()=>updatePage({locked:!page.locked})}>{page.locked?<Unlock size={15}/>:<LockKeyhole size={15}/>} {page.locked?'解锁本页':'锁定本页'}</button></div>
   {error&&<p className="next-error" role="alert">{error}</p>}{saveStatus==='修改尚未保存'&&<button className="next-secondary" onClick={()=>{blocked.current=false;commit(story);}}>重试保存</button>}
   <button className="next-text-action" disabled={page.locked||!!page.tocEntries} onClick={()=>{setTemplateReturn('page');setModal('templates');}}>更换本页模板 · {TEMPLATES.find(t=>t.id===page.template)?.name||'默认文字卡'}</button>
<button className="next-text-action" disabled={page.locked||!!page.tocEntries||!page.source.trim()} onClick={()=>setModal('pageAI')}><Sparkles size={15}/>AI 只改这一页 · 先看建议</button>
   {advice?.reason&&<div className="next-notice"><p>用途建议 · {PURPOSES[story.settings.purpose||'knowledge'].name}</p><p>{advice.reason}</p>{advice.template&&advice.template!==page.template&&<button className="next-secondary" disabled={page.locked||!!page.tocEntries} onClick={()=>attempt(()=>commit(applyTemplate(story,page.id,advice.template),true))}>试用推荐模板 · {TEMPLATES.find(t=>t.id===advice.template)?.name}</button>}</div>}
   <label className="next-field">本页文字<textarea aria-label="本页文字" rows={7} value={page.source} disabled={page.locked} onChange={e=>updatePage({source:e.target.value})}/></label>
   <label className="next-field">表达结构<select aria-label="表达结构" disabled={page.locked} value={page.diagram} onChange={e=>updatePage({template:undefined,diagram:e.target.value as Diagram,role:e.target.value==='none'?'body':'diagram'})}>{Object.entries(DIAGRAM_NAMES).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label><p className="next-hint">图解每一项用独立段落或列表项表示。金字塔用于有明确层级的 3～5 项内容。</p>
   <label className="next-field">搭配照片<select aria-label="搭配照片" disabled={page.locked} value={page.assetId||''} onChange={e=>updatePage({assetId:e.target.value||undefined})}><option value="">不放照片</option>{page.assetId&&!assets.some(a=>a.id===page.assetId)&&<option value={page.assetId} disabled>照片已移除，请重新选择</option>}{assets.filter(a=>!a.trashedAt||a.id===page.assetId).map(a=><option key={a.id} value={a.id}>{a.name}{a.trashedAt?'（回收站）':''}</option>)}</select></label>
   {page.assetId&&<><label className="next-field">照片显示<select disabled={page.locked} value={page.fit} onChange={e=>updatePage({fit:e.target.value as 'cover'|'contain'})}><option value="cover">填满画面</option><option value="contain">显示完整照片</option></select></label><label className="next-field">左右取景<input disabled={page.locked} type="range" min="0" max="100" value={page.focusX*100} onChange={e=>updatePage({focusX:Number(e.target.value)/100})}/></label><label className="next-field">上下取景<input disabled={page.locked} type="range" min="0" max="100" value={page.focusY*100} onChange={e=>updatePage({focusY:Number(e.target.value)/100})}/></label></>}
   {page.retainedFromPrevious&&<p className="next-notice">本页已确认保留旧表达，与当前原文分开；不会把旧位置当作新来源。</p>}<details className="next-source-proof"><summary>查看这页对应的原文</summary>{page.sourceRanges?.length?<>{page.sourceVersion!==hashText(story.source)?<p role="status">原文已变化，下面的旧位置暂不可用。重新生成分镜后再查看；本页文字仍保留。</p>:page.sourceRanges.map((r,i)=><blockquote key={i}>{story.source.slice(r.start,r.end)}</blockquote>)}</>:<p>此页为手工或派生页面，没有可核对的原文位置。可在原文面板查看全文。</p>}</details>
   <div className="next-dialog-actions"><button className="next-secondary" disabled={page.locked} onClick={()=>attempt(()=>{const next=splitPage(story,page.id,createMeasure(story.options));if(next===story){notify('本页能完整放下，无需拆分。');return;}if(!commit(next,true))return;notify('已拆为续页');})}><Scissors size={15}/>拆为续页</button><button className="next-secondary" disabled={page.locked||story.pages.findIndex(p=>p.id===page.id)===story.pages.length-1} onClick={()=>attempt(()=>{commit(mergePage(story,page.id),true);})}>合并下一页</button><button className="next-primary" onClick={()=>void queue.current.then(()=>{if(!pending.current&&!blocked.current)close();else setError('修改尚未保存，请先处理提示或重试保存。');})}>保存并关闭</button></div>
  </Modal>}
  {modal==='pageAI'&&page&&<PageAI story={story} page={page} onClose={()=>setModal('page')} onApply={result=>{try{if(!commit({...applyPageSuggestion(story,page.id,result),aiReviewed:false},true))return false;notify('单页建议已应用，可撤销；原文保留。');return true;}catch(e){setError((e as Error).message);return false;}}}/>}
  {modal==='templates'&&<TemplateGallery story={story} initialId={editId} onClose={()=>setModal(templateReturn)} onApply={(id,template:TemplateId)=>{try{const next=applyTemplate(story,id,template);if(!commit(next,true))return false;notify('模板已应用，文字与照片保留。');return true;}catch(e){setError((e as Error).message);return false;}}}/>}
  {modal==='image'&&<Modal title="保存到手机相册" onClose={close}>
   <label className="next-field">选择要保存的图片<select aria-label="选择要保存的图片" value={Math.min(index,Math.max(0,scenes.length-1))} onChange={e=>void previewImage(Number(e.target.value))}>{scenes.map((s,i)=><option key={s.id} value={i}>第 {i+1} 张 · {ROLE_NAMES[s.role]}</option>)}</select></label>
   <div className="next-image-picker"><button className="next-secondary" aria-label="保存上一张图片" disabled={index<=0} onClick={()=>void previewImage(index-1)}><ArrowLeft size={16}/>上一张</button><span>第 {index+1} / {scenes.length} 张</span><button className="next-secondary" aria-label="保存下一张图片" disabled={index>=scenes.length-1} onClick={()=>void previewImage(index+1)}>下一张<ArrowRight size={16}/></button></div>
   <p className="next-hint">确认页数后，长按下方图片存储到“照片”，或下载当前这一张 PNG。</p>
   {imageBusy?<p role="status">正在生成第 {index+1} 张高清图片…</p>:image?<><img className="save-image" src={image.url} alt={'可长按保存的第 '+(image.index+1)+' 张图片'}/><div className="next-dialog-actions"><button className="next-secondary" onClick={()=>download(image.blob,safeName(image.title)+'-'+String(image.index+1).padStart(2,'0')+'.png')}>下载 PNG</button>{canShare&&<button className="next-primary" onClick={()=>void navigator.share({files:[new File([image.blob],'拾页-'+(image.index+1)+'.png',{type:'image/png'})]}).catch(e=>{if(e.name!=='AbortError')notify('请改用长按图片保存。');})}>系统分享</button>}</div></>:<p role="alert">{imageError||'未能生成图片，请选择其他页或关闭后重试。'}</p>}
  </Modal>}

  {modal==='sourceUpdate'&&<SourceUpdatePanel story={story} onClose={close} onApply={async next=>{await queue.current;if(pending.current||blocked.current)throw new Error('请先处理未保存的修改。');if(!commit(next,true))throw new Error('页面更新无效，当前内容保留。');await queue.current;if(pending.current||blocked.current)throw new Error('更新尚未保存，请备份当前作品后重试。');close();setIndex(0);setTab('outline');notify('已按你的选择更新页面，旧版本已保留到历史。');}}/>}
  {modal==='history'&&<HistoryPanel story={story} onClose={close} onRestore={restoreHistory} onCheckpoint={()=>historyAction(r=>checkpointStory(story.id,r))} onClear={()=>historyAction(r=>clearStoryHistory(story.id,r))} onBackup={async old=>{download(await makeBundle(old,getAsset),safeName(old.title)+'-版本'+old.revision+'.zip');}}/>}
  {modal==='storyboard'&&<StoryboardAI story={story} onClose={close} onApply={pages=>attempt(()=>{const next=planStory(story.source,story.options,story.settings,createMeasure(story.options));const cover=story.pages.find(p=>p.role==='cover'&&p.assetId);if(cover&&pages[0]?.role==='cover')pages[0]={...pages[0],assetId:cover.assetId,fit:cover.fit,focusX:cover.focusX,focusY:cover.focusY};next.pages=pages;next.aiReviewed=false;next.warnings=['AI 已编辑表达，请核对事实；原作品在作品库中保留。'];if(!commit({...next,series:story.series,inspiration:story.inspiration}))return;setUndo([]);close();setIndex(0);setTab('outline');notify('AI 分镜已另存为新作品');})}/>}
  {modal==='ai'&&<AiPanel initialTone={story.series?.tone} initialTopic={story.series?.topic?'本系列关注：'+story.series.topic:''} source={story.source} onClose={close} notify={notify} onApply={text=>attempt(()=>{const next=planStory(text,story.options,story.settings,createMeasure(story.options));next.aiReviewed=false;if(!commit({...next,series:story.series,inspiration:story.inspiration}))return;setUndo([]);close();setTab('outline');notify('已生成新作品，原文作品仍在作品库。');})}/>}
  <BottomNav active="studio" onNavigate={leave} disabled={!!busy||!!modal}/>
 </div>;
 function Preview(){return <div className="next-preview-body"><div className="next-section-title"><h2>作品预览</h2><span>1080px · {story!.options.ratio==='portrait'?'3:4':story!.options.ratio==='square'?'1:1':'9:16'}</span></div>{scene?<><ScenePreview scene={scene} options={story!.options}/><div className="next-preview-nav"><button aria-label="上一张" disabled={index===0} onClick={()=>setIndex(i=>Math.max(0,i-1))}><ArrowLeft size={18}/></button><span>{scene.index+1} / {scenes.length}</span><button aria-label="下一张" disabled={index>=scenes.length-1} onClick={()=>setIndex(i=>i+1)}><ArrowRight size={18}/></button></div><div className="next-preview-strip">{scenes.map((s,i)=><button className={s.index===scene.index?'selected':''} key={s.id} aria-label={'预览第 '+(i+1)+' 张'} onClick={()=>setIndex(i)}>{i+1}</button>)}</div></>:<div className="next-preview-empty"><Layers size={36}/><h3>{layout.error?'需要调整内容':'给好内容，一个出口'}</h3><p>{layout.error||'写下原文并生成分镜，作品就会出现在这里。'}</p></div>}<p className="next-hint">预览与导出使用同一份页面。{stale?'原文变化尚未编排。':''}</p></div>;}
}
