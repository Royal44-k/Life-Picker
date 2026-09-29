import type {CardOptions,MeasureText} from '../core/types.ts';
import {indexSource,sourceReferences} from './content.ts';
import type {SourceBlock} from './content.ts';
import {contentHeight,pageCapacity,roughMeasure} from './scene.ts';

export interface ContentPage {text:string;start:number;end:number;codeContinuation:boolean;references:{blockId:string;start:number;end:number}[]}
interface Unit {start:number;end:number}
export function paginateSource(source:string,options:CardOptions,measure:MeasureText=roughMeasure,initialCode=false):ContentPage[]{
 const index=indexSource(source,initialCode),capacity=pageCapacity(options);
 const code=index.blocks.filter(b=>b.kind==='code');
 const inCode=(position:number)=>code.some(b=>position<b.end&&(position>b.start||(initialCode&&b.start===0&&position===0)));
 const span=(start:number,end:number)=>{
  if(!inCode(start))start+=source.slice(start,end).match(/^\s*/)?.[0].length||0;
  if(!inCode(end))end-=source.slice(start,end).match(/\s*$/)?.[0].length||0;
  return {start,end:Math.max(start,end)};
 };
 const cache=new Map<string,number>();
 const height=(start:number,end:number)=>{
  const key=start+':'+end;const cached=cache.get(key);if(cached!==undefined)return cached;
  const s=span(start,end);const value=contentHeight((inCode(s.start)?'```\n':'')+source.slice(s.start,s.end),options,measure);
  cache.set(key,value);return value;
 };
 const regions:SourceBlock[][]=[[]];
 for(const b of index.blocks){if(b.kind==='break')regions.push([]);else if(b.kind!=='blank')regions.at(-1)!.push(b);}
 if(regions.filter(r=>r.length).length>60)throw new Error('超过 60 页，请拆成多篇作品。');
 const result:ContentPage[]=[];
 const push=(start:number,end:number)=>{
  const s=span(start,end);if(s.end>s.start)result.push({...s,text:source.slice(s.start,s.end),codeContinuation:inCode(s.start),references:sourceReferences(index,s.start,s.end)});
  if(result.length>60)throw new Error('超过 60 页，请拆成多篇作品。');
 };
 for(const blocks of regions){
  if(!blocks.length)continue;
  const units:Unit[]=[];
  for(let i=0;i<blocks.length;i++){
   const start=blocks[i].start;let end=blocks[i].end;
   if(blocks[i].kind==='heading'){
    while(i+1<blocks.length&&blocks[i+1].kind==='heading'){i++;end=blocks[i].end;}
    if(i+1<blocks.length){i++;end=blocks[i].end;}
   }
   let cursor=start;
   while(height(cursor,end)>capacity){
    const text=source.slice(cursor,end);
    const boundaries=[...new Intl.Segmenter('zh-CN',{granularity:'grapheme'}).segment(text)].map(s=>s.index);boundaries.push(text.length);
    let lo=1,hi=boundaries.length-1;
    while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(height(cursor,cursor+boundaries[mid])<=capacity)lo=mid;else hi=mid-1;}
    let cut=boundaries[lo];const prefix=text.slice(0,cut);
    const candidates=[...prefix.matchAll(/\n\n|[。！？!?]\s*|\n/g)].map(m=>m.index!+m[0].length);
    const natural=candidates.filter(n=>n>cut*.55&&n<=cut).at(-1);if(natural)cut=natural;
    // Do not split the syntax of a fenced-code delimiter.
    const lineStart=text.lastIndexOf('\n',Math.max(0,cut-1))+1;
    const lineEnd=text.indexOf('\n',lineStart);
    if(/^\s*```/.test(text.slice(lineStart,lineEnd<0?undefined:lineEnd))&&cut>lineStart&&cut<(lineEnd<0?text.length:lineEnd+1)){
     if(lineStart>0)cut=lineStart;else if(lineEnd>=0)cut=lineEnd+1;
    }
    if(cut<=0||height(cursor,cursor+cut)>capacity)throw new Error('内容无法在当前字号内分页，请调整这一段。');
    units.push({start:cursor,end:cursor+cut});cursor+=cut;

   }
   if(cursor<end)units.push({start:cursor,end});
  }
  // Each position considers at most 24 semantic units; measurements are cached.
  const costs=new Array<number>(units.length+1).fill(Infinity),next=new Array<number>(units.length);
  costs[units.length]=0;
  for(let i=units.length-1;i>=0;i--){
   for(let j=i;j<Math.min(units.length,i+24);j++){
    const h=height(units[i].start,units[j].end);if(h>capacity)break;
    const crossed=index.headings.filter(b=>b.level<=2&&b.start>units[i].start&&b.start<units[j].end).length;
    const density=Math.min(1,h/capacity);
    const score=100+300*(1-density)**2+crossed*600+costs[j+1];
    if(score<costs[i]){costs[i]=score;next[i]=j+1;}
   }
  }
  for(let i=0;i<units.length;){const end=next[i];if(end===undefined)throw new Error('这一段无法分页，请检查内容。');push(units[i].start,units[end-1].end);i=end;}
 }
 return result;
}
