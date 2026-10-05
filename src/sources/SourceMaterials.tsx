import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Modal} from '../components/Modal.tsx';
import {TEMPLATES} from '../studio/templates.ts';
import type {TemplateId} from '../studio/templates.ts';
import type {MediaAsset} from '../studio/model.ts';
import {planStory} from '../studio/planner.ts';
import {layoutStory} from '../studio/scene.ts';
import {DEFAULT_OPTIONS} from '../core/layout.ts';
import {createMeasure} from '../core/renderer.ts';
import {ScenePreview} from '../studio/ScenePreview.tsx';
import {SourceDetails,PublishedState,usePublishedSources} from './PublishedSources.tsx';
import type {PublishedSource} from './PublishedSources.tsx';
import {sourceRequest} from './api.ts';
import {readPublicAsset} from './material.ts';
import {createMaterialStory} from './material-store.ts';
import {SourceCreditDetails} from './SourceCredits.tsx';
const options={...DEFAULT_OPTIONS,theme:'forest' as const,series:'我的表达'};
export function SourceMaterials(){
 const data=usePublishedSources(),[selected,setSelected]=useState<PublishedSource|null>(null),records=data.records.filter(r=>r.kind==='asset'&&r.rights.usage==='reusable');
 return <section className="hub-section published-section" aria-label="已核验插画"><div className="hub-section-heading"><h2>已核验插画</h2><a href="/?view=sources">来源与审核 ↗</a></div><p className="hub-note">搭配自己的文字。插画为创作配图，不代表你的亲身经历；首批支持 CC0 PNG。</p><PublishedState {...data} empty={!records.length}/>{!data.loading&&!data.error&&<div className="published-assets">{records.map(r=><article className="published-asset" key={r.id}><PublicMaterialThumb source={r}/><h3>{r.title}</h3><SourceDetails source={r}/><button disabled={r.rights.license!=='CC0-1.0'||r.asset?.type!=='image/png'} onClick={()=>setSelected(r)}>{r.rights.license==='CC0-1.0'&&r.asset?.type==='image/png'?'用这张插画创作':'尚需适配许可与文件格式'}</button></article>)}</div>}{selected&&<MaterialEditor source={selected} onClose={()=>setSelected(null)}/>}</section>;
}
function MaterialEditor({source,onClose}:{source:PublishedSource;onClose:()=>void}){
 const [text,setText]=useState(''),[template,setTemplate]=useState<TemplateId>('photo-magazine'),[asset,setAsset]=useState<MediaAsset|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 const inFlight=useRef(false),leaving=useRef(false),controller=useRef<AbortController|null>(null);
 useEffect(()=>{let active=true;const c=new AbortController();controller.current=c;setLoading(true);setError('');setAsset(null);void sourceRequest<{records:PublishedSource[]}>('published','',{signal:c.signal}).then(async data=>{const current=data.records.find(r=>r.id===source.id);if(!current)throw new Error('来源尚未通过审核或已移除，文字仍保留。');return readPublicAsset(current,c.signal);}).then(a=>{if(active)setAsset(a);}).catch(e=>{if(active)setError(e.name==='AbortError'?'素材读取已取消。':e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;c.abort();};},[source.id,attempt]);
 useEffect(()=>{const prevent=(e:BeforeUnloadEvent)=>{if(!leaving.current&&(text.trim()||inFlight.current)){e.preventDefault();e.returnValue='';}};addEventListener('beforeunload',prevent);return()=>removeEventListener('beforeunload',prevent);},[text]);
 const preview=useMemo(()=>{if(!asset||!text.trim())return {story:null,scenes:[],error:''};try{const base=planStory(text,options,{target:0,cover:false,toc:'no',ending:'none'},createMeasure(options)),story={...base,pages:base.pages.map((p,i)=>({...p,template,diagram:'none' as const,...(i===0?{assetId:asset.id,fit:'contain' as const,layout:'photo' as const}:{})}))};return {story,scenes:layoutStory(story,createMeasure(options)),error:''};}catch(e){return {story:null,scenes:[],error:(e as Error).message};}},[asset,text,template]);
 const resolveAsset=useCallback(async(id:string)=>asset?.id===id?asset:undefined,[asset]);
 function close(){if(inFlight.current)return;if(text.trim()&&!confirm('文字还没有保存为作品，确定关闭并丢弃这些修改吗？'))return;controller.current?.abort();onClose();}
 async function save(){if(inFlight.current||!preview.story||!asset)return;inFlight.current=true;setBusy(true);setError('');const c=new AbortController();controller.current=c;
  try{const data=await sourceRequest<{records:PublishedSource[]}>('published','',{signal:c.signal}),current=data.records.find(r=>r.id===asset.sourceCredit!.recordId);if(!current||current.revision!==asset.sourceCredit!.revision||current.asset?.sha256!==asset.sourceCredit!.originalHash)throw new Error('来源审核或版本已变化，请重新核对素材。文字仍保留。');await createMaterialStory(preview.story,asset);try{localStorage.setItem('shiye:studio:active',preview.story.id);}catch{}leaving.current=true;location.href='/?view=studio&id='+encodeURIComponent(preview.story.id);}catch(e){setError((e as Error).message);}finally{inFlight.current=false;setBusy(false);}
 }
 return <Modal title="插画与自己的文字" wide onClose={close}><p className="hub-note">先写自己的内容，再看实际排版。保存会新增作品；图片和出处一起存到当前浏览器。</p><label className="next-field">插画作品文字<textarea aria-label="插画作品文字" value={text} maxLength={20000} rows={6} disabled={busy} onChange={e=>setText(e.target.value)} placeholder={'## 想分享的发现\n\n写下属于自己的细节…'}/></label><label className="next-field">搭配的结构<select aria-label="搭配的结构" value={template} disabled={busy} onChange={e=>setTemplate(e.target.value as TemplateId)}>{TEMPLATES.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label><p className="hub-note">插画放在首页，使用完整显示；文字过长会续页。某些图解结构配图后会转为图文布局。</p><p className="material-state" role="status">{loading?'正在核对素材…':asset?'图片已就绪':'图片尚未就绪'}</p>{(error||preview.error)&&<p role="alert" className="next-error">{error||preview.error}</p>}<button className="material-refresh" disabled={loading||busy} onClick={()=>setAttempt(n=>n+1)}>重新核对素材</button>{asset?.sourceCredit&&<SourceCreditDetails credit={asset.sourceCredit}/>}<button className="next-primary next-wide" disabled={busy||loading||!preview.story||!asset} onClick={()=>void save()}>{busy?'正在保存作品…':'保存插画作品'}</button>{preview.scenes.length>0&&<><p className="hub-note">实际排版 · {preview.scenes.length} 页</p><div className="published-material-preview">{preview.scenes.map(s=><ScenePreview key={s.id} scene={s} options={options} resolveAsset={resolveAsset}/>)}</div></>}</Modal>;
}

function PublicMaterialThumb({source}:{source:PublishedSource}){const [error,setError]=useState(false),[attempt,setAttempt]=useState(0);return error?<div className="published-thumb-error"><p>预览暂不可用，出处信息仍保留。</p><button onClick={()=>{setError(false);setAttempt(n=>n+1);}}>重试图片预览</button></div>:<img src={'/api/sources/public-assets/'+encodeURIComponent(source.id)+'?revision='+source.revision+'&attempt='+attempt} alt={source.title} loading="lazy" onError={()=>setError(true)}/>;}
