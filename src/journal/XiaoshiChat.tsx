import {useEffect,useMemo,useRef,useState} from 'react';
import {Modal} from '../components/Modal.tsx';
import {AssetThumb} from '../studio/MediaPanel.tsx';
import {selectedAiImages} from '../studio/ai-media.ts';
import type {MediaAsset} from '../studio/model.ts';
import type {JournalEntry} from './model.ts';
import {PaperSpirit} from './Xiaoshi.tsx';
import {download} from '../core/export.ts';
export interface ChatMessage{role:'user'|'assistant';content:string}
export function XiaoshiChat({entries,assets,messages,onMessages,onClose,onKeep,onCreate}:{entries:JournalEntry[];assets:MediaAsset[];messages:ChatMessage[];onMessages:(m:ChatMessage[])=>void;onClose:()=>void;onKeep:(text:string)=>Promise<void>;onCreate:(text:string)=>void}){
 const [input,setInput]=useState(''),[code,setCode]=useState(()=>{try{return sessionStorage.getItem('shiye:storyboard:code')||'';}catch{return '';}}),[busy,setBusy]=useState(false),[error,setError]=useState(''),[ready,setReady]=useState(false);
 const [saved,setSaved]=useState<string[]>([]),[notice,setNotice]=useState('');
 const [selected,setSelected]=useState<string[]>([]),[photos,setPhotos]=useState<string[]>([]),[search,setSearch]=useState('');
 const controller=useRef<AbortController|null>(null),bottom=useRef<HTMLDivElement>(null);
 const records=entries.filter(e=>selected.includes(e.id)),contextSize=records.reduce((n,e)=>n+e.text.length,0);
 const available=entries.filter(e=>!search.trim()||[e.text,e.date,...e.tags].join(' ').includes(search.trim())).slice(0,20);
 const photoIds=[...new Set(entries.filter(e=>selected.includes(e.id)).flatMap(e=>e.assetIds))];
 const history=useMemo(()=>{let size=0;const result:ChatMessage[]=[];for(const m of messages.slice(-12).reverse()){if(size+m.content.length>18000)break;result.unshift(m);size+=m.content.length;}return result;},[messages]);
 useEffect(()=>{let active=true;void fetch('/api/status').then(r=>r.json()).then(s=>{if(active)setReady(s.deepseek===true);}).catch(()=>{if(active)setError('暂时连接不到 AI 服务；记录和本地灵感仍可使用。');});return()=>{active=false;controller.current?.abort();};},[]);
 useEffect(()=>{bottom.current?.scrollIntoView({block:'nearest',behavior:'instant'});},[messages.length,busy]);
 function chooseRecord(id:string){const ids=selected.includes(id)?selected.filter(x=>x!==id):[...selected,id];setSelected(ids);const available=new Set(entries.filter(e=>ids.includes(e.id)).flatMap(e=>e.assetIds));setPhotos(old=>old.filter(x=>available.has(x)));}
 async function send(){
  if(busy||!input.trim())return;setBusy(true);setError('');const prompt=input.trim(),request=new AbortController();controller.current=request;const timer=setTimeout(()=>request.abort(),80000);
  try{
   const images=await selectedAiImages(photos,request.signal);if(request.signal.aborted)throw new DOMException('Cancelled','AbortError');
   try{sessionStorage.setItem('shiye:storyboard:code',code);}catch{}
   const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json','X-Shiye-Code':code},signal:request.signal,body:JSON.stringify({message:prompt,history,records:records.map(e=>({id:e.id,date:e.date,text:e.text})),images})});
   const data=await response.json();if(!response.ok)throw new Error(data.error||'这次没能取得回复，请稍后重试。');
   if(request.signal.aborted)return;if(typeof data.text!=='string'||!data.text.trim()||data.text.length>6000)throw new Error('回复无效，你的输入仍保留。');
   onMessages([...messages,{role:'user',content:prompt},{role:'assistant',content:data.text}]);setInput('');
  }catch(e){setError((e as Error).name==='AbortError'?'已取消或等待超时，输入仍保留。':(e as Error).message);}finally{clearTimeout(timer);if(controller.current===request){controller.current=null;setBusy(false);}}
 }
 function close(){if(input.trim()&&!confirm('关闭会丢弃输入框中尚未发送的文字，已完成对话暂存在当前页面。确定关闭？'))return;controller.current?.abort();onClose();}
 async function keep(text:string){setBusy(true);setError('');try{await onKeep(text);setSaved(old=>[...old,text]);setNotice('这段灵感已存入随心记，标明了 AI 来源。');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <Modal title="和小拾聊聊" onClose={close} wide>
  <div className="xiaoshi-chat-intro"><PaperSpirit small mood={busy?'thinking':'idle'}/><p>我是你的 AI 创作伙伴。先聊一个真实细节，再慢慢把它写成自己的表达。</p></div>
  <p className="journal-small">每次发送最近 {history.length} 条会话、输入框内容，以及你勾选的记录和照片。未勾选的随心记不会发送；不包含私藏标签。使用 DeepSeek 按量计费。</p>
  <details className="xiaoshi-context"><summary>为这次聊天选素材 · {records.length} 条记录 / {photos.length} 张照片</summary>
   <label className="journal-search"><input aria-label="搜索聊天素材" value={search} disabled={busy} onChange={e=>setSearch(e.target.value)} placeholder="搜索要聊的记录"/></label>
   <p className="journal-small">默认不选，最多 3 条 / 8,000 字符。展开后每次最多显示 20 条，可搜索更早的记录。</p>
   <div className="xiaoshi-records">{available.map(e=><label key={e.id}><input type="checkbox" aria-label={'聊天附带记录：'+e.date+' '+e.text.slice(0,24)} disabled={busy||!selected.includes(e.id)&&selected.length>=3} checked={selected.includes(e.id)} onChange={()=>chooseRecord(e.id)}/><span><time>{e.date}</time>{e.text.slice(0,160)||'照片记录'}</span></label>)}</div>
   {photoIds.length>0&&<><p className="journal-small">照片需另外勾选，最多 3 张；只发送压缩副本。</p><div className="journal-photo-picker">{photoIds.map(id=>{const a=assets.find(a=>a.id===id);return a?<button key={id} aria-label={'聊天附带照片：'+a.name} aria-pressed={photos.includes(id)} disabled={busy||!photos.includes(id)&&photos.length>=3} onClick={()=>setPhotos(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id])}><AssetThumb asset={a}/><span>{photos.includes(id)?'✓ 已选':'选择照片'}</span></button>:null;})}</div></>}
   <p className="journal-small">本次已选 {contextSize} 字符。{contextSize>8000?'请减少记录后再发送。':''}</p>
  </details>
  <label className="journal-tags">AI 连接码<input aria-label="小拾 AI 连接码" inputMode="numeric" maxLength={8} disabled={busy} value={code} autoComplete="off" onChange={e=>setCode(e.target.value.replace(/\D/g,''))}/></label>
  {!ready&&<p className="journal-small">尚未连接或配置完成。可先使用小拾的本地灵感；在电脑“配置AI.cmd”中填写密钥后重启。</p>}
  <div className="xiaoshi-conversation" role="log" aria-label="与小拾的对话" aria-live="polite">{messages.length?messages.map((m,i)=><article key={i} className={'xiaoshi-message '+m.role}><strong>{m.role==='user'?'我':'小拾 · AI'}</strong><p>{m.content}</p>{m.role==='assistant'&&<div><button disabled={busy||saved.includes(m.content)} onClick={()=>void keep(m.content)}>{saved.includes(m.content)?'已存入随心记':'保存这段灵感'}</button><button disabled={busy} onClick={()=>onCreate(m.content)}>带到创作工作台</button></div>}</article>):<p className="journal-small">可以只聊，也可以勾选一条记录，让小拾帮你补充细节或寻找选题。</p>}{busy&&<p className="journal-small" role="status">小拾在认真想…</p>}<div ref={bottom}/></div>
  <div className="xiaoshi-quick">{['请问我一个具体问题，帮我记录今天。','从我选的经历里找 3 个能写的选题。','帮我写一段自然的小红书文案，保留真实细节。'].map((text,i)=><button key={text} disabled={busy} onClick={()=>setInput(text)}>{['引导我记录','找创作选题','整理成文案'][i]}</button>)}</div>
  <label className="journal-tags">想和小拾说<textarea aria-label="和小拾聊天的内容" rows={3} maxLength={4000} disabled={busy} value={input} onChange={e=>setInput(e.target.value)} placeholder="可以先说说发生了什么，或者想写什么。"/></label>
  {notice&&<p className="journal-notice" role="status">{notice}</p>}
  {error&&<p className="journal-error" role="alert">{error}</p>}
  <div className="journal-editor-actions">{messages.length>0&&<button className="journal-secondary" disabled={busy} onClick={()=>{if(confirm('清空当前会话？需要时请先下载留存。'))onMessages([]);}}>新会话</button>}{busy?<button className="journal-secondary" onClick={()=>controller.current?.abort()}>取消本次回复</button>:<button className="journal-primary" disabled={!ready||code.length!==8||!input.trim()||contextSize>8000} onClick={()=>void send()}>发送给小拾</button>}</div>
  {messages.length>0&&<button className="journal-text-button" onClick={()=>download(new Blob([messages.map(m=>(m.role==='user'?'我':'小拾（AI）')+'：\n'+m.content).join('\n\n')],{type:'text/plain;charset=utf-8'}),'拾页-与小拾的对话.txt')}>下载这段对话</button>}<p className="journal-small">对话只在当前页面暂存，刷新后不保留。AI 建议请核对后使用。</p>
 </Modal>;
}
