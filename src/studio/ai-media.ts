import {getAsset} from './database.ts';import {loadImage} from './media.ts';
export async function selectedAiImages(ids:string[],signal?:AbortSignal):Promise<string[]>{
 if(ids.length>3)throw new Error('一次最多发送 3 张照片。');const out:string[]=[];
 for(const id of ids){if(signal?.aborted)throw new DOMException('Cancelled','AbortError');const asset=await getAsset(id);if(!asset)throw new Error('选择的照片已不存在，请重新选择。');const image=await loadImage(asset.blob),canvas=document.createElement('canvas'),scale=Math.min(1,768/Math.max(image.naturalWidth,image.naturalHeight));canvas.width=Math.round(image.naturalWidth*scale);canvas.height=Math.round(image.naturalHeight*scale);try{canvas.getContext('2d')!.drawImage(image,0,0,canvas.width,canvas.height);const encoded=canvas.toDataURL('image/jpeg',.78);if(encoded.length>450000)throw new Error('有照片压缩后仍过大，请换一张较小的照片。');out.push(encoded);}finally{canvas.width=0;canvas.height=0;}}
 return out;
}
