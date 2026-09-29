import { zipSync } from 'fflate';
import type { CardLayout, CardOptions, Draft } from './types.ts';
import { drawCard, createMeasure } from './renderer.ts';
import { layoutDocument } from './layout.ts';
import { documentTitle } from './markdown.ts';

export const safeName = (text: string) => text.replace(/[<>:"/\\|?*\x00-\x1f]/g,'').trim().slice(0,45) || '拾页图文';
export function makePng(card: CardLayout, options: CardOptions): Promise<Blob> {
  const canvas=document.createElement('canvas');drawCard(canvas,card,options);
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>{canvas.width=0;canvas.height=0;if(blob)resolve(blob);else reject(new Error('图片生成失败，请重试。'));},'image/png'));
}
export function download(blob: Blob, filename: string): void {
  const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=filename;
  document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60_000);
}
export async function exportZip(drafts: Draft[], onProgress: (message:string)=>void): Promise<Blob> {
  const files: Record<string,Uint8Array>={};
  let bytes=0;
  for(let d=0;d<drafts.length;d++) {
    const draft=drafts[d];
    const cards=layoutDocument(draft.source,draft.options,createMeasure(draft.options));
    for(let i=0;i<cards.length;i++) {
      onProgress(`正在整理第 ${d+1}/${drafts.length} 篇 · ${i+1}/${cards.length} 页`);
      const blob=await makePng(cards[i],draft.options);bytes+=blob.size;
      if(bytes>120_000_000)throw new Error('本次图片超过 120 MB，请分批导出以避免手机内存不足。');
      const dir=`${String(d+1).padStart(2,'0')}-${safeName(documentTitle(draft.source))}`;
      files[`${dir}/${String(i+1).padStart(2,'0')}.png`]=new Uint8Array(await blob.arrayBuffer());
      await new Promise(resolve=>setTimeout(resolve,0));
    }
  }
  if(!Object.keys(files).length)throw new Error('所选草稿没有可导出的文字。');
  return new Blob([zipSync(files,{level:0}) as Uint8Array<ArrayBuffer>],{type:'application/zip'});
}
