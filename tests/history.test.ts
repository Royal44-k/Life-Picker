import {test} from 'node:test';import assert from 'node:assert/strict';
import {archiveHistory,rememberHistory,readHistory} from '../src/studio/history.ts';
import {planStory} from '../src/studio/planner.ts';import {DEFAULT_OPTIONS} from '../src/core/layout.ts';
test('typing author and series keeps a manual checkpoint while discrete page changes are archived',()=>{
 let story=planStory('我的原始记录。',DEFAULT_OPTIONS,{target:0,cover:false,ending:'none'});
 story.revision=1;let row=rememberHistory(readHistory(undefined,story.id),story,'手动保留',1000);
 const manual=row.entries[0].id;
 for(let i=0;i<80;i++){
  const key=i<40?'series':'author',next={...story,revision:story.revision+1,options:{...story.options,[key]:story.options[key]+'字'}};
  row=archiveHistory(row,story,next,false,1001+i);story=next;
 }
 assert.ok(row.entries.some(e=>e.id===manual),'typing must not evict the manual version');
 assert.ok(row.entries.length<5,'ordinary metadata typing should coalesce');
 const locked={...story,revision:story.revision+1,pages:story.pages.map(p=>({...p,locked:true}))};
 row=archiveHistory(row,story,locked,false,1100);
 assert.ok(row.entries.some(e=>e.story.revision===story.revision),'locking remains a structural checkpoint');
});
