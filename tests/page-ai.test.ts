import test from 'node:test';import assert from 'node:assert/strict';
import {pageVersion,applyPageSuggestion} from '../src/studio/page-ai.ts';
import {planStory,editPage} from '../src/studio/planner.ts';import {DEFAULT_OPTIONS} from '../src/core/layout.ts';
test('single-page suggestions apply only to the unchanged unlocked target and keep other pages/photos',()=>{
 const s=planStory('## 我的记录\n\n第一段。\n\n---\n\n## 另一个发现\n\n第二段。',DEFAULT_OPTIONS,{target:0,cover:false,ending:'none'});const p=s.pages[0];p.assetId='my-photo';p.template='memo';
 const revision=pageVersion(s,p);const candidate={revision,text:'## 更清楚的记录\n\n我自己的第一段。'};
 const next=applyPageSuggestion(s,p.id,candidate);assert.equal(next.source,s.source);assert.deepEqual(next.pages[1],s.pages[1]);assert.equal(next.pages[0].assetId,'my-photo');assert.equal(next.pages[0].template,'memo');assert.equal(s.pages[0].source,p.source);
 assert.throws(()=>applyPageSuggestion(editPage(s,p.id,{source:'我后来又改了'}),p.id,candidate),/变化/);
 assert.throws(()=>applyPageSuggestion({...s,source:s.source+'后来'},p.id,candidate),/变化/);
 assert.throws(()=>applyPageSuggestion(editPage(s,p.id,{locked:true}),p.id,candidate),/锁定/);
 assert.throws(()=>applyPageSuggestion({...s,pages:[]},p.id,candidate),/不存在/);
});
