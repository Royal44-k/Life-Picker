import {useEffect,useRef,useState} from 'react';
import {Modal} from '../components/Modal.tsx';
import type {Story,StoryPage} from './model.ts';
import {ROLE_NAMES,DIAGRAM_NAMES} from './model.ts';
import {newPage,hashText,sourceBlocks} from './planner.ts';
import {getAsset} from './database.ts';
import {loadImage} from './media.ts';

export function StoryboardAI({story,onApply,onClose}:{story:Story;onApply:(pages:StoryPage[])=>void;onClose:()=>void}){
 const [code,setCode]=useState(()=>{try{return sessionStorage.getItem('shiye:storyboard:code')||'';}catch{return '';}}),[busy,setBusy]=useState(false),[error,setError]=useState(''),[pages,setPages]=useState<StoryPage[]>([]),[photos,setPhotos]=useState(false),[ready,setReady]=useState(false);
 const request=useRef<AbortController|null>(null),version=useRef(story.id+':'+hashText(story.source));

 const [blocks]=useState(()=>sourceBlocks(story.source));
 useEffect(()=>{void fetch('/api/status').then(r=>r.json()).then(s=>setReady(s.deepseek===true)).catch(()=>setError('无法连接 AI 服务。'));return()=>request.current?.abort();},[]);
 async function generate(){
  if(busy)return;setBusy(true);setError('');const controller=new AbortController();request.current=controller;
  try{
   const images:string[]=[];
   if(photos)for(const id of [...new Set(story.pages.flatMap(p=>p.assetId?[p.assetId]:[]))].slice(0,3)){
    const a=await getAsset(id);if(!a)throw new Error('有照片缺失，请先补充。');const img=await loadImage(a.blob);const c=document.createElement('canvas');const scale=Math.min(1,768/Math.max(img.naturalWidth,img.naturalHeight));c.width=Math.round(img.naturalWidth*scale);c.height=Math.round(img.naturalHeight*scale);c.getContext('2d')!.drawImage(img,0,0,c.width,c.height);images.push(c.toDataURL('image/jpeg',.8));c.width=0;c.height=0;
   }
   try{sessionStorage.setItem('shiye:storyboard:code',code);}catch{}
   const response=await fetch('/api/storyboard',{method:'POST',headers:{'Content-Type':'application/json','X-Shiye-Code':code},body:JSON.stringify({source:story.source,sourceHash:hashText(story.source),target:story.settings.target,blocks,images}),signal:controller.signal});
   const data=await response.json();if(!response.ok)throw new Error(data.error||'AI 编排失败。');
   if(data.sourceHash!==hashText(story.source)||version.current!==story.id+':'+hashText(story.source))throw new Error('原文已变化，请关闭后重新生成。');
   if(data.usageWarning)setError(data.usageWarning);setPages(data.pages.map((p:StoryPage)=>({...newPage(p.source,p.role,p.sourceIds),diagram:p.diagram})));
  }catch(e){setError((e as Error).name==='AbortError'?'已取消，原作品保留。':(e as Error).message);}finally{setBusy(false);}
 }
 return <Modal title="AI 编辑成篇" onClose={()=>{if(busy)request.current?.abort();if(!pages.length||confirm('关闭分镜建议？尚未应用的建议不会保存。'))onClose();}} wide>
  <p className="next-hint">只发送这篇原文与本次选择的照片给 DeepSeek。按量计费；结果可修改，应用后另存新作品。</p>
  <label className="next-field">AI 连接码<input aria-label="分镜 AI 连接码" inputMode="numeric" autoComplete="off" maxLength={8} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))}/></label><p className="next-hint">连接码在电脑启动拾页的窗口中，手机无需填写 API Key。</p>
  <label className="next-checks"><input type="checkbox" checked={photos} onChange={e=>setPhotos(e.target.checked)}/>附带本作品使用的照片（最多 3 张）</label>
  {!ready&&<p className="next-hint">正在检查配置；尚未配置时，请打开项目内“配置AI.cmd”。</p>}
  {busy?<button className="next-secondary next-wide" onClick={()=>request.current?.abort()}>生成中 · 点击取消</button>:<button className="next-primary next-wide" disabled={!ready||code.length!==8} onClick={()=>void generate()}>生成分镜建议</button>}
  {error&&<p className="next-error" role="alert">{error}</p>}
  {!!pages.length&&<><p className="next-notice">AI 可能精简或重组原文。请核对事实与来源，再应用。</p>{pages.map((p,i)=><div className="next-ai-page" key={p.id}><label className="next-field">{i+1} · {ROLE_NAMES[p.role]} · {DIAGRAM_NAMES[p.diagram]}<textarea aria-label={'AI 第 '+(i+1)+' 页'} rows={4} value={p.source} onChange={e=>setPages(old=>old.map(x=>x.id===p.id?{...x,source:e.target.value}:x))}/></label><details className="next-hint"><summary>查看对应原文</summary>{p.sourceIds.map(id=><p key={id}>{blocks.find(b=>b.id===id)?.text}</p>)}</details></div>)}<button className="next-primary next-wide" onClick={()=>onApply(pages)}>应用为新作品</button></>}
 </Modal>;
}
