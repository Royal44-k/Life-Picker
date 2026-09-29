import {useEffect,useRef,useState} from 'react';
import type {JournalEntry} from './model.ts';
import {validateEntry} from './model.ts';
import {saveEntry} from './database.ts';
export function useEntryDraft(onSaved:(entry:JournalEntry)=>void){
 const [draft,setDraft]=useState<JournalEntry|null>(null),[status,setStatus]=useState(''),[error,setError]=useState('');
 const current=useRef<JournalEntry|null>(null),revisions=useRef(new Map<string,number>()),queue=useRef(Promise.resolve()),pending=useRef(false),blocked=useRef(false),ticket=useRef(0),listener=useRef(onSaved);listener.current=onSaved;
 useEffect(()=>{const before=(e:BeforeUnloadEvent)=>{if(pending.current||blocked.current){e.preventDefault();e.returnValue='';}};addEventListener('beforeunload',before);return()=>removeEventListener('beforeunload',before);},[]);
 async function settled(){await queue.current;if(pending.current||blocked.current){setError('修改尚未保存，请重试保存，或下载当前文字留存后再离开。');return false;}return true;}
 async function open(entry:JournalEntry|null){if(!await settled())return false;current.current=entry;setDraft(entry);setError('');if(entry)revisions.current.set(entry.id,entry.revision);setStatus(entry?.revision?'已保存到本机':'等你写下一点内容');return true;}
 function commit(value:JournalEntry){
  let next;try{next=validateEntry({...value,updatedAt:Date.now()});}catch(e){setError((e as Error).message);return false;}
  current.current=next;setDraft(next);setError('');
  if(!next.text.trim()&&!next.assetIds.length&&!(revisions.current.get(next.id)||0)&&!pending.current){setStatus('空白页暂不保存');return true;}
  const saveTicket=++ticket.current;pending.current=true;setStatus('正在保存…');
  queue.current=queue.current.then(async()=>{
   if(blocked.current)throw new Error('还有未保存修改，请先重试保存。');
   const revision=await saveEntry(next,revisions.current.get(next.id)||0);revisions.current.set(next.id,revision);const saved={...next,revision};listener.current(saved);
   if(saveTicket===ticket.current){pending.current=false;current.current=saved;setDraft(saved);setStatus('已保存到本机');}
  }).catch(e=>{pending.current=true;blocked.current=true;setStatus('修改尚未保存');setError(e.message||'保存失败，当前文字仍保留。');});return true;
 }
 async function discardAndOpen(entry:JournalEntry|null){await queue.current;blocked.current=false;pending.current=false;ticket.current++;return open(entry);}
 function patch(change:Partial<JournalEntry>){if(!current.current)return false;return commit({...current.current,...change});}
 function retry(){blocked.current=false;if(current.current)commit(current.current);}
 return {draft,current,status,error,setError,open,patch,commit,retry,settled,discardAndOpen};
}
