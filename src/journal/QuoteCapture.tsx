import {useMemo,useState} from 'react';
import {BookmarkPlus,Check} from 'lucide-react';
import {Modal} from '../components/Modal.tsx';
import {quoteCandidates} from './quotes.ts';
import type {JournalEntry} from './model.ts';
import './quotes.css';

export function QuoteCapture({entry,onSave,onClose}:{entry:JournalEntry;onSave:(text:string)=>Promise<void>;onClose:()=>void}){
 const [selection,setSelection]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const suggestions=useMemo(()=>quoteCandidates(entry.text),[entry.text]);
 const selected=selection.trim(),duplicate=entry.quotes?.some(q=>q.text===selected),full=(entry.quotes?.length||0)>=20;
 function select(text:string){setSelection(text);setError('');}
 async function save(){
  if(busy)return;setBusy(true);setError('');
  try{await onSave(selected);onClose();}catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 return <Modal title="摘一句原话" onClose={()=>{if(!busy)onClose();}}>
  <p className="quotes-help">留下你写过的句子。每句最多 500 字符；这里只收藏原话，不会发送给 AI。</p>
  <label className="quotes-field">长按原文，选择想留下的部分
   <textarea aria-label="选择原话的原文" readOnly rows={5} value={entry.text} onSelect={e=>{const el=e.currentTarget;if(el.selectionEnd>el.selectionStart)select(el.value.slice(el.selectionStart,el.selectionEnd));}}/>
  </label>
  {suggestions.length>0&&<details className="quote-suggestions" open><summary>也可以点选一句 <span>按原文断句</span></summary><div>{suggestions.map((text,i)=><button key={i} aria-label={'选择原句：'+text} aria-pressed={selected===text} disabled={busy} onClick={()=>select(text)}><span>{text}</span>{selected===text&&<Check size={15}/>}</button>)}</div></details>}
  <div className="quote-selection" aria-live="polite"><span>这次留下的原话 · {selected.length}/500</span><p>{selected||'先在上方选一段文字，或点选一句。'}</p></div>
  {error&&<p className="journal-error" role="alert">{error}</p>}
  {(duplicate||full||selected.length>500)&&<p className="journal-small" role="status">{duplicate?'这句已经在原话簿里了。':full?'本条记录已收藏 20 句，可以先去原话簿整理。':'选中的文字太长，请缩短到 500 字符以内。'}</p>}
  <button className="journal-primary quotes-wide" disabled={busy||!selected||selected.length>500||duplicate||full} onClick={()=>void save()}><BookmarkPlus size={17}/>{busy?'正在收藏…':'收进原话簿'}</button>
 </Modal>;
}
