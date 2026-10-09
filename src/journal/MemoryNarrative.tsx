import {useEffect,useRef,useState} from 'react';
import {Modal} from '../components/Modal.tsx';
import {PaperSpirit} from './Xiaoshi.tsx';import {useCompanion} from './useCompanion.ts';
import {applyMemoryNarrative,initialNarrativeDraft,narrativeVersion} from './narrative.ts';import type {NarrativeProposal} from './narrative.ts';
import {parseNarrativeDraft} from './narrative-schema.mjs';import type {NarrativeDraft} from './narrative-schema.mjs';
import {memoryToStory} from './model.ts';import type {MemoryAlbum} from './model.ts';
import {confirmedScenes} from '../studio/render.ts';import {ScenePreview} from '../studio/ScenePreview.tsx';import type {Scene} from '../studio/model.ts';import type {CardOptions} from '../core/types.ts';
export function MemoryNarrative({album,options,onClose,onApply}:{album:MemoryAlbum;options:CardOptions;onClose:()=>void;onApply:(proposal:NarrativeProposal)=>void|Promise<void>}){
 const [revision]=useState(()=>narrativeVersion(album)),[initial]=useState(()=>initialNarrativeDraft(album)),[draft,setDraft]=useState<NarrativeDraft>(()=>initialNarrativeDraft(album));
 const [origin,setOrigin]=useState<'manual'|'ai'>(album.narrative?.origin||'manual'),[model,setModel]=useState(album.narrative?.model),[reviewed,setReviewed]=useState(false),[preview,setPreview]=useState<Scene[]|null>(null),[index,setIndex]=useState(0);
 const [instruction,setInstruction]=useState(''),[code,setCode]=useState(()=>{try{return sessionStorage.getItem('shiye:storyboard:code')||'';}catch{return '';}}),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const alive=useRef(true),done=useRef(false),acting=useRef(false),controller=useRef<AbortController|null>(null),current=useRef(album);current.current=album;
 const companion=useCompanion(album.id,false),stale=revision!==narrativeVersion(album),changed=JSON.stringify(draft)!==JSON.stringify(initial);
 useEffect(()=>{alive.current=true;const c=new AbortController();void fetch('/api/status',{signal:c.signal,cache:'no-store'}).then(r=>r.json()).then(d=>{if(alive.current)setReady(d.deepseek===true);}).catch(()=>{});return()=>{alive.current=false;c.abort();controller.current?.abort();};},[]);
 useEffect(()=>{const leave=(e:BeforeUnloadEvent)=>{if(!done.current&&(changed||instruction.trim()||acting.current)){e.preventDefault();e.returnValue='';}};addEventListener('beforeunload',leave);return()=>removeEventListener('beforeunload',leave);},[changed,instruction]);
 function edit(next:NarrativeDraft){setDraft(next);setReviewed(false);setPreview(null);setError('');}
 function proposal():NarrativeProposal{return {revision,draft,reviewed,origin,...(model?{model}:{})};}
 function showPreview(){setError('');try{const next=applyMemoryNarrative(album,{...proposal(),reviewed:true});setPreview(confirmedScenes(memoryToStory(next,options)));setIndex(0);}catch(e){setError((e as Error).message);setPreview(null);}}
 async function generate(){
  if(acting.current||stale)return;if(changed&&!confirm('生成成功后会替换下方尚未应用的串联文字，失败则保留。确定生成吗？'))return;
  acting.current=true;setBusy(true);setError('');const request=new AbortController();controller.current=request;const timer=setTimeout(()=>request.abort(),80000);
  try{try{sessionStorage.setItem('shiye:storyboard:code',code);}catch{}
   const response=await fetch('/api/memory-narrative',{method:'POST',headers:{'Content-Type':'application/json','X-Shiye-Code':code},signal:request.signal,body:JSON.stringify({title:album.title,revision,opening:album.intro||'',items:album.items.map(i=>({id:i.entryId,date:i.date,text:i.text,photoCount:i.assetIds.length})),instruction})}),data=await response.json();
   if(request.signal.aborted||!alive.current||controller.current!==request)return;if(!response.ok)throw Error(data.error||'未取得串联建议，输入的文字已保留。');
   if(data.revision!==revision||narrativeVersion(current.current)!==revision)throw Error('本册内容已变化，旧建议不会覆盖当前草稿。');
   const next=parseNarrativeDraft(data.draft,album.items.map(i=>i.entryId));if(typeof data.model!=='string'||!data.model||data.model.length>100)throw Error('模型信息无效，原草稿保留。');
   edit(next);setOrigin('ai');setModel(data.model);if(data.usageWarning)setError(data.usageWarning);
  }catch(e){if(alive.current&&controller.current===request)setError(request.signal.aborted?'已取消或等待超时，原草稿保留。':(e as Error).message);}finally{clearTimeout(timer);if(controller.current===request){controller.current=null;acting.current=false;if(alive.current)setBusy(false);}}
 }
 async function apply(){if(acting.current||!reviewed||!preview||stale)return;acting.current=true;setSaving(true);setError('');try{await onApply(proposal());done.current=true;onClose();}catch(e){if(alive.current)setError((e as Error).message);}finally{acting.current=false;if(alive.current)setSaving(false);}}
 function close(){if(saving)return;if((changed||instruction.trim()||busy)&&!confirm('串联文字尚未应用。关闭会丢弃本窗口的改动并取消等待，确定关闭吗？'))return;controller.current?.abort();onClose();}
 return <Modal title="和小拾串起这本回忆" onClose={close} wide>
 <div className="page-guide-heading"><PaperSpirit small appearance={companion.profile?.appearance}/><div><strong>《{album.title}》· {album.items.length} 个片段</strong><p>原片段保留，在旁边写自己的开场、过渡和结尾。</p></div></div>
 <details className="narrative-ai"><summary>可选：请 DeepSeek 帮我起草</summary><p className="journal-small">仅发送本册下方的文字、日期、照片数量，以及标题和已有开场。按量计费；不发送照片画面、标签或未选记录。AI 可能误解经历，请逐段核对。</p><label className="journal-tags">串联要求<textarea aria-label="回忆串联要求" rows={2} maxLength={500} disabled={busy||saving} value={instruction} onChange={e=>setInstruction(e.target.value)} placeholder="例如：简短自然，保留我的说话方式。"/></label><label className="journal-tags">AI 连接码<input aria-label="回忆串联连接码" inputMode="numeric" maxLength={8} autoComplete="off" disabled={busy||saving} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))}/></label>{!ready&&<p className="journal-small">暂未连接已配置的 AI 服务，仍可手动写作与预览。</p>}{busy?<button className="journal-secondary" onClick={()=>controller.current?.abort()}>取消串联建议</button>:<button className="journal-secondary" disabled={!ready||code.length!==8||saving||stale} onClick={()=>void generate()}>生成本册串联建议</button>}</details>
 <fieldset className="memory-edit-fields" disabled={busy||saving}><label className="journal-tags">开场<textarea aria-label="串联开场" rows={3} maxLength={4000} value={draft.opening} onChange={e=>edit({...draft,opening:e.target.value})}/></label>
 {album.items.map((item,i)=><section className="narrative-fragment" key={item.entryId}><h3>片段 {i+1} · {item.date}</h3><p className="journal-small">本册原片段 · {item.assetIds.length} 张照片（不会分析画面）</p><blockquote>{item.text||'这一片段仅有照片；请根据自己的记忆填写。'}</blockquote><label className="journal-tags">这段之前的过渡（选填）<textarea aria-label={'第 '+(i+1)+' 段过渡'} rows={2} maxLength={350} value={draft.connections[i].text} onChange={e=>edit({...draft,connections:draft.connections.map((c,n)=>n===i?{...c,text:e.target.value}:c)})}/></label></section>)}
 <label className="journal-tags">结尾（选填）<textarea aria-label="串联结尾" rows={3} maxLength={800} value={draft.closing} onChange={e=>edit({...draft,closing:e.target.value})}/></label></fieldset>
 {stale&&<p className="journal-error" role="alert">本册已变化，请返回后重新打开核对。当前建议不能覆盖新版本。</p>}{error&&<p className="journal-error" role="alert">{error}</p>}
 <button className="journal-secondary" disabled={busy||saving||stale} onClick={showPreview}>预览串联后的图文</button>
 {preview&&<section aria-label="串联图文预览"><div className="memory-export-nav"><button disabled={index===0} onClick={()=>setIndex(i=>i-1)}>上一页</button><select aria-label="串联预览页" value={index} onChange={e=>setIndex(Number(e.target.value))}>{preview.map((s,i)=><option key={s.id} value={i}>第 {i+1} / {preview.length} 页</option>)}</select><button disabled={index===preview.length-1} onClick={()=>setIndex(i=>i+1)}>下一页</button></div><ScenePreview scene={preview[index]} options={options}/></section>}
 <label className="memory-video-consent"><input type="checkbox" aria-label="已核对本册串联文字" disabled={busy||saving||!preview||stale} checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/><span>我已核对串联文字与本册经历、日期、数字和感受。</span></label>
 <button className="journal-primary" disabled={busy||saving||!preview||!reviewed||stale} onClick={()=>void apply()}>{saving?'正在放入草稿…':'应用到本册草稿'}</button><p className="journal-small">应用后还需“保存并确认本册”，再下载图文或制作短片。原随心记不会改写。</p>
 </Modal>;
}
