import {test} from 'node:test';import assert from 'node:assert/strict';
import {planStory,newPage} from '../src/studio/planner.ts';import {layoutStory,roughMeasure} from '../src/studio/scene.ts';import {DEFAULT_OPTIONS} from '../src/core/layout.ts';
const seed=()=>planStory('自己的原文',DEFAULT_OPTIONS,{target:0,cover:false,toc:'no',ending:'none'});
test('decorative prose falls back before extra pages, with original text and template retained',()=>{
 const s=seed();s.pages=[{...newPage('## 认真记下\n\n'+'留下自己的细节。'.repeat(30)),template:'quote'}];const original=structuredClone(s);
 const scenes=layoutStory(s,roughMeasure);assert.equal(scenes.length,1);assert.ok(scenes[0].warnings.some(w=>/布局|留白|文字/.test(w)));
 assert.equal(scenes[0].lines.map(l=>l.text).join('').replace(/\s/g,''),'认真记下'+'留下自己的细节。'.repeat(30));
 assert.deepEqual(s,original);assert.ok(scenes[0].adjustments?.length);
});
test('moderate overflow uses bounded spacing or font adjustment and long text still continues without truncation',()=>{
 const s=seed();s.pages=[newPage('自己的记录。'.repeat(60))];
 const scenes=layoutStory(s,roughMeasure);assert.equal(scenes.length,1);assert.ok(scenes[0].adjustments?.length);
 for(const l of scenes[0].lines)assert.ok(l.size>=36&&l.y+l.lineHeight<=1295);
 s.pages[0].source='自己的记录👨‍👩‍👧‍👦。'.repeat(400);
 const long=layoutStory(s,roughMeasure);assert.ok(long.length>1);assert.equal(long.flatMap(s=>s.lines.map(l=>l.text)).join(''),s.pages[0].source);
});
test('fallback retains the photograph once and never mutates crop or page role',()=>{
 const s=seed();s.pages=[{...newPage('我的照片与记录。'.repeat(50)),template:'photo-magazine',assetId:'photo-a',focusX:.2}];const copy=structuredClone(s);
 const scenes=layoutStory(s,roughMeasure);assert.equal(scenes.filter(s=>s.assetId==='photo-a').length,1);assert.equal(scenes[0].photo?.focusX,.2);assert.deepEqual(s,copy);
});
test('all original templates declare measured capacity, compatible roles and readable body limits',async()=>{
 const {TEMPLATES}=await import('../src/studio/templates.ts'),{templateContract}=await import('../src/studio/template-contracts.ts');
 for(const t of TEMPLATES){const c=templateContract(t.id);assert.ok(c.roles.length);assert.ok(c.bodyFont.min>=36);assert.ok(c.bodyFont.max>=c.bodyFont.min);assert.ok(c.capacity(1440,false)>0);assert.ok(c.fallback);}
});
test('inspection locates missing photos, stale source, pending AI and excess pages; decoration labels are not body text',async()=>{
 const {inspectLayout}=await import('../src/studio/diagnostics.ts');const s=seed();s.settings.target=6;s.source+='原文有更新';s.pages[0].assetId='missing';s.aiReviewed=false;
 const scenes=Array.from({length:7},(_,i)=>({...layoutStory(seed(),roughMeasure)[0],index:i,total:7,pageId:s.pages[0].id}));
 const issues=inspectLayout(s,scenes,[]);for(const kind of ['missing-photo','source','ai-review','target'])assert.ok(issues.some(i=>i.kind===kind));
 assert.equal(issues.find(i=>i.kind==='missing-photo')?.sceneIndex,0);
 const step=seed();step.pages=[{...newPage('## 动作\n\n第一项。\n\n第二项。'),template:'steps'}];
 assert.ok(!inspectLayout(step,layoutStory(step,roughMeasure),[]).some(i=>i.kind==='small-type'));
});

test('export refuses stale per-page source references even when the whole original hash is current',async()=>{
 const {confirmedScenes}=await import('../src/studio/render.ts');const s=seed();s.pages[0].sourceVersion='older-original';
 assert.throws(()=>confirmedScenes(s),/来源|核对/);
});
