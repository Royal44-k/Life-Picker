import {useMemo,useRef,useState} from 'react';
import {Modal} from '../components/Modal.tsx';
import type {Story} from './model.ts';
import {buildSourceUpdate,applySourceUpdate} from './source-update.ts';
import {createMeasure} from '../core/renderer.ts';
export function SourceUpdatePanel({story,onClose,onApply}:{story:Story;onClose:()=>void;onApply:(next:Story)=>Promise<void>}){
 const [plan]=useState(()=>buildSourceUpdate(story,createMeasure(story.options))),[choices,setChoices]=useState<Record<string,string>>({}),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const guard=useRef(false),affected=plan.rows.filter(r=>r.status!=='unchanged');
 const candidate=useMemo(()=>{try{return {story:applySourceUpdate(story,plan,choices),error:''};}catch(e){return {story:null,error:(e as Error).message};}},[story,plan,choices]);
 async function apply(){if(guard.current||!candidate.story)return;guard.current=true;setBusy(true);setError('');try{await onApply(candidate.story);}catch(e){setError((e as Error).message);}finally{guard.current=false;setBusy(false);}}
 return <Modal title="检查原文更新" onClose={()=>{if(!busy)onClose();}} wide>
  <p className="next-hint">来源未变的页面保留你的文字、照片、裁切和排序。下方只处理受影响内容；跨页的同一段会一起确认。应用前会保留历史版本。</p>
  <p className="next-notice">{plan.rows.filter(r=>r.status==='unchanged').reduce((n,r)=>n+r.oldPages.length,0)} 页可直接保留，{affected.length} 组需要你确认。</p>
  {affected.map((row,i)=><section className="next-update-group" key={row.id}>
   <h3>{i+1} · {{changed:'原文或分页已变化',added:'新增内容',removed:'原文已移除',review:'需要核对对应关系',unchanged:'保持原样'}[row.status]}{row.locked?' · 含锁定页':''}</h3>
   {row.status==='review'&&<p className="next-hint">旧稿缺少完整来源、段落重复或顺序改变，无法可靠地逐页对应。请检查这组内容后选择。</p>}
   <div className="next-update-texts"><label className="next-field">当前页面 · {row.oldPages.length} 页<textarea aria-label={'更新前第 '+(i+1)+' 组'} readOnly rows={5} value={row.oldPages.map(p=>p.source).join('\n\n——\n\n')||'没有旧页'}/></label><label className="next-field">根据新原文编排 · {row.newPages.length} 页<textarea aria-label={'更新后第 '+(i+1)+' 组'} readOnly rows={5} value={row.newPages.map(p=>p.source).join('\n\n——\n\n')||'原文中已没有这部分'}/></label></div>
   <label className="next-field">这组怎么处理<select aria-label="这组页面的处理方式" disabled={busy} value={choices[row.id]||''} onChange={e=>setChoices(old=>({...old,[row.id]:e.target.value}))}><option value="">请选择</option><option value="keep">{row.oldPages.length?'保留当前页面的表达':'这次暂不加入'}</option>{!row.locked&&<option value="replace">{row.newPages.length?'按新原文更新这组':'移除这组旧页'}</option>}{row.locked&&!!row.newPages.length&&<option value="append">保留锁定页，同时加入新页（可能重复）</option>}</select></label>
   {row.locked&&<p className="next-hint">锁定页不会被替换。需要替换时，请返回工作台解锁后再更新。</p>}
  </section>)}
  {!affected.length&&<p className="next-hint">页面内容没有需要替换的部分，可以确认更新来源位置。</p>}
  {candidate.story&&<p className="next-hint">确认后保留 {candidate.story.pages.length} 个分镜，长内容仍可能产生续页。</p>}
  {candidate.error&&<p className="next-hint" role="status">{candidate.error}</p>}{error&&<p className="next-error" role="alert">{error}</p>}
  <div className="next-dialog-actions"><button className="next-secondary" disabled={busy} onClick={onClose}>暂不更新</button><button className="next-primary" disabled={busy||!candidate.story} onClick={()=>void apply()}>{busy?'正在保存…':'确认页面更新'}</button></div>
 </Modal>;
}
