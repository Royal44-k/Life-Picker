import {plainInline} from '../core/markdown.ts';

export type SourceKind='heading'|'paragraph'|'list'|'quote'|'code'|'break'|'blank';
export interface SourceBlock {
 id:string;kind:SourceKind;text:string;start:number;end:number;
 level?:number;parentId?:string;sectionId?:string;
}
export interface SourceHeading {id:string;label:string;level:number;start:number;end:number;parentId?:string}
export interface SourceIndex {blocks:SourceBlock[];headings:SourceHeading[]}
function digest(text:string){let hash=2166136261;for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619);return(hash>>>0).toString(36);}
function kindOf(text:string):SourceKind{
 const value=text.trim();
 if(!value)return 'blank';
 if(/^\s*```/.test(text))return 'code';
 if(/^(---+|\*\*\*+|___+)$/.test(value))return 'break';
 if(/^#{1,6}\s+.+/.test(value))return 'heading';
 if(/^([-*+] |\d+[.)] ).+/.test(value))return 'list';
 if(/^>\s?/.test(value))return 'quote';
 return 'paragraph';
}
export function indexSource(source:string,initialCode=false):SourceIndex{
 if(source.length>20000)throw new Error('每篇最多 20,000 字符。');
 let offset=0;
 const lines=[...source.matchAll(/[^\r\n]*(?:\r\n|\r|\n|$)/g)].filter(m=>m[0].length).map(m=>{
  const line={text:m[0],start:offset,end:offset+m[0].length};offset=line.end;return line;
 });
 const blocks:SourceBlock[]=[],headings:SourceHeading[]=[],stack:SourceHeading[]=[];
 const repeats=new Map<string,number>();
 for(let i=0;i<lines.length;){
  const begin=i,kind=initialCode&&i===0?'code':kindOf(lines[i].text);i++;
  if(kind==='code'&&!(initialCode&&begin===0&&/^\s*`/.test(lines[0].text))){
   while(i<lines.length){const closing=/^\s*```/.test(lines[i].text);i++;if(closing)break;}
  }else if(!['heading','break'].includes(kind)){
   while(i<lines.length&&kindOf(lines[i].text)===kind)i++;
  }
  const start=lines[begin].start,end=lines[i-1].end,text=source.slice(start,end);
  const fingerprint=kind+':'+digest(text.replace(/\r\n?/g,'\n').trim());
  const count=repeats.get(fingerprint)||0;repeats.set(fingerprint,count+1);
  const id='block:'+fingerprint+':'+count;
  const block:SourceBlock={id,kind,text,start,end};
  if(kind==='heading'){
   const match=/^(#{1,6})\s+(.+)$/.exec(text.trim())!;
   const level=match[1].length;while(stack.length&&stack.at(-1)!.level>=level)stack.pop();
   const heading:SourceHeading={id,label:plainInline(match[2]),level,start,end,parentId:stack.at(-1)?.id};
   block.level=level;block.parentId=heading.parentId;headings.push(heading);stack.push(heading);
  }else block.parentId=stack.at(-1)?.id;
  block.sectionId=[...stack].reverse().find(h=>h.level<=2)?.id||stack[0]?.id;
  blocks.push(block);
 }
 return {blocks,headings};
}

export function sourceReferences(index:SourceIndex,start:number,end:number){
 return index.blocks.filter(b=>!['blank','break'].includes(b.kind)&&b.start<end&&b.end>start)
  .map(b=>({blockId:b.id,start:Math.max(start,b.start),end:Math.min(end,b.end)}));
}
