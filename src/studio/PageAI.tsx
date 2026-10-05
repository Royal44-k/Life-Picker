import {useEffect,useMemo,useRef,useState} from 'react';
import {Modal} from '../components/Modal.tsx';
import type {Story,StoryPage} from './model.ts';
import {sourceBlocks} from './planner.ts';
import {pageVersion} from './page-ai.ts';
import {download} from '../core/export.ts';
export function PageAI({story,page,onClose,onApply}:{story:Story;page:StoryPage;onClose:()=>void;onApply:(result:{text:string;revision:string})=>boolean}){
 const [code,setCode]=useState(()=>{try{return sessionStorage.getItem('shiye:storyboard:code')||'';}catch{return '';}});
 const [task,setTask]=useState('polish'),[symbols,setSymbols]=useState('少量 emoji'),[instruction,setInstruction]=useState('');
 const [selected,setSelected]=useState<string[]>([]),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [candidate,setCandidate]=useState<{text:string;revision:string;original:string}|null>(null);
 const resultRef=useRef<HTMLElement|null>(null);
 const controller=useRef<AbortController|null>(null),latest=useRef({story,page});latest.current={story,page};
 const blocks=useMemo(()=>sourceBlocks(story.source),[story.source]);
 const chosen=blocks.filter(b=>selected.includes(b.id)),contextSize=chosen.reduce((n,b)=>n+b.text.length,0);
 const stale=!!candidate&&candidate.revision!==pageVersion(story,page);
 useEffect(()=>{let active=true;void fetch('/api/status').then(r=>r.json()).then(s=>{if(active)setReady(s.deepseek===true);}).catch(()=>{if(active)setError('无法连接电脑上的 AI 服务。');});return()=>{active=false;controller.current?.abort();};},[]);
 async function generate(){
  if(busy)return;const snapshot={source:page.source,revision:pageVersion(story,page),task,instruction,symbols,context:chosen};
  const request=new AbortController();controller.current=request;setBusy(true);setError('');const timer=setTimeout(()=>request.abort(),80000);
  try{
   try{sessionStorage.setItem('shiye:storyboard:code',code);}catch{}
   const response=await fetch('/api/page-ai',{method:'POST',headers:{'Content-Type':'application/json','X-Shiye-Code':code},body:JSON.stringify(snapshot),signal:request.signal});
   const data=await response.json();if(!response.ok)throw new Error(data.error||'本次未获得建议，页面保留。');
   if(request.signal.aborted)return;
   if(typeof data.text!=='string'||data.text.length>8000||!data.text.trim()||data.revision!==snapshot.revision)throw new Error('返回的建议无效，页面保持不变。');
   if(data.usageWarning)setError(data.usageWarning);setCandidate({text:data.text,revision:data.revision,original:snapshot.source});
   if(pageVersion(latest.current.story,latest.current.page)!==snapshot.revision)setError('等待期间内容已变化，这份建议不能覆盖当前页。');
  }catch(e){setError((e as Error).name==='AbortError'?'已取消或等待超时，当前页面保持不变。':(e as Error).message);}
  finally{clearTimeout(timer);if(controller.current===request){controller.current=null;setBusy(false);}}
 }
 useEffect(()=>{if(candidate)resultRef.current?.scrollIntoView({block:'start',behavior:'instant'});},[candidate?.revision]);
 function close(){if(candidate&&!confirm('这份建议还未应用。确定关闭？也可以先下载文字留存。'))return;controller.current?.abort();onClose();}
 return <Modal title="只改好这一页" onClose={close} wide>
  <p className="next-hint">本次仅发送下面的当前页和手动勾选的上下文给 DeepSeek，不发送照片或其他记录。按量计费；建议需核对后应用。</p>
  <details className="next-source-proof" open><summary>本次要编辑的页面</summary><blockquote>{page.source}</blockquote></details>
  <div className="next-plan-settings"><label>希望怎样改<select aria-label="单页改写方式" disabled={busy} value={task} onChange={e=>setTask(e.target.value)}><option value="polish">表达更顺畅</option><option value="shorten">精简重复表达</option><option value="lead">改善标题与开头</option></select></label><label>符号风格<select aria-label="单页符号风格" disabled={busy} value={symbols} onChange={e=>setSymbols(e.target.value)}>{['不使用装饰符号','少量 emoji','适量 emoji 和颜文字'].map(v=><option key={v}>{v}</option>)}</select></label></div>
  <label className="next-field">额外要求（可留空）<textarea aria-label="单页改写要求" rows={2} maxLength={1000} disabled={busy} value={instruction} onChange={e=>setInstruction(e.target.value)} placeholder="例如：保留口语感，别替我添加没有发生的经历。"/></label>
  <details className="next-context-list"><summary>补充原文上下文 · 已选 {chosen.length} 段 / {contextSize} 字符</summary><p className="next-hint">默认不选；最多 20 段、8,000 字符。只有勾选的部分会发送。</p>{blocks.map((b,i)=><label key={b.id}><input type="checkbox" aria-label={'附带原文第 '+(i+1)+' 段'} disabled={busy} checked={selected.includes(b.id)} onChange={e=>setSelected(old=>e.target.checked?[...old,b.id]:old.filter(id=>id!==b.id))}/><span>{b.text}</span></label>)}</details>
  <label className="next-field">AI 连接码<input aria-label="单页 AI 连接码" inputMode="numeric" maxLength={8} autoComplete="off" value={code} disabled={busy} onChange={e=>setCode(e.target.value.replace(/\D/g,''))}/></label>
  {!ready&&<p className="next-hint">正在检查配置；未配置时请在电脑运行“配置AI.cmd”。</p>}
  {page.source.length>10000&&<p className="next-notice">本页超过 10,000 字符，请先拆为续页再使用单页 AI。</p>}
  {error&&<p className="next-error" role="alert">{error}</p>}
  {busy?<button className="next-secondary next-wide" onClick={()=>controller.current?.abort()}>正在生成 · 取消本次</button>:<button className="next-primary next-wide" disabled={!ready||code.length!==8||!page.source.trim()||page.source.length>10000||page.locked||contextSize>8000||chosen.length>20} onClick={()=>void generate()}>{candidate?'重新生成单页建议':'生成单页建议'}</button>}
  {candidate&&<section ref={resultRef} className="next-page-ai-result" aria-live="polite"><h3>核对后，再用自己的话改一改</h3><details className="next-source-proof"><summary>对照生成前的原句</summary><blockquote>{candidate.original}</blockquote></details><label className="next-field">单页建议<textarea aria-label="单页 AI 建议" rows={8} maxLength={8000} value={candidate.text} onChange={e=>setCandidate({...candidate,text:e.target.value})}/></label>{stale&&<p role="alert" className="next-notice">本页或原文已变化。旧建议不能覆盖当前内容，请重新生成；也可下载留存。</p>}<div className="next-dialog-actions"><button className="next-secondary" onClick={()=>download(new Blob([candidate.text],{type:'text/plain;charset=utf-8'}),'拾页-单页建议.txt')}>下载建议文字</button><button className="next-primary" disabled={busy||stale||page.locked||!candidate.text.trim()} onClick={()=>{try{if(onApply(candidate))onClose();else setError('未能应用，请关闭建议后检查当前页的保存提示；建议可先下载留存。');}catch(e){setError((e as Error).message);}}}>应用到当前页</button></div><p className="next-hint">原文和其他页面保持不变；可在分镜列表“撤销上一步”。</p></section>}
 </Modal>;
}
