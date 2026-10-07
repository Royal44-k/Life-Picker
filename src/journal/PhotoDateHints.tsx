import type {MediaAsset} from '../studio/model.ts';
export function PhotoDateHints({assets,date,disabled,onChoose}:{assets:(MediaAsset|undefined)[];date:string;disabled:boolean;onChoose:(date:string)=>void}){
 if(!assets.length)return null;
 const counts=new Map<string,number>();for(const asset of assets)if(asset?.capturedDate)counts.set(asset.capturedDate,(counts.get(asset.capturedDate)||0)+1);
 const unknown=assets.filter(a=>!a?.capturedDate).length;
 return <section className="photo-date-hints" aria-label="核对照片日期">
  {!!counts.size&&<><p>照片留下了这些拍摄日期。核对后再选择，也可以继续手动填写记录日期。</p><div>{[...counts].sort(([a],[b])=>a.localeCompare(b)).map(([value,count])=><button key={value} disabled={disabled} aria-label={'采用拍摄日期：'+value} aria-pressed={date===value} onClick={()=>onChoose(value)}>{value} · {count} 张{date===value?' · 当前日期':''}</button>)}</div></>}
  {!!unknown&&<p>{unknown} 张照片未能读取拍摄日期，保留你设置的记录日期。截图、转存或较早上传的照片可能没有这个信息。</p>}
 </section>;
}
