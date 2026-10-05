import {useEffect,useState} from 'react';
import {listSeries} from './database.ts';
import type {PersonalSeries} from './model.ts';
import type {Story} from '../studio/model.ts';
import './series.css';
export function SeriesAssignment({story,onApply,onManage}:{story:Story;onManage:()=>void|Promise<void>;onApply:(series:PersonalSeries|null,appearance:boolean)=>Promise<void>}){
 const [rows,setRows]=useState<PersonalSeries[]>([]),[loading,setLoading]=useState(true),[selected,setSelected]=useState(story.series?.id||''),[appearance,setAppearance]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);setError('');void listSeries(true).then(rows=>{if(active)setRows(rows);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[attempt]);
 async function apply(){if(busy)return;setBusy(true);setError('');try{await onApply(selected?rows.find(s=>s.id===selected)||null:null,appearance);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const choice=rows.find(s=>s.id===selected);
 return <section className="series-assignment"><h3>归入自己的系列</h3>{story.series&&<p className="hub-note">当前：{story.series.name} · {story.series.tone}</p>}<label className="next-field">个人系列<select aria-label="个人系列" value={selected} disabled={loading||busy} onChange={e=>setSelected(e.target.value)}><option value="">未归类</option>{selected&&!rows.some(s=>s.id===selected)&&<option value={selected} disabled>当前系列尚未恢复到本机</option>}{rows.map(s=><option key={s.id} value={s.id} disabled={s.archived}>{s.name}{s.archived?'（已停用）':''}</option>)}</select></label><label className="series-appearance-check"><input type="checkbox" checked={appearance} disabled={busy||!choice||choice.archived} onChange={e=>setAppearance(e.target.checked)}/>同时采用系列默认外观</label><p className="hub-note">不勾选时保留本篇的配色、比例、字号与署名；图片上的系列名称会更新。之后仍可逐项调整。</p>{error&&<p className="next-error" role="alert">{error}</p>}<div className="series-editor-tools"><button disabled={busy||loading||!!selected&&(!choice||choice.archived)} onClick={()=>void apply()}>应用系列设置</button><button disabled={busy||loading} onClick={()=>setAttempt(n=>n+1)}>重新读取系列列表</button><button disabled={busy} onClick={()=>void onManage()}>管理系列 ↗</button></div></section>;
}
