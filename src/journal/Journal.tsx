import {BottomNav} from '../hub/BottomNav.tsx';
import {LOCAL_PROMPTS} from './companion.ts';
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,Plus,Search,Heart,Trash2,ImagePlus,X,Download,BookOpen,RotateCcw,PenLine,ArrowUpRight,Archive} from 'lucide-react';
import {Modal} from '../components/Modal.tsx';
import {AssetThumb} from '../studio/MediaPanel.tsx';
import {getAsset,listAssets,putAsset,saveStory} from '../studio/database.ts';
import {prepareAsset} from '../studio/media.ts';
import type {MediaAsset} from '../studio/model.ts';
import {DEFAULT_OPTIONS} from '../core/layout.ts';
import {download} from '../core/export.ts';
import {newEntry,entryToStory} from './model.ts';
import type {JournalEntry} from './model.ts';
import {listEntries,listMemories,trashEntry,restoreEntry,deleteEntryPermanently,importJournalData} from './database.ts';
import {makeJournalBundle,readJournalBundle,restoreJournalIdentity} from './backup.ts';
import {useEntryDraft} from './useEntryDraft.ts';
import {Xiaoshi} from './Xiaoshi.tsx';
import {XiaoshiChat} from './XiaoshiChat.tsx';
import type {ChatMessage} from './XiaoshiChat.tsx';
import {saveReward} from './companion.ts';
import {saveEntry} from './database.ts';
import './journal.css';
export function today(){const date=new Date();return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');}
export const entryTitle=(e:JournalEntry)=>e.text.trim().split('\n')[0].replace(/^#+\s*/,'').slice(0,80)||'用照片记下的一天';
export default function Journal(){
 const [entries,setEntries]=useState<JournalEntry[]>([]),[assets,setAssets]=useState<MediaAsset[]>([]),[query,setQuery]=useState(''),[tag,setTag]=useState(''),[starred,setStarred]=useState(false);
 const [busy,setBusy]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[modal,setModal]=useState<'trash'|'photos'|'publish'|'chat'|null>(null);
 const [reward,setReward]=useState<ReturnType<typeof saveReward>>(null),[chatMessages,setChatMessages]=useState<ChatMessage[]>([]);
 const [tags,setTags]=useState(''),[undo,setUndo]=useState<{id:string;revision:number}|null>(null),[photoUndo,setPhotoUndo]=useState<{id:string;entryId:string;index:number}|null>(null);
 const [publicText,setPublicText]=useState(''),[publicPhotos,setPublicPhotos]=useState<string[]>([]);const restoreInput=useRef<HTMLInputElement>(null);
 const edit=useEntryDraft(saved=>setEntries(old=>[saved,...old.filter(e=>e.id!==saved.id)]));const {draft}=edit;
 const active=entries.filter(e=>!e.trashedAt).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt);
 const shown=active.filter(e=>(!starred||e.starred)&&(!tag||e.tags.includes(tag))&&(!query.trim()||[e.text,e.date,...e.tags].join(' ').toLowerCase().includes(query.trim().toLowerCase())));
 useEffect(()=>{window.scrollTo({top:0,behavior:'instant'});},[draft?.id]);
 useEffect(()=>{if(!draft?.revision)return;const url=new URL(location.href);url.searchParams.delete('new');url.searchParams.delete('prompt');url.searchParams.set('entry',draft.id);history.replaceState(null,'',url);},[draft?.id,draft?.revision]);
 const allTags=[...new Set(active.flatMap(e=>e.tags))].sort();
 async function refresh(){const [records,photos]=await Promise.all([listEntries(true),listAssets(true)]);setEntries(records);setAssets(photos);}
 useEffect(()=>{let active=true;void Promise.all([listEntries(true),listAssets(true)]).then(async([records,photos])=>{if(!active)return;setEntries(records);setAssets(photos);const query=new URLSearchParams(location.search),id=query.get('entry');const entry=id?records.find(e=>e.id===id&&!e.trashedAt):query.has('new')?newEntry(today()):null;if(entry){await start(entry);const raw=query.get('prompt'),prompt=raw!==null?LOCAL_PROMPTS[Number(raw)]:undefined;if(prompt)setNotice('小拾的灵感问题：'+prompt);}else if(id)setError('这条记录已移除，其他本机记录仍可打开。');}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[]);
 async function start(entry:JournalEntry){if(await edit.open(structuredClone(entry))){setTags(entry.tags.join('，'));setPhotoUndo(null);setNotice('');setError('');}}
 async function finish(){if(!saveTags())return;if(!await edit.settled())return;const saved=!!edit.current.current?.revision;setReward(saveReward(edit.current.current));await edit.open(null);history.replaceState(null,'','/?view=journal');setPhotoUndo(null);setNotice(saved?'这一页已收好。':'空白页未保存，可以随时再记。');}
 async function inspire(prompt:string){if(!draft)await start(newEntry(today()));setNotice('小拾的灵感问题：'+prompt);}
 async function openChat(){if(draft&&!saveTags())return;if(await edit.settled())setModal('chat');}
 async function keepChat(text:string){const entry={...newEntry(today()),text:'与小拾的灵感对话（AI 建议，尚未核实）\n\n'+text,tags:['灵感']};const revision=await saveEntry(entry,0);setEntries(old=>[{...entry,revision},...old]);setNotice('这段 AI 灵感已另存为随心记，原记录保留。');}
 async function reloadSaved(){
  if(!draft||!confirm('重新载入会丢弃当前未保存的修改。需要时先下载当前文字，再继续。'))return;
  setBusy('正在读取已保存版本…');try{const rows=await listEntries(true);const saved=rows.find(e=>e.id===draft.id&&!e.trashedAt)||null;await edit.discardAndOpen(saved);setEntries(rows);setTags(saved?.tags.join('，')||'');setNotice(saved?'已载入当前保存版本，可继续编辑。':'未找到仍可编辑的保存版本，当前草稿已丢弃。');}catch(e){edit.setError((e as Error).message);}finally{setBusy('');}
 }
 async function leave(url:string){if(busy){setError('正在处理当前操作，请完成后再切换入口。');return;}if(draft&&!saveTags())return;if(await edit.settled())location.href=url;}
 function saveTags(value=tags,normalize=true){const parsed=[...new Set(value.split(/[,，、\n]/).map(s=>s.trim()).filter(Boolean))];if(!draft)return true;if(JSON.stringify(parsed)===JSON.stringify(draft.tags))return true;if(edit.patch({tags:parsed})){if(normalize)setTags(parsed.join('，'));return true;}return false;}
 async function upload(files:FileList|null){
  if(!files?.length||!draft)return;const id=draft.id,added:MediaAsset[]=[];setBusy('正在整理照片…');setError('');
  try{if(files.length+draft.assetIds.length>10)throw new Error('每条记录最多 10 张照片；可先移除一张，或另记一页。');for(const f of Array.from(files)){const asset=await prepareAsset(f);await putAsset(asset);added.push(asset);}}
  catch(e){setError((e as Error).message+(added.length?'；前 '+added.length+' 张已添加。':''));}
  finally{if(added.length){setAssets(old=>[...added,...old]);if(edit.current.current?.id===id)edit.patch({assetIds:[...edit.current.current.assetIds,...added.map(a=>a.id)]});}setBusy('');}
 }
 function removePhoto(id:string){if(!draft)return;setPhotoUndo({id,entryId:draft.id,index:draft.assetIds.indexOf(id)});edit.patch({assetIds:draft.assetIds.filter(a=>a!==id)});}
 function undoPhoto(){if(!draft||!photoUndo||photoUndo.entryId!==draft.id)return;const ids=[...draft.assetIds];if(!ids.includes(photoUndo.id))ids.splice(Math.min(photoUndo.index,ids.length),0,photoUndo.id);edit.patch({assetIds:ids});setPhotoUndo(null);}
 async function recycle(entry:JournalEntry){
  if(!await edit.settled())return;setBusy('正在移入回收站…');setError('');
  try{const latest=entries.find(e=>e.id===entry.id)||entry;const revision=await trashEntry(latest.id,latest.revision);await refresh();if(draft?.id===entry.id)await edit.open(null);setUndo({id:entry.id,revision});setNotice('记录已移入回收站，可以撤销。');}catch(e){setError((e as Error).message);}finally{setBusy('');}
 }
 async function recover(id:string,revision:number){setBusy('正在恢复…');try{await restoreEntry(id,revision);await refresh();setUndo(null);setNotice('记录已恢复。');}catch(e){setError((e as Error).message);}finally{setBusy('');}}
 async function erase(entry:JournalEntry){if(!confirm('永久删除这条记录？已有回忆册中的快照仍保留，照片素材也不会一并删除。'))return;setBusy('正在删除…');try{await deleteEntryPermanently(entry.id,entry.revision);await refresh();if(undo?.id===entry.id)setUndo(null);}catch(e){setError((e as Error).message);}finally{setBusy('');}}
 async function follow(){if(!draft||!saveTags()||!await edit.settled())return;const parent=edit.current.current!;if(!parent.revision){edit.setError('先留下并保存一点内容，再续记。');return;}await start({...newEntry(today()),followUpTo:parent.id});}
 async function backup(filtered=false){if(!await edit.settled())return;setBusy('正在打包记录与照片…');setError('');try{const memories=filtered?[]:await listMemories(true);const blob=await makeJournalBundle(filtered?shown:await listEntries(true),memories,getAsset);download(blob,'拾页-随心记-'+today()+'.zip');setNotice('备份已生成，包含照片；请妥善保管其中的私藏内容。');}catch(e){setError((e as Error).message);}finally{setBusy('');}}
 async function restore(file:File|undefined){if(!file||!await edit.settled())return;setBusy('正在核对备份…');setError('');try{if(file.size>60_000_000)throw new Error('备份超过 60 MB，请选择分批导出的文件。');const restored=restoreJournalIdentity(readJournalBundle(new Uint8Array(await file.arrayBuffer())));await importJournalData(restored);await refresh();setNotice('备份已恢复为新的记录，原内容保留。');}catch(e){setError((e as Error).message);}finally{setBusy('');if(restoreInput.current)restoreInput.current.value='';}}
 async function publish(){
  if(!draft||!saveTags()||!await edit.settled())return;setBusy('正在另存作品…');setError('');try{const story=entryToStory({...draft,text:publicText,assetIds:publicPhotos},DEFAULT_OPTIONS);await saveStory(story,0);try{localStorage.setItem('shiye:studio:active',story.id);}catch{}location.href='/?view=studio';}catch(e){setError((e as Error).message);}finally{setBusy('');}
 }
 return <main className="journal-app next-studio has-main-nav">
  <header className="journal-header"><button aria-label="返回创作工作台" onClick={()=>void leave('/?view=studio')} disabled={!!busy}><ArrowLeft size={19}/></button><a href="/?view=studio" onClick={e=>{e.preventDefault();void leave('/?view=studio');}}>拾页<span>留住自己的细节</span></a><button aria-label="记录回收站" onClick={()=>{setModal('trash');setError('');}} disabled={!!busy}><Archive size={19}/></button></header>
  <div className="journal-container">
   {!draft?<><div className="journal-intro"><div><p>一点日常，也值得收藏</p><h1>随心记</h1><span>{active.length?active.length+' 页自己的故事':'先留下一句话，或一张照片。'}</span></div><button className="journal-primary" disabled={!!busy} onClick={()=>void start(newEntry(today()))}><Plus size={17}/>记一笔</button></div>
    <a className="journal-memory-link" href="/?view=memories" onClick={e=>{e.preventDefault();void leave('/?view=memories');}}><BookOpen size={18}/><span>把日常做成回忆册<small>按周、月、年，挑几段想留住的经历</small></span><ArrowUpRight size={17}/></a><label className="journal-search"><Search size={17}/><input aria-label="搜索随心记" value={query} onChange={e=>setQuery(e.target.value)} placeholder="找一段经历、日期或标签"/></label>
    <div className="journal-filters"><button className={starred?'active':''} onClick={()=>setStarred(!starred)}><Heart size={14}/>收藏</button><select aria-label="按标签筛选" value={tag} onChange={e=>setTag(e.target.value)}><option value="">全部标签</option>{allTags.map(t=><option key={t}>{t}</option>)}</select><span>{shown.length} 条记录</span></div>
   </>:<section className="journal-editor"><div className="journal-editor-head"><button onClick={()=>void finish()} disabled={!!busy}><ArrowLeft size={17}/>记录列表</button><span className={edit.status==='修改尚未保存'?'bad':''}>{edit.status}</span></div>
    <div className="journal-date-row"><label>这一天<input type="date" aria-label="记录日期" value={draft.date} onChange={e=>{if(e.target.value)edit.patch({date:e.target.value});}}/></label><button aria-label={draft.starred?'取消收藏这条记录':'收藏这条记录'} aria-pressed={draft.starred} onClick={()=>edit.patch({starred:!draft.starred})}><Heart size={20} fill={draft.starred?'currentColor':'none'}/></button></div>
    {draft.followUpTo&&<p className="journal-follow-note">续记 · {entries.find(e=>e.id===draft.followUpTo)?entryTitle(entries.find(e=>e.id===draft.followUpTo)!):'原记录已移除；这次的内容独立保留。'}</p>}
    <textarea className="journal-writing" aria-label="随心记文字" maxLength={20000} value={draft.text} onChange={e=>edit.patch({text:e.target.value})} placeholder={'今天发生了什么？\n一个瞬间、一句原话，或者还没想明白的小事。'}/>
    <div className="journal-edit-meta"><span>{draft.text.length.toLocaleString()} / 20,000</span><span>只保存在当前设备</span></div>
    <label className="journal-tags">给这页加个标签<input aria-label="记录标签" value={tags} onChange={e=>{setTags(e.target.value);saveTags(e.target.value,false);}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();saveTags();}}} placeholder="例如：散步，灵感，第一次尝试"/></label>
    <div className="journal-photos">{draft.assetIds.map(id=>{const a=assets.find(a=>a.id===id);return <article key={id}>{a?<AssetThumb asset={a}/>:<span>照片缺失，请重新选择</span>}<button aria-label={'从记录移除照片：'+(a?.name||id)} onClick={()=>removePhoto(id)} disabled={!!busy}><X size={15}/></button></article>;})}</div>
    {photoUndo?.entryId===draft.id&&<button className="journal-text-button" disabled={draft.assetIds.length>=10||!!busy} onClick={undoPhoto}><RotateCcw size={14}/>撤销移除照片</button>}
    <div className="journal-photo-actions"><label><ImagePlus size={17}/>{busy||'添加照片'}<input aria-label="为记录添加照片" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple disabled={!!busy||draft.assetIds.length>=10} onChange={e=>{void upload(e.target.files);e.target.value='';}}/></label><button disabled={!!busy||draft.assetIds.length>=10} onClick={()=>setModal('photos')}>从素材库选</button></div><p className="journal-small">移除只取消这条记录的选图。素材库仍保留照片；上传不会自动发送给 AI。</p>
    {edit.error&&<div className="journal-error" role="alert">{edit.error}<div className="journal-actions"><button onClick={edit.retry}>重试保存</button><button onClick={()=>download(new Blob([draft.text],{type:'text/plain;charset=utf-8'}),'拾页-未保存文字.txt')}>下载当前文字</button><button onClick={()=>void reloadSaved()}>重新载入已保存版本</button></div></div>}
    <div className="journal-editor-actions"><button className="journal-secondary" disabled={!!busy||!draft.revision} onClick={()=>void follow()}>后来怎么样了</button><button className="journal-primary" disabled={!!busy} onClick={()=>void finish()}>收好这页</button></div>
    <button className="journal-create-link" disabled={!!busy||!draft.text.trim()&&!draft.assetIds.length} onClick={()=>{setPublicText(draft.text);setPublicPhotos([...draft.assetIds]);setModal('publish');setError('');}}><PenLine size={16}/>整理为作品<ArrowUpRight size={16}/></button>
   </section>}
   {error&&<div role="alert" className="journal-error">{error}<button aria-label="关闭错误提示" onClick={()=>setError('')}><X size={15}/></button></div>}
   {notice&&<p className="journal-notice" role="status">{notice}</p>}{undo&&<button className="journal-text-button" disabled={!!busy} onClick={()=>void recover(undo.id,undo.revision)}><RotateCcw size={14}/>撤销删除记录</button>}
   {!draft&&<><section className="journal-timeline">{shown.map(entry=><article className="journal-card" data-testid="journal-card" key={entry.id}><div className="journal-card-date"><time>{entry.date}</time>{entry.followUpTo&&<span>后来</span>}{entry.starred&&<Heart size={13}/>}<button aria-label={'删除记录：'+entryTitle(entry)} disabled={!!busy} onClick={()=>void recycle(entry)}><Trash2 size={16}/></button></div><button className="journal-open-record" aria-label={'打开记录：'+entryTitle(entry)} onClick={()=>void start(entry)}><p>{entry.text||'这天，留下了 '+entry.assetIds.length+' 张照片。'}</p><div className="journal-card-photos">{entry.assetIds.slice(0,3).map(id=>{const a=assets.find(a=>a.id===id);return a?<AssetThumb key={id} asset={a}/>:null;})}</div><div className="journal-card-tags">{entry.tags.map(t=><span key={t}>#{t}</span>)}</div></button></article>)}{!shown.length&&<div className="journal-empty"><BookOpen size={30}/><h2>{active.length?'没有匹配的记录':'给今天，留一页。'}</h2><p>{active.length?'换一个关键词或标签再找找。':'不必完整，也不必精彩。你愿意记下的，就有意义。'}</p></div>}</section>
    <div id="backup" className="journal-backup"><p>本机保存需要搭配备份。完整备份包含回收站记录、回忆快照和所用照片。</p><div><button disabled={!!busy||!entries.length} onClick={()=>void backup()}><Download size={15}/>备份全部记录</button><button disabled={!!busy||!shown.length} onClick={()=>void backup(true)}>备份当前筛选</button><button disabled={!!busy} onClick={()=>restoreInput.current?.click()}>恢复备份</button><a href="/guide-v1.2.html">随心记指南</a></div></div>
   </>}
  </div>
  <Xiaoshi editing={!!draft} reward={reward} count={active.length} onPrompt={prompt=>void inspire(prompt)} onChat={()=>void openChat()}/>
  <input ref={restoreInput} className="journal-hidden" aria-label="恢复随心记备份" type="file" accept=".zip" disabled={!!busy} onChange={e=>void restore(e.target.files?.[0])}/>
  {modal==='chat'&&<XiaoshiChat entries={draft?[draft,...active.filter(e=>e.id!==draft.id)]:active} assets={assets} messages={chatMessages} onMessages={setChatMessages} onClose={()=>setModal(null)} onKeep={keepChat} onCreate={text=>{setPublicText(text);setPublicPhotos([]);if(!draft)void start(newEntry(today())).then(()=>setModal('publish'));else setModal('publish');}}/>}
  {modal==='trash'&&<Modal title="记录回收站" onClose={()=>{if(!busy)setModal(null);}}><p className="journal-small">误删可以恢复。照片与已确认的回忆快照不会随记录一起删除。</p>{error&&<p className="journal-error" role="alert">{error}</p>}{entries.filter(e=>e.trashedAt).map(e=><div className="journal-trash-row" key={e.id}><strong>{entryTitle(e)}</strong><time>{e.date}</time><div><button aria-label={'恢复记录：'+entryTitle(e)} disabled={!!busy} onClick={()=>void recover(e.id,e.revision)}>恢复记录</button><button disabled={!!busy} onClick={()=>void erase(e)}>永久删除</button></div></div>)}{!entries.some(e=>e.trashedAt)&&<p className="journal-small">回收站是空的。</p>}</Modal>}
  {modal==='photos'&&draft&&<Modal title="选择记录照片" onClose={()=>setModal(null)}><p className="journal-small">已选 {draft.assetIds.length}/10；选择已有素材无需再次上传。</p><div className="journal-photo-picker">{assets.filter(a=>!a.trashedAt).map(a=><button key={a.id} aria-label={'选择照片：'+a.name} aria-pressed={draft.assetIds.includes(a.id)} disabled={!draft.assetIds.includes(a.id)&&draft.assetIds.length>=10} onClick={()=>edit.patch({assetIds:draft.assetIds.includes(a.id)?draft.assetIds.filter(id=>id!==a.id):[...draft.assetIds,a.id]})}><AssetThumb asset={a}/><span>{draft.assetIds.includes(a.id)?'✓ ':''}{a.name}</span></button>)}</div><button className="journal-primary" onClick={()=>setModal(null)}>选好了</button></Modal>}
  {modal==='publish'&&draft&&<Modal title="把这段经历，整理成作品" onClose={()=>{if(!busy)setModal(null);}} wide><p className="journal-small">另存一份公开表达草稿，随心记原文和私藏标签保留在这里。这里只生成作品，不会自动发布。</p><label className="journal-tags">想分享的内容<textarea aria-label="公开文案" rows={7} maxLength={20000} value={publicText} onChange={e=>setPublicText(e.target.value)}/></label><div className="journal-photo-picker">{draft.assetIds.map(id=>{const a=assets.find(a=>a.id===id);return a?<button key={id} aria-label={'作品附带照片：'+a.name} aria-pressed={publicPhotos.includes(id)} onClick={()=>setPublicPhotos(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id])}><AssetThumb asset={a}/><span>{publicPhotos.includes(id)?'✓ 已选':'不附带'}</span></button>:null;})}</div>{error&&<p className="journal-error" role="alert">{error}</p>}<button className="journal-primary" disabled={!!busy||!publicText.trim()&&!publicPhotos.length} onClick={()=>void publish()}>另存到创作工作台</button></Modal>}
  <BottomNav active="mine" onNavigate={leave} disabled={!!busy||!!modal}/>
 </main>;
}
