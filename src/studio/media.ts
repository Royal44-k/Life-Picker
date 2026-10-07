import {readPhotoDate} from './photo-date.ts';
import type {MediaAsset} from './model.ts';
import {makeId} from '../core/storage.ts';
export async function loadImage(blob:Blob):Promise<HTMLImageElement>{
 const url=URL.createObjectURL(blob);const image=new Image();
 try{await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('照片解码超时，请换一张较小的图片。')),20000);image.onload=()=>{clearTimeout(timer);resolve();};image.onerror=()=>{clearTimeout(timer);reject(new Error('无法读取此图片。HEIC 可先在照片中导出为 JPEG，再选择。'));};image.src=url;});return image;}finally{URL.revokeObjectURL(url);}
}
export async function prepareAsset(file:File):Promise<MediaAsset>{
 if(file.size>20_000_000)throw new Error(file.name+' 超过 20 MB，请先缩小图片。');
 if(!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type)&&!/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name))throw new Error('请选择 JPEG、PNG、WebP 或可解码的 HEIC 图片。');
 const capturedDate=await readPhotoDate(file);
 const image=await loadImage(file);const ratio=Math.min(1,2048/Math.max(image.naturalWidth,image.naturalHeight));
 const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(image.naturalHeight*ratio));
 const ctx=canvas.getContext('2d')!;ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
 const width=canvas.width,height=canvas.height;
 const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('图片处理失败。')),'image/jpeg',.9));canvas.width=0;canvas.height=0;
 return {...(capturedDate?{capturedDate}:{}),id:makeId(),name:file.name.slice(0,200),width,height,blob,bytes:blob.size,type:blob.type,createdAt:Date.now()};
}
