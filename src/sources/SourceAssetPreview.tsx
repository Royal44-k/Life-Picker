import {useEffect,useState} from 'react';
import type {SourceRecord} from './types.ts';
export function SourceAssetPreview({row,code}:{row:SourceRecord;code:string}){
 const [url,setUrl]=useState(''),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();let objectUrl='',timedOut=false,active=true;
  setUrl('');setError('');const timer=setTimeout(()=>{timedOut=true;controller.abort();},20_000);
  void (async()=>{
   try{
    const response=await fetch('/api/sources/assets/'+encodeURIComponent(row.id),{headers:{'X-Shiye-Code':code},signal:controller.signal,cache:'no-store'});
    if(!response.ok){const data=await response.json();throw new Error(data.error||'素材暂时无法预览。');}
    if(response.headers.get('content-type')!=='image/png'||Number(response.headers.get('content-length'))>8_000_000)throw new Error('素材文件类型或大小异常，请重新检查公开素材。');
    const blob=await response.blob();if(blob.size<1||blob.size>8_000_000)throw new Error('素材文件大小异常，请重新检查公开素材。');
    if(!active||controller.signal.aborted)return;objectUrl=URL.createObjectURL(blob);setUrl(objectUrl);
   }catch(e){if(!active)return;if(timedOut)setError('读取素材预览超时，可重新读取；来源内容保留。');else if(!controller.signal.aborted)setError(e instanceof TypeError?'暂时连接不到电脑素材缓存，请检查连接后重试。':(e as Error).message);}
   finally{clearTimeout(timer);}
  })();
  return()=>{active=false;controller.abort();clearTimeout(timer);if(objectUrl)URL.revokeObjectURL(objectUrl);};
 },[row.id,row.asset?.sha256,code,attempt]);
 return <figure className="source-asset-preview">{error?<div><p role="alert">{error}</p><button onClick={()=>setAttempt(n=>n+1)}>重新读取预览</button></div>:url?<img src={url} alt={'素材预览：'+row.title} onError={()=>setError('素材未能显示，请重新读取预览。')}/>:<p role="status">正在读取已核验的素材文件…</p>}<figcaption>{row.review.state==='approved'?'已通过审核的素材':'待核对的素材预览'} · {row.rights.license} · {row.author.name||'作者未知'}</figcaption></figure>;
}
