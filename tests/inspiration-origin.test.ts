import test from 'node:test';import assert from 'node:assert/strict';
import {planStory} from '../src/studio/planner.ts';import {DEFAULT_OPTIONS} from '../src/core/layout.ts';import {validateStory,makeBundle,readBundle} from '../src/studio/backup.ts';
const origin={version:1,source:{id:'ref-1',revision:2,title:'参考',url:'https://example.com/source',author:'作者',checkedAt:1},records:[{id:'entry-1',revision:2,date:'2026-10-05'}],model:'test-model',generatedAt:2};
const story=()=>({...planStory('## 我的草稿\n\n一段原本属于自己的内容。',DEFAULT_OPTIONS,{target:0,cover:true,ending:'none'}),inspiration:origin});
test('AI work keeps minimal selected-record revisions and source attribution through backup',async()=>{const s=story(),blob=await makeBundle(s,async()=>undefined),r=readBundle(new Uint8Array(await blob.arrayBuffer()));assert.deepEqual(r.story.inspiration,origin);assert.equal(r.story.source,s.source);});
test('AI provenance rejects unsafe sources, duplicate or invalid private-record references',()=>{
 for(const bad of [{...origin,source:{...origin.source,url:'javascript:alert(1)'}},{...origin,records:[...origin.records,...origin.records]},{...origin,records:[{...origin.records[0],date:'2026-02-30'}]},{...origin,records:[{...origin.records[0],revision:0}]},{...origin,generatedAt:NaN}])assert.throws(()=>validateStory({...story(),inspiration:bad}),/创作来源/);
});
