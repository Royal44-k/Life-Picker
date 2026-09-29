import {useEffect,useState} from 'react';
import {ImagePlus,Trash2,RotateCcw,X} from 'lucide-react';
import type {MediaAsset,Story} from './model.ts';
import {allStories,trashAsset,restoreAsset,deleteAssetPermanently} from './database.ts';
import {Modal} from '../components/Modal.tsx';

export function AssetThumb({asset}:{asset:MediaAsset}){
 const [url,setUrl]=useState('');
 useEffect(()=>{const url=URL.createObjectURL(asset.blob);setUrl(url);return()=>URL.revokeObjectURL(url);},[asset.blob]);
 return <img src={url||undefined} alt={asset.name} loading="lazy" decoding="async"/>;
}
interface Props{
 assets:MediaAsset[];story:Story;busy:string;
 onUpload:(files:FileList|null)=>Promise<void>;onUseCover:(asset:MediaAsset)=>void;
 onRefresh:()=>Promise<void>;beforePermanentDelete:()=>Promise<void>;
 onError:(message:string)=>void;notify:(message:string)=>void;
}
export function MediaPanel({assets,story,busy,onUpload,onUseCover,onRefresh,beforePermanentDelete,onError,notify}:Props){
 const [dialog,setDialog]=useState<'trash'|MediaAsset|null>(null),[working,setWorking]=useState('');
 const [usage,setUsage]=useState<Record<string,{id:string;title:string}[]>>({});
 const [undo,setUndo]=useState<MediaAsset|null>(null),[localError,setLocalError]=useState('');
 function report(e:unknown){const message=(e as Error).message;setLocalError(message);onError(message);}
 const active=assets.filter(a=>!a.trashedAt),trash=assets.filter(a=>a.trashedAt);
 const loading=!!busy||!!working;
 async function refreshUsage(){
  const saved=await allStories(),docs=[story,...saved.filter(s=>s.id!==story.id)];
  const map:Record<string,{id:string;title:string}[]>={};
  for(const s of docs)for(const id of new Set(s.pages.flatMap(p=>p.assetId?[p.assetId]:[]))){
   (map[id]??=[]).push({id:s.id,title:s.title});
  }
  setUsage(map);return map;
 }
 async function show(next:'trash'|MediaAsset){
  setLocalError('');setDialog(next);setWorking('正在检查照片…');
  try{await onRefresh();await refreshUsage();}catch(e){report(e);setDialog(null);}finally{setWorking('');}
 }
 async function remove(asset:MediaAsset){
  setLocalError('');setWorking('正在移入回收站…');
  try{await trashAsset(asset.id);await onRefresh();setUndo(asset);setDialog(null);}
  catch(e){report(e);}finally{setWorking('');}
 }
 async function restore(asset:MediaAsset){
  setLocalError('');setWorking('正在恢复照片…');
  try{await restoreAsset(asset.id);await onRefresh();setUndo(null);notify('照片已恢复到素材库。');}
  catch(e){report(e);}finally{setWorking('');}
 }
 async function permanent(asset:MediaAsset){
  setLocalError('');setWorking('正在检查引用…');
  try{
   await beforePermanentDelete();const current=await refreshUsage();
   if(current[asset.id]?.length)throw new Error('照片仍被作品使用，请先从对应页面移除。');
   if(!confirm('永久删除“'+asset.name+'”？拾页中的副本将无法恢复，手机原图不受影响。'))return;
   await deleteAssetPermanently(asset.id);await onRefresh();if(undo?.id===asset.id)setUndo(null);notify('已永久删除拾页中的照片副本。');
  }catch(e){report(e);}finally{setWorking('');}
 }
 return <div className="next-panel-body">
  <div className="next-section-title"><h2>自己的照片，更有故事</h2><button aria-label="打开照片回收站" disabled={loading} onClick={()=>void show('trash')}><Trash2 size={15}/>回收站 {trash.length? '· '+trash.length:''}</button></div>
  <label className="next-upload"><ImagePlus size={28}/><strong>{busy||'添加照片或截图'}</strong><span>支持多选 · 自动调整方向与尺寸</span><input aria-label="上传照片" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple disabled={loading} onChange={e=>{void onUpload(e.target.files);e.target.value='';}}/></label>
  <p className="next-hint">{active.length} 张照片仅存本机；上传不会自动调用 AI。删除后可从回收站恢复。</p>
  {undo&&<div className="next-photo-undo" role="status"><span>照片已移入回收站。</span><button disabled={loading} onClick={()=>void restore(undo)}><RotateCcw size={14}/>撤销删除</button><button aria-label="收起撤销提示" onClick={()=>setUndo(null)}><X size={14}/></button></div>}
  <div className="next-assets">{active.map(a=><article key={a.id}><AssetThumb asset={a}/><p>{a.name}</p><div className="next-asset-actions"><button onClick={()=>onUseCover(a)} disabled={loading}>用作封面照片</button><button className="next-remove-photo" aria-label={'删除照片：'+a.name} disabled={loading} onClick={()=>void show(a)}><Trash2 size={15}/>删除</button></div></article>)}</div>
  {!active.length&&<p className="next-empty">一张照片也可以成为一篇好内容的起点。误删照片可从回收站找回。</p>}
  {dialog&&<Modal title={dialog==='trash'?'照片回收站':'删除这张照片？'} onClose={()=>{if(!working)setDialog(null);}} wide>
   {localError&&<p className="next-error" role="alert">{localError}</p>}
   {working&&<p role="status" className="next-notice">{working}</p>}
   {dialog==='trash'?<>
    <p className="next-hint">回收站保留拾页中的副本，已使用的页面仍正常显示。先解除作品中的引用，才能永久删除；手机原图不受影响。</p>
    {!trash.length?<p className="next-empty">回收站是空的。</p>:<div className="next-trash-list">{trash.map(a=><article key={a.id}><AssetThumb asset={a}/><div><strong>{a.name}</strong><p>{usage[a.id]?.length?'仍用于 '+usage[a.id].length+' 个作品':'未被作品使用'}</p>{!!usage[a.id]?.length&&<details><summary>查看对应作品</summary>{usage[a.id].map(s=><p key={s.id}>{s.title}</p>)}</details>}<div className="next-dialog-actions"><button className="next-secondary" aria-label={'恢复照片：'+a.name} disabled={loading} onClick={()=>void restore(a)}>恢复照片</button><button className="next-text-action next-danger" aria-label={'永久删除：'+a.name} disabled={loading||!!usage[a.id]?.length} onClick={()=>void permanent(a)}>永久删除</button></div></div></article>)}</div>}
   </>:<><div className="next-delete-photo"><AssetThumb asset={dialog}/><strong>{dialog.name}</strong></div><p className="next-hint">{usage[dialog.id]?.length?'这张照片已用于 '+usage[dialog.id].length+' 个作品。移入回收站后，这些作品仍保留照片。':'只移除素材库中的副本，手机原图保留。'}误删时可以撤销或从回收站恢复。</p><div className="next-dialog-actions"><button className="next-secondary" disabled={loading} onClick={()=>setDialog(null)}>保留照片</button><button className="next-primary" disabled={loading} onClick={()=>void remove(dialog)}>移入回收站</button></div></>}
  </Modal>}
 </div>;
}
