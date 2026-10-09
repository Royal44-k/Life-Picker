import {test} from 'node:test';import assert from 'node:assert/strict';
import {planStory,newPage,hashText} from '../src/studio/planner.ts';import {DEFAULT_OPTIONS} from '../src/core/layout.ts';import {layoutStory,roughMeasure} from '../src/studio/scene.ts';import {validateStory,makeBundle,readBundle} from '../src/studio/backup.ts';
import {splitWorkPlan} from '../src/studio/split-works.ts';
const make=()=>({...planStory(Array.from({length:14},(_,i)=>'## 观察 '+(i+1)+'\n\n亲手记下第'+(i+1)+'段。').join('\n\n---\n\n'),DEFAULT_OPTIONS,{target:6,cover:false,toc:'no',ending:'none'}),revision:3});
test('split preview keeps confirmed order, text, photos and original; creates bounded independent works',()=>{
 const original=make();original.pages[2].assetId='photo-a';original.pages[2].focusX=.2;original.pages[2].locked=true;const copy=structuredClone(original);
 const result=splitWorkPlan(original,6,roughMeasure);assert.equal(result.drafts.length,3);assert.deepEqual(original,copy);
 assert.deepEqual(result.drafts.flatMap(d=>d.pages.map(p=>p.source)),original.pages.map(p=>p.source));
 assert.equal(result.drafts.flatMap(d=>d.pages).find(p=>p.assetId)?.focusX,.2);
 const ids=result.drafts.flatMap(d=>[d.id,...d.pages.map(p=>p.id)]);assert.equal(new Set(ids).size,ids.length);
 for(const [i,d] of result.drafts.entries()){validateStory(d);assert.ok(layoutStory(d,roughMeasure).length<=6);assert.equal(d.sourceHash,hashText(d.source));assert.deepEqual(d.splitFrom,{id:original.id,revision:3,part:i+1,total:3});}
});
test('generated directory is excluded from short parts while handwritten guide and code remain intact',async()=>{
 const original=make();original.pages.splice(0,0,{...newPage('## 总目录','toc'),tocEntries:original.pages.map(p=>({label:p.source.split('\n')[0].slice(3),targetPageId:p.id}))});
 original.pages[3]={...original.pages[3],source:'const text = "**原样保留**";\n',codeContinuation:true};
 const plan=splitWorkPlan(original,6,roughMeasure);assert.ok(plan.notes.some(n=>/目录/.test(n)));
 assert.ok(plan.drafts.every(s=>s.pages.every(p=>!p.tocEntries)));
 const part=plan.drafts.find(s=>s.pages.some(p=>p.codeContinuation))!;const code=part.pages.find(p=>p.codeContinuation)!;
 assert.equal(code.source,original.pages[3].source);assert.equal(part.source.slice(code.sourceRanges![0].start,code.sourceRanges![0].end),code.source);
 const restored=readBundle(new Uint8Array(await(await makeBundle(part,async()=>undefined)).arrayBuffer())).story;assert.deepEqual(restored.splitFrom,part.splitFrom);
});
test('stale original, a single oversized page and invalid preview limits are refused before persistence',()=>{
 const s=make();assert.throws(()=>splitWorkPlan({...s,source:s.source+' changed'},6),/原文|核对/);
 assert.throws(()=>splitWorkPlan(s,5 as 6),/6|9/);
 s.pages=[newPage('这段很长。'.repeat(2000))];assert.throws(()=>splitWorkPlan(s,6),/分镜|拆为续页/);
});
test('consecutive continuations prefer the same part when they fit without reordering other pages',()=>{
 const s=make();s.pages=s.pages.slice(0,9);s.pages[5].sourceIds=['same'];s.pages[6].sourceIds=['same'];
 const plan=splitWorkPlan(s,6);assert.equal(plan.drafts[0].pages.length,5);assert.equal(plan.drafts[1].pages[0].source,s.pages[5].source);
});
