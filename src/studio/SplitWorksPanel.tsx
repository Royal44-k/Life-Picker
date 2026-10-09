import {useMemo,useRef,useState} from 'react';
import {Modal} from '../components/Modal.tsx';
import {splitWorkPlan} from './split-works.ts';
import {createMeasure} from '../core/renderer.ts';
import {layoutStory} from './scene.ts';
import {ScenePreview} from './ScenePreview.tsx';
import type {Story} from './model.ts';
export function SplitWorksPanel({story,onClose,onSave}:{story:Story;onClose:()=>void;onSave:(drafts:Story[])=>Promise<void>}){
 const [max,setMax]=useState<6|9>(story.settings.target||6),[busy,setBusy]=useState(false),[error,setError]=useState('');const saving=useRef(false);
 const result=useMemo(()=>{try{return {plan:splitWorkPlan(story,max,createMeasure(story.options)),error:''};}catch(e){return {plan:null,error:(e as Error).message};}},[story,max]);
 async function save(){if(saving.current||!result.plan||result.plan.drafts.length<2)return;saving.current=true;setBusy(true);setError('');try{await onSave(result.plan.drafts);}catch(e){setError((e as Error).message);}finally{saving.current=false;setBusy(false);}}
 return <Modal title="预览拆成多篇" onClose={()=>{if(!busy)onClose();}} wide>
  <p className="next-hint">按当前分镜拆成独立作品，原作品完整保留。{story.series?'新作品保留当前系列设置。':''}</p>
  <label className="next-field">每篇最多图片<select aria-label="每篇最多图片" disabled={busy} value={max} onChange={e=>{setMax(Number(e.target.value) as 6|9);setError('');}}><option value={6}>6 张</option><option value={9}>9 张</option></select></label>
  {(error||result.error)&&<p role="alert" className="next-error">{error||result.error}</p>}
  {result.plan&&<>{result.plan.notes.map(n=><p className="next-hint" key={n}>{n}</p>)}
   {result.plan.drafts.length<2&&<p className="next-notice">当前作品能放入一篇，无需拆分。可改为每篇 6 张，或继续保留原作品。</p>}
   <div className="next-split-previews">{result.plan.drafts.map((draft,i)=>{const scene=layoutStory(draft,createMeasure(draft.options))[0];return <article key={draft.id} className="next-split-preview">
    <h3>{draft.title}</h3><p>{result.plan!.counts[i]} 张图片 · {draft.pages.length} 个分镜</p>
    <ScenePreview scene={scene} options={draft.options} small/>
    <details><summary>检查本篇文字</summary>{draft.pages.map((p,j)=><pre key={p.id}>第 {j+1} 个分镜{p.assetId?' · 含照片':''}{'\n'+p.source}</pre>)}</details>
   </article>;})}</div>
   <button className="next-primary next-wide" disabled={busy||result.plan.drafts.length<2} onClick={()=>void save()}>{busy?'正在完整保存…':'保存这 '+result.plan.drafts.length+' 篇新作品'}</button>
  </>}
 </Modal>;
}
