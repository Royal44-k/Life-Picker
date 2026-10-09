import {test} from 'node:test';import assert from 'node:assert/strict';
import {planStory,editPage} from '../src/studio/planner.ts';
import {DEFAULT_OPTIONS} from '../src/core/layout.ts';
import {buildSourceUpdate,applySourceUpdate} from '../src/studio/source-update.ts';
import {validateStory,makeBundle,readBundle} from '../src/studio/backup.ts';
const settings={target:0 as const,cover:false,ending:'none' as const,toc:'no' as const};
const text='## 甲\n\n甲的原文。\n\n---\n\n## 乙\n\n乙的原文。';
const seed=()=>planStory(text,DEFAULT_OPTIONS,settings);
test('changing one section preserves unrelated handwritten page, image and current source ranges',()=>{
 let s=seed();s=editPage(s,s.pages[0].id,{source:'## 甲\n\n我的手工改写',assetId:'photo-a',focusX:.2});
 s={...s,source:text.replace('乙的原文。','乙的新经历。')};const plan=buildSourceUpdate(s);
 const choices=Object.fromEntries(plan.rows.filter(r=>r.status!=='unchanged').map(r=>[r.id,'replace']));
 const next=applySourceUpdate(s,plan,choices);assert.equal(next.pages.length,2);assert.equal(next.pages[0].id,s.pages[0].id);assert.match(next.pages[0].source,/我的手工改写/);assert.equal(next.pages[0].assetId,'photo-a');assert.equal(next.pages[0].focusX,.2);assert.match(next.pages[1].source,/乙的新经历/);
 assert.equal(next.compiledSource,s.source);assert.equal(next.pages[0].sourceVersion,next.sourceHash);assert.equal(next.pages[0].sourceRanges?.length,2);validateStory(next);
});
test('explicit keep preserves a changed page without pretending its old offsets belong to the new source',()=>{
 const s={...seed(),source:text.replace('乙的原文。','乙的新经历。')},p=buildSourceUpdate(s);
 const row=p.rows.find(r=>r.status==='changed')!;assert.ok(row);assert.throws(()=>applySourceUpdate(s,p,{}),/选择|确认/);
 const next=applySourceUpdate(s,p,{[row.id]:'keep'}),old=next.pages.find(p=>p.source.includes('乙的原文'))!;
 assert.ok(old.retainedFromPrevious);assert.equal(old.sourceRanges,undefined);assert.equal(old.sourceVersion,undefined);
 assert.throws(()=>applySourceUpdate({...s,source:s.source+'又变了'},p,{[row.id]:'keep'}),/变化/);
});
test('added and removed sections have explicit choices without duplicating unchanged text',()=>{
 const s={...seed(),source:'## 新章\n\n新增真实经历。\n\n---\n\n## 甲\n\n甲的原文。'};
 const p=buildSourceUpdate(s);const choices=Object.fromEntries(p.rows.filter(r=>r.status!=='unchanged').map(r=>[r.id,'replace']));
 const n=applySourceUpdate(s,p,choices);assert.equal(n.pages.length,2);assert.match(n.pages[0].source,/新增真实经历/);assert.match(n.pages[1].source,/甲的原文/);assert.ok(!n.pages.some(p=>p.source.includes('乙的原文')));
});
test('locked changed group cannot be replaced until unlocked and explicit keep retains it',()=>{
 let s=seed();s=editPage(s,s.pages[1].id,{locked:true});s={...s,source:text.replace('乙的原文。','乙的新经历。')};
 const p=buildSourceUpdate(s),row=p.rows.find(r=>r.locked)!;assert.ok(row);
 assert.throws(()=>applySourceUpdate(s,p,{[row.id]:'replace'}),/锁定/);
 const n=applySourceUpdate(s,p,{[row.id]:'keep'});assert.equal(n.pages.length,2);assert.ok(n.pages[1].locked);
});
test('old unmapped works and reordered or repeated blocks require review instead of guessing correspondence',()=>{
 let s=seed();delete s.compiledSource;s={...s,source:text.replace('甲的原文。','完全不同。')};let p=buildSourceUpdate(s);assert.ok(p.rows.some(r=>r.status==='review'));
 const d=planStory('相同的话。\n\n---\n\n相同的话。',DEFAULT_OPTIONS,settings);p=buildSourceUpdate({...d,source:'开场\n\n'+d.source});assert.ok(p.rows.some(r=>r.status==='review'));
 const moved={...seed(),source:'## 乙\n\n乙的原文。\n\n---\n\n## 甲\n\n甲的原文。'};assert.ok(buildSourceUpdate(moved).rows.some(r=>r.status==='review'));
});
test('confirmed source and retained-page marker survive work backup with old format still accepted',async()=>{
 const s={...seed(),source:text.replace('乙的原文。','乙的新经历。')},p=buildSourceUpdate(s);
 const n=applySourceUpdate(s,p,Object.fromEntries(p.rows.filter(r=>r.status!=='unchanged').map(r=>[r.id,'keep'])));
 const blob=await makeBundle(n,async()=>undefined),restored=readBundle(new Uint8Array(await blob.arrayBuffer())).story;
 assert.equal(restored.compiledSource,n.source);assert.ok(restored.pages.some(p=>p.retainedFromPrevious));
 assert.throws(()=>validateStory({...n,compiledSource:100}),/原文|来源/);
});

test('new explicit page breaks require confirmation and keeping old manual ordering does not silently reset it',()=>{
 const original=planStory('第一段。\n\n第二段。',DEFAULT_OPTIONS,settings);
 const s={...original,source:'第一段。\n\n---\n\n第二段。'},p=buildSourceUpdate(s);
 assert.ok(p.rows.some(r=>r.status==='changed'));
 const n=applySourceUpdate(s,p,Object.fromEntries(p.rows.filter(r=>r.status!=='unchanged').map(r=>[r.id,'replace'])));
 assert.equal(n.pages.length,2);
 const reordered=seed();reordered.pages.reverse();reordered.source=text.replace('乙的原文。','乙的新经历。');
 const update=buildSourceUpdate(reordered),result=applySourceUpdate(reordered,update,Object.fromEntries(update.rows.filter(r=>r.status!=='unchanged').map(r=>[r.id,'replace'])));
 assert.match(result.pages[0].source,/乙的新经历/);assert.match(result.pages[1].source,/甲的原文/);
});

test('unchanged or explicitly kept continuation groups preserve interleaved manual page order',()=>{
 const source='## 长记录\n\n'+'甲的经历与观察。'.repeat(280)+'\n\n---\n\n## 另一个角度\n\n单独保留的片段。';
 const story=planStory(source,DEFAULT_OPTIONS,settings);assert.ok(story.pages.length>3);
 const last=story.pages.pop()!;story.pages.splice(1,0,last);
 const expected=story.pages.map(p=>p.id);
 const unchanged=buildSourceUpdate(story);assert.ok(unchanged.rows.every(r=>r.status==='unchanged'));
 assert.deepEqual(applySourceUpdate(story,unchanged,{}).pages.map(p=>p.id),expected);
 const edited={...story,source:source.replaceAll('甲的经历','乙的新经历')};
 const changed=buildSourceUpdate(edited),choices=Object.fromEntries(changed.rows.filter(r=>r.status!=='unchanged').map(r=>[r.id,'keep']));
 assert.deepEqual(applySourceUpdate(edited,changed,choices).pages.map(p=>p.id),expected);
 const appended=applySourceUpdate(edited,changed,Object.fromEntries(changed.rows.filter(r=>r.status!=='unchanged').map(r=>[r.id,'append'])));
 assert.deepEqual(appended.pages.filter(p=>expected.includes(p.id)).map(p=>p.id),expected);
});
