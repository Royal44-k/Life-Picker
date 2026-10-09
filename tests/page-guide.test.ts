import test from 'node:test';import assert from 'node:assert/strict';import {guideForPage,appendGuidedAnswer,guideVersion} from '../src/studio/page-guide.ts';import {newPage,planStory} from '../src/studio/planner.ts';import {DEFAULT_OPTIONS} from '../src/core/layout.ts';
test('Xiaoshi guide uses actual role/text/photo evidence and never invents visual analysis or a hierarchy',()=>{
 const p=newPage('## 我的步骤\n\n1. 先记下当时的想法\n2. 再核对照片日期');const g=guideForPage(p,'tutorial');assert.equal(g.template,'steps');assert.match(g.reason,/顺序/);assert.equal(g.prompts.length,2);assert.ok(g.evidence.every(x=>p.source.includes(x)));
 assert.match(guideForPage({...p,role:'cover'},'knowledge').reason,/封面/);assert.match(guideForPage({...p,role:'ending'},'knowledge').reason,/收尾/);
 assert.match(guideForPage({...newPage('只留下当时的心情。'),assetId:'photo'},'life').reason,/照片/);assert.ok(!guideForPage({...newPage(''),assetId:'photo'},'life').reason.includes('看见'));
 assert.match(guideForPage(newPage('3 次测试，耗时 2 小时。'),'product').prompts.join(''),/数字|依据/);
 assert.equal(guideForPage(newPage('\x60\x60\x60js\nx=1\n\x60\x60\x60'),'knowledge').canAppend,false);
 assert.ok(guideForPage(newPage(''),'knowledge').prompts.length);assert.notEqual(guideForPage(newPage('- 甲\n- 乙\n- 丙'),'knowledge').template,'pyramid');
});
test('guided answer changes only selected page and rejects stale, locked, code, empty and duplicate applications',()=>{
 const s=planStory('## 原稿\n\n要保留的细节。\n\n---\n\n另一页保持原样。',DEFAULT_OPTIONS,{target:0,cover:false,ending:'none'}),id=s.pages[0].id,rev=guideVersion(s,id),answer='我当时先注意到窗外的树影。';const next=appendGuidedAnswer(s,id,answer,rev);
 assert.equal(next.source,s.source);assert.equal(next.pages[0].source,s.pages[0].source+'\n\n'+answer);assert.deepEqual(next.pages[1],s.pages[1]);assert.equal(s.pages[0].source.includes(answer),false);
 assert.throws(()=>appendGuidedAnswer(next,id,answer,rev),/变化|旧/);assert.throws(()=>appendGuidedAnswer(next,id,answer,guideVersion(next,id)),/重复|已经/);
 assert.throws(()=>appendGuidedAnswer({...s,pages:s.pages.map(p=>p.id===id?{...p,locked:true}:p)},id,answer,rev),/锁定/);
 assert.throws(()=>appendGuidedAnswer(s,id,' ',rev),/回答/);assert.throws(()=>appendGuidedAnswer(s,id,'x'.repeat(1501),rev),/回答/);
 const code={...s,pages:[{...s.pages[0],codeContinuation:true}]};assert.throws(()=>appendGuidedAnswer(code,id,answer,guideVersion(code,id)),/代码/);
});

