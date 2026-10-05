import type {PublishedSource} from './PublishedSources.tsx';
import type {MediaAsset} from '../studio/model.ts';
import {validateSourceCredit} from './credit.ts';
import {loadImage} from '../studio/media.ts';
import {makeId} from '../core/storage.ts';
export async function readPublicAsset(row:PublishedSource,signal:AbortSignal):Promise<MediaAsset>{
 if(row.kind!=='asset'||row.rights.usage!=='reusable'||row.rights.license!=='CC0-1.0'||row.asset?.type!=='image/png')throw new Error('这项来源目前只供参考，不能直接套用。');
 const credit=validateSourceCredit({version:1,recordId:row.id,revision:row.revision,title:row.title,url:row.canonicalUrl,author:row.author.name,authorUrl:row.author.url,collectedAt:row.collectedAt,checkedAt:row.rights.checkedAt,license:row.rights.license,licenseUrl:row.rights.licenseUrl,attribution:row.rights.attribution,changes:[row.rights.changes,'保留原图；在作品中按所选布局缩放与取景。'].filter(Boolean).join(' ').slice(0,1000),evidence:row.rights.evidence,originalHash:row.asset.sha256});
 const controller=new AbortController(),abort=()=>controller.abort();if(signal.aborted)abort();else signal.addEventListener('abort',abort,{once:true});let timeout=false;
 const timer=setTimeout(()=>{timeout=true;controller.abort();},20000);
 try{
  const response=await fetch('/api/sources/public-assets/'+encodeURIComponent(row.id),{signal:controller.signal,cache:'no-store'});
  if(!response.ok)throw new Error('来源已变化或图片暂不可用，请重新核对素材。');
  if(response.headers.get('Content-Type')!=='image/png'||response.headers.get('X-Shiye-Source-Revision')!==String(row.revision)||response.headers.get('X-Shiye-Asset-SHA256')!==row.asset.sha256)throw new Error('图片与当前来源版本不一致，请重新核对素材。');
  if(!response.body)throw new Error('图片内容为空。');const reader=response.body.getReader(),chunks:Uint8Array<ArrayBuffer>[]=[];let length=0;
  try{for(;;){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>8_000_000||length>row.asset.bytes!)throw new Error('素材文件大小发生变化，请重新核对。');chunks.push(value);}}finally{void reader.cancel().catch(()=>{});}
  if(length!==row.asset.bytes)throw new Error('素材文件不完整，请重新核对。');
  const blob=new Blob(chunks,{type:'image/png'}),decoded=await loadImage(blob);if(controller.signal.aborted)throw new DOMException('Aborted','AbortError');
  if(decoded.naturalWidth>4096||decoded.naturalHeight>4096)throw new Error('图片尺寸超出支持范围。');
  return {id:makeId(),name:row.title+'.png',type:'image/png',width:decoded.naturalWidth,height:decoded.naturalHeight,bytes:blob.size,blob,createdAt:Date.now(),sourceCredit:credit};
 }catch(error){if(timeout)throw new Error('读取图片超时，文字仍保留，可重新核对素材。');throw error;}finally{clearTimeout(timer);signal.removeEventListener('abort',abort);}
}
