import {useEffect,useMemo,useRef,useState} from 'react';
import {Modal} from '../components/Modal.tsx';
import type {PersonalSeries} from './model.ts';
import {WRITING_TONES} from './model.ts';
import {listSeries,saveSeries} from './database.ts';
import {THEMES} from '../core/themes.ts';
import {download} from '../core/export.ts';
import {planStory} from '../studio/planner.ts';
import {layoutStory} from '../studio/scene.ts';
import {createMeasure} from '../core/renderer.ts';
import {ScenePreview} from '../studio/ScenePreview.tsx';
export function SeriesEditor({series,onSaved,onClose}:{series:PersonalSeries;onSaved:(value:PersonalSeries)=>void;onClose:()=>void}){
 const [draft,setDraft]=useState(()=>structuredClone(series)),[baseline,setBaseline]=useState(()=>JSON.stringify(series)),[busy,setBusy]=useState(false),[error,setError]=useState('');const working=useRef(false);const dirty=JSON.stringify(draft)!==baseline;
 useEffect(()=>{const leave=(e:BeforeUnloadEvent)=>{if(dirty||working.current){e.preventDefault();e.returnValue='';}};addEventListener('beforeunload',leave);return()=>removeEventListener('beforeunload',leave);},[dirty]);
 const preview=useMemo(()=>{try{const text='## '+(draft.name||'我的系列')+'\n\n'+(draft.topic||'留下一段自己的经历，再慢慢表达。'),story=planStory(text,draft.defaults,{target:0,cover:false,toc:'no',ending:'none'},createMeasure(draft.defaults));return layoutStory(story,createMeasure(draft.defaults))[0];}catch{return null;}},[draft.name,draft.topic,draft.defaults]);
 function close(){if(working.current)return;if(dirty&&!confirm('系列设置还未保存，确定放弃本次修改吗？'))return;onClose();}
 async function save(){if(working.current)return;working.current=true;setBusy(true);setError('');try{onSaved(await saveSeries(draft,draft.revision));}catch(e){setError('系列尚未保存：'+(e as Error).message);}finally{working.current=false;setBusy(false);}}
 async function reload(){if(dirty&&!confirm('载入已保存的系列会替换当前输入；需要时请先下载输入。继续吗？'))return;working.current=true;setBusy(true);setError('');try{const row=(await listSeries(true)).find(r=>r.id===draft.id);if(!row)throw new Error('尚未找到已保存版本。');setDraft(row);setBaseline(JSON.stringify(row));}catch(e){setError((e as Error).message);}finally{working.current=false;setBusy(false);}}
 return <Modal title={series.revision?'编辑系列':'新建系列'} wide onClose={close}><p className="hub-note">把这个栏目的主题与外观收好。修改默认值只影响以后应用的作品；每篇都可以再调整。</p><fieldset className="series-fields" disabled={busy}>
 <label className="next-field">系列名称<input aria-label="系列名称" value={draft.name} maxLength={40} onChange={e=>setDraft(d=>({...d,name:e.target.value,defaults:{...d.defaults,series:e.target.value}}))}/></label>
 <label className="next-field">系列主题<textarea aria-label="系列主题" rows={3} value={draft.topic} maxLength={1000} placeholder="这个系列持续关注什么？" onChange={e=>setDraft(d=>({...d,topic:e.target.value}))}/></label>
 <label className="next-field">默认文案语气<select aria-label="默认文案语气" value={draft.tone} onChange={e=>setDraft(d=>({...d,tone:e.target.value as PersonalSeries['tone']}))}>{WRITING_TONES.map(t=><option key={t}>{t}</option>)}</select></label>
 <div className="series-field-grid"><label className="next-field">默认配色<select aria-label="默认配色" value={draft.defaults.theme} onChange={e=>setDraft(d=>({...d,defaults:{...d.defaults,theme:e.target.value as PersonalSeries['defaults']['theme'],accent:''}}))}>{THEMES.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label><label className="next-field">默认图片比例<select aria-label="默认图片比例" value={draft.defaults.ratio} onChange={e=>setDraft(d=>({...d,defaults:{...d.defaults,ratio:e.target.value as PersonalSeries['defaults']['ratio']}}))}><option value="portrait">3:4 图文</option><option value="square">1:1 方形</option><option value="story">9:16 竖屏</option></select></label></div>
 <label className="next-field">默认正文字号 · {Math.round(draft.defaults.fontScale*100)}%<input aria-label="默认正文字号" type="range" min="90" max="120" step="5" value={Math.round(draft.defaults.fontScale*100)} onChange={e=>setDraft(d=>({...d,defaults:{...d.defaults,fontScale:Number(e.target.value)/100}}))}/></label>
 <label className="next-field">默认账号署名<input aria-label="默认账号署名" maxLength={32} value={draft.defaults.author} placeholder="可留空" onChange={e=>setDraft(d=>({...d,defaults:{...d.defaults,author:e.target.value}}))}/></label>
 <label className="next-field">默认强调色<input aria-label="默认强调色" type="color" value={draft.defaults.accent||THEMES.find(t=>t.id===draft.defaults.theme)!.accent} onChange={e=>setDraft(d=>({...d,defaults:{...d.defaults,accent:e.target.value}}))}/></label><button className="material-refresh" onClick={()=>setDraft(d=>({...d,defaults:{...d.defaults,accent:''}}))}>使用配色自带强调色</button></fieldset>
 {error&&<p role="alert" className="next-error">{error}</p>}<button className="next-primary next-wide" disabled={busy||!draft.name.trim()} onClick={()=>void save()}>{busy?'正在保存系列…':'保存系列'}</button><div className="series-editor-tools"><button disabled={busy} onClick={()=>download(new Blob([JSON.stringify(draft,null,2)],{type:'application/json;charset=utf-8'}),'拾页-当前系列输入.json')}>下载当前输入</button>{series.revision>0&&<button disabled={busy} onClick={()=>void reload()}>载入已保存版本</button>}</div>{preview&&<div className="series-style-preview"><p className="hub-note">外观预览 · 示例文字</p><ScenePreview scene={preview} options={draft.defaults}/></div>}</Modal>;
}
