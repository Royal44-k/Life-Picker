import {useEffect,useMemo,useRef,useState} from 'react';
import {Modal} from '../components/Modal.tsx';
import {ScenePreview} from './ScenePreview.tsx';
import {listStoryHistory} from './database.ts';
import type {StoryHistoryEntry} from './history.ts';
import type {Story} from './model.ts';
import {layoutStory} from './scene.ts';
import {createMeasure} from '../core/renderer.ts';
export function HistoryPanel({story,onClose,onRestore,onCheckpoint,onClear,onBackup}:{story:Story;onClose:()=>void;onRestore:(id:string)=>Promise<void>;onCheckpoint:()=>Promise<void>;onClear:()=>Promise<void>;onBackup:(story:Story)=>Promise<void>}){
 const [rows,setRows]=useState<StoryHistoryEntry[]>([]),[selected,setSelected]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(true);
 const guard=useRef(false),alive=useRef(true);
 const item=rows.find(e=>e.id===selected);
 async function load(){const list=await listStoryHistory(story.id);if(alive.current){setRows(list);setSelected(id=>list.some(e=>e.id===id)?id:list[0]?.id||'');}}
 useEffect(()=>{alive.current=true;void load().catch(e=>setError(e.message)).finally(()=>setBusy(false));return()=>{alive.current=false;};},[story.id]);
 const preview=useMemo(()=>{if(!item)return null;try{return layoutStory(item.story,createMeasure(item.story.options))[0]||null;}catch{return null;}},[item]);
 async function action(fn:()=>Promise<void>,message=''){if(guard.current)return;guard.current=true;setBusy(true);setError('');setNotice('');try{await fn();await load();if(alive.current)setNotice(message);}catch(e){if(alive.current)setError((e as Error).message);}finally{guard.current=false;if(alive.current)setBusy(false);}}
 return <Modal title="作品历史" onClose={()=>{if(!busy)onClose();}} wide>
  <p className="next-hint">保留最近 30 个版本。普通输入约每两分钟留一个恢复点；调整结构前与手动保留另记一版。历史只存本机，重要版本可单独备份。</p>
  <div className="next-dialog-actions"><button className="next-secondary" disabled={busy} onClick={()=>void action(onCheckpoint,'当前版本已保留。')}>保留当前版本</button><button className="next-text-action" disabled={busy} onClick={()=>void action(async()=>{},'已重新读取历史。')}>刷新历史</button></div>
  <div className="next-history-list" aria-label="历史版本列表">{rows.map(row=><button className="next-history-row" key={row.id} disabled={busy} aria-pressed={selected===row.id} aria-label={'查看版本 '+row.story.revision+' '+row.reason} onClick={()=>setSelected(row.id)}><strong>版本 {row.story.revision} · {row.reason}</strong><span>{new Date(row.savedAt).toLocaleString('zh-CN')} · {row.story.pages.length} 页</span></button>)}</div>
  {!rows.length&&!busy&&<p className="next-hint">还没有历史版本。可以先保留当前版本，再放心修改。</p>}
  {item&&<section className="next-history-preview"><h3>版本 {item.story.revision} · 只读预览</h3>{preview&&<ScenePreview scene={preview} options={item.story.options}/>}<label className="next-field">这版页面文字<textarea aria-label="历史页面文字" readOnly rows={6} value={item.story.pages.map((p,i)=>(i+1)+'. '+p.source).join('\n\n')}/></label><details><summary>查看当时原文</summary><pre>{item.story.source}</pre></details><div className="next-dialog-actions"><button className="next-secondary" disabled={busy} onClick={()=>void action(()=>onBackup(item.story),'历史版本备份已下载。')}>备份这个版本</button><button className="next-primary" disabled={busy} onClick={()=>{if(confirm('恢复这个版本？当前已保存内容会先保留到历史，之后仍可找回。'))void action(()=>onRestore(item.id));}}>恢复这个版本</button></div></section>}
  {error&&<p className="next-error" role="alert">{error}</p>}{notice&&<p className="next-notice" role="status">{notice}</p>}
  {!!rows.length&&<button className="next-text-action next-danger" disabled={busy} onClick={()=>{if(confirm('清除这篇作品全部历史？当前作品保留，历史版本将无法恢复；请先备份重要版本。'))void action(onClear,'历史已清除，当前作品保留。');}}>清除这篇作品的历史</button>}
 </Modal>;
}
