import type {CardOptions,MeasureText} from '../core/types.ts';
import {indexSource,sourceReferences} from './content.ts';
import type {SourceBlock} from './content.ts';
import {contentHeight,pageCapacity,roughMeasure} from './scene.ts';

export interface ContentPage {text:string;start:number;end:number;codeContinuation:boolean;references:{blockId:string;start:number;end:number}[]}
interface Unit {start:number;end:number}
export function paginateSource(source:string,options:CardOptions,measure:MeasureText=roughMeasure,initialCode=false,preferences?:{target:number}):ContentPage[]{
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
 const allUnits:Unit[]=[],regionEnds:number[]=[];
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
  allUnits.push(...units);
  regionEnds.push(...units.map(()=>allUnits.length));
 }
 const count=allUnits.length;if(!count)return result;
 // A state is (next semantic unit, remaining pages); edges cannot cross explicit breaks.
 const costs=Array.from({length:count+1},()=>new Float64Array(61).fill(Infinity));
 const next=Array.from({length:count},()=>new Uint32Array(61));costs[count][0]=0;
 for(let i=count-1;i>=0;i--){
  for(let j=i;j<Math.min(regionEnds[i],i+24);j++){
   const h=height(allUnits[i].start,allUnits[j].end);if(h>capacity)break;
   const crossed=index.headings.filter(b=>b.level<=2&&b.start>allUnits[i].start&&b.start<allUnits[j].end).length;
   const score=100+300*(1-Math.min(1,h/capacity))**2+crossed*600;
   for(let k=1;k<=Math.min(60,count-i);k++){
    const value=score+costs[j+1][k-1];
    if(value<costs[i][k]){costs[i][k]=value;next[i][k]=j+1;}
   }
  }
 }
 const target=Math.max(1,Math.min(60,Math.floor(preferences?.target||9)));
 let pages=0,best=Infinity;
 for(let k=1;k<=60;k++){const score=costs[0][k]+1250*Math.max(0,k-target)**2;if(score<best){best=score;pages=k;}}
 if(!pages)throw new Error('超过 60 页或内容无法在当前字号内分页，请拆成多篇作品。');
 for(let i=0,k=pages;i<count;k--){const end=next[i][k];if(end<=i)throw new Error('这一段无法分页，请检查内容。');push(allUnits[i].start,allUnits[end-1].end);i=end;}
 return result;
}
