import {useMemo,useState} from 'react';
import {Modal} from '../components/Modal.tsx';
import {ScenePreview} from './ScenePreview.tsx';
import {TEMPLATES,applyTemplate} from './templates.ts';
import type {TemplateId} from './templates.ts';
import type {Story} from './model.ts';
import {newPage} from './planner.ts';
import {layoutStory} from './scene.ts';
import {createMeasure} from '../core/renderer.ts';
export function TemplateGallery({story,initialId,onClose,onApply}:{story:Story;initialId:string;onClose:()=>void;onApply:(id:string,template:TemplateId)=>boolean}){
 const [id,setId]=useState(initialId||story.pages[0]?.id||''),[selected,setSelected]=useState<TemplateId>('headline');
 const page=story.pages.find(p=>p.id===id);
 const samples=useMemo(()=>TEMPLATES.map(t=>({template:t,scene:layoutStory({...story,pages:[{...newPage(t.sample),template:t.id}],settings:{...story.settings,target:0}},createMeasure(story.options))[0]})),[story.options]);
 const preview=useMemo(()=>{
  if(!page)return {scenes:[],error:'请先生成分镜。'};
  if(page.locked||page.tocEntries)return {scenes:[],error:page.locked?'本页已锁定，请先解锁再换模板。':'自动目录保持目录布局；可选择正文页。'};
  try{return {scenes:layoutStory({...applyTemplate(story,id,selected),pages:[{...page,template:selected,diagram:'none'}],settings:{...story.settings,target:0}},createMeasure(story.options)),error:''};}catch(e){return {scenes:[],error:(e as Error).message};}
 },[story,id,selected,page]);
 return <Modal title="选一个表达结构" onClose={onClose} wide>
  <p className="next-hint">拾页原创内置模板，可免费使用。文字和照片保留；仅修改你选择的分镜，随时可以再换。</p>
  <label className="next-field">应用到哪个分镜<select aria-label="模板目标分镜" value={id} onChange={e=>setId(e.target.value)}>{story.pages.map((p,i)=><option key={p.id} value={p.id}>第 {i+1} 分镜 · {p.source.replace(/^#+\s*/,'').split('\n')[0].slice(0,24)}{p.locked?'（已锁定）':''}</option>)}</select></label>
  <div className="next-template-grid">{samples.map(({template:t,scene})=><button key={t.id} className={selected===t.id?'selected':''} aria-label={'预览'+t.name+'模板'} aria-pressed={selected===t.id} onClick={()=>setSelected(t.id)}><ScenePreview scene={scene} options={story.options} small/><strong>{t.name}</strong><span>{t.hint}</span></button>)}</div>
  <section className="next-template-result"><h3>套用你的内容后</h3>{preview.error?<p role="alert" className="next-notice">{preview.error}</p>:<><div className="next-template-scenes">{preview.scenes.map(s=><ScenePreview key={s.id} scene={s} options={story.options}/>)}</div><p className="next-hint">这个分镜会导出 {preview.scenes.length} 张图片；长内容会自动续页。</p>{[...new Set(preview.scenes.flatMap(s=>s.warnings))].map(w=><p key={w} className="next-notice">{w}</p>)}</>}</section>
  <div className="next-dialog-actions"><button className="next-secondary" onClick={onClose}>保留原布局</button><button className="next-primary" disabled={!!preview.error} onClick={()=>{if(onApply(id,selected))onClose();}}>应用到第 {story.pages.findIndex(p=>p.id===id)+1} 分镜</button></div>
 </Modal>;
}
