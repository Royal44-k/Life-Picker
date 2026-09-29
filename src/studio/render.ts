import type {Scene,MediaAsset,Story} from './model.ts';
import type {CardOptions} from '../core/types.ts';
import {getTheme} from '../core/themes.ts';
import {font,createMeasure} from '../core/renderer.ts';
import {layoutStory} from './scene.ts';
import {loadImage} from './media.ts';
import {getAsset} from './database.ts';
import {hashText} from './planner.ts';
import {safeName} from '../core/export.ts';
import {zipSync} from 'fflate';
export async function drawScene(canvas:HTMLCanvasElement,scene:Scene,options:CardOptions,width=1080,resolve:(id:string)=>Promise<MediaAsset|undefined>=getAsset){
 const image=scene.assetId?await resolve(scene.assetId):undefined;
 if(scene.assetId&&!image)throw new Error('照片缺失，请回到素材面板重新选择。');
 const decoded=image?await loadImage(image.blob):null;
 canvas.width=width;canvas.height=Math.round(scene.height*width/1080);const ctx=canvas.getContext('2d')!;ctx.scale(width/1080,width/1080);
 const t=getTheme(options.theme),accent=options.accent||t.accent;
 ctx.fillStyle=t.paper;ctx.fillRect(0,0,1080,scene.height);ctx.textBaseline='top';
 ctx.fillStyle=accent;ctx.fillRect(88,75,20,20);ctx.font=font(24,500,'paragraph',options);ctx.fillText(options.series||'把经历，编成作品',126,73);
 ctx.textAlign='right';ctx.fillStyle=t.muted;ctx.fillText(String(scene.index+1).padStart(2,'0'),992,73);ctx.textAlign='left';
 ctx.strokeStyle=t.wash;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(88,132);ctx.lineTo(992,132);ctx.stroke();
 for(const shape of scene.shapes){
  const color=shape.color==='accent'?accent:shape.color==='ink'?t.ink:t.wash;ctx.fillStyle=color;ctx.strokeStyle=color;
  if(shape.kind==='polygon'&&shape.points){ctx.beginPath();shape.points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}
  else if(shape.kind==='line'){ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(shape.x,shape.y);ctx.lineTo(shape.x+shape.w,shape.y+shape.h);ctx.stroke();}
  else {ctx.beginPath();ctx.roundRect(shape.x,shape.y,shape.w,shape.h,12);ctx.fill();}
 }
 if(decoded&&scene.photo){
  const p=scene.photo;const scale=p.fit==='cover'?Math.max(p.w/decoded.naturalWidth,p.h/decoded.naturalHeight):Math.min(p.w/decoded.naturalWidth,p.h/decoded.naturalHeight);
  const w=decoded.naturalWidth*scale,h=decoded.naturalHeight*scale;
  ctx.save();ctx.beginPath();ctx.roundRect(p.x,p.y,p.w,p.h,16);ctx.clip();ctx.fillStyle=t.wash;ctx.fillRect(p.x,p.y,p.w,p.h);
  ctx.drawImage(decoded,p.x+(p.w-w)*p.focusX,p.y+(p.h-h)*p.focusY,w,h);ctx.restore();
 }
 for(const line of scene.lines){
  if(line.kind==='quote'||line.kind==='code'){ctx.fillStyle=t.wash;ctx.fillRect(80,line.y-2,920,line.lineHeight+4);}
  ctx.font=font(line.size,line.weight,line.kind,options);ctx.fillStyle=line.kind==='heading'||line.emphasis||scene.role==='cover'?accent:t.ink;
  ctx.fillText(line.text,line.x,line.y+(line.lineHeight-line.size)*.16);
  if(line.marker){ctx.fillStyle=accent;ctx.font=font(28,500,'list',options);ctx.fillText(line.marker,88,line.y+10);}
 }
 ctx.strokeStyle=t.wash;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(88,scene.height-116);ctx.lineTo(992,scene.height-116);ctx.stroke();
 ctx.font=font(24,500,'paragraph',options);ctx.fillStyle=t.muted;ctx.fillText(options.author||'拾页',88,scene.height-80);
 ctx.textAlign='right';ctx.fillText((scene.index+1)+' / '+scene.total,992,scene.height-80);ctx.textAlign='left';
}
export async function scenePng(scene:Scene,options:CardOptions):Promise<Blob>{
 const canvas=document.createElement('canvas');try{await drawScene(canvas,scene,options);return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('图片导出失败。')),'image/png'));}finally{canvas.width=0;canvas.height=0;}
}
export function confirmedScenes(story:Story):Scene[]{
 if(hashText(story.source)!==story.sourceHash)throw new Error('原文已修改，请先生成分镜，再导出最新内容。');
 if(!story.pages.length)throw new Error('先写一点内容，再生成分镜。');
 return layoutStory(story,createMeasure(story.options));
}
export async function storyZip(story:Story,progress:(message:string)=>void):Promise<Blob>{
 const scenes=confirmedScenes(story);const files:Record<string,Uint8Array>={};let bytes=0;
 for(const scene of scenes){progress('正在导出 '+(scene.index+1)+' / '+scenes.length+' 页');const blob=await scenePng(scene,story.options);bytes+=blob.size;if(bytes>120_000_000)throw new Error('图片超过 120 MB，请拆成较小的作品。');files[safeName(story.title)+'/'+String(scene.index+1).padStart(2,'0')+'.png']=new Uint8Array(await blob.arrayBuffer());await new Promise(r=>setTimeout(r,0));}
 return new Blob([zipSync(files,{level:0}) as Uint8Array<ArrayBuffer>],{type:'application/zip'});
}
