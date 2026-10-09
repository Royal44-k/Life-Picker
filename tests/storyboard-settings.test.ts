import {test} from 'node:test';import assert from 'node:assert/strict';
import {storyboardVersion} from '../src/studio/storyboard-settings.ts';
import {planStory} from '../src/studio/planner.ts';import {DEFAULT_OPTIONS} from '../src/core/layout.ts';
test('AI suggestion identity changes with settings, pictures, crop and text but not save counter',()=>{
 const s=planStory('原文。',DEFAULT_OPTIONS,{target:6,cover:true,toc:'auto',ending:'none'}),v=storyboardVersion(s,false);
 assert.notEqual(v,storyboardVersion({...s,settings:{...s.settings,cover:false}},false));
 assert.notEqual(v,storyboardVersion({...s,pages:s.pages.map(p=>({...p,focusX:.1}))},false));
 assert.notEqual(v,storyboardVersion(s,true));
 assert.notEqual(v,storyboardVersion({...s,source:'改过。'},false));
 assert.equal(v,storyboardVersion({...s,revision:90,updatedAt:0},false));
});