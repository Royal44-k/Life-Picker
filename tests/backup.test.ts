import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateStory,readBundle,makeBundle} from '../src/studio/backup.ts';
import {planStory} from '../src/studio/planner.ts';
import {DEFAULT_OPTIONS} from '../src/core/layout.ts';
test('backup round trip preserves edits and image bytes',async()=>{
 const s=planStory('原文',DEFAULT_OPTIONS,{target:0,cover:false,ending:'none'});s.pages[0].source='手动修改';s.pages[0].assetId='photo';
 const a={id:'photo',name:'图片',type:'image/png',width:1,height:1,bytes:3,blob:new Blob([new Uint8Array([1,2,3])],{type:'image/png'}),createdAt:1};
 const bundle=await makeBundle(s,async()=>a);
 const restored=readBundle(new Uint8Array(await bundle.arrayBuffer()));
 assert.equal(restored.story.pages[0].source,'手动修改');assert.equal(restored.assets[0].blob.size,3);
});
test('malformed or excessive restored documents are rejected',()=>{
 const s=planStory('文字',DEFAULT_OPTIONS,{target:0,cover:false,ending:'none'});
 assert.equal(validateStory(s).pages.length,1);
 assert.throws(()=>validateStory({...s,options:{...s.options,fontScale:100}}));
 assert.throws(()=>validateStory({...s,pages:[{...s.pages[0],focusX:-4}]}));
 assert.throws(()=>validateStory({...s,pages:Array(61).fill(s.pages[0])}));
 assert.throws(()=>readBundle(new Uint8Array([0,1,2])));
});

test('restore identities remap directory links and keep source references',async()=>{
 const {restoreIdentity}=await import('../src/studio/backup.ts');
 const story=planStory('## 第一章\n\n一段记录。\n\n## 第二章\n\n另一段记录。',DEFAULT_OPTIONS,{target:0,cover:true,ending:'none',toc:'yes'});
 const next=restoreIdentity(story,new Map());
 assert.notEqual(next.id,story.id);assert.equal(next.revision,0);
 assert.ok(next.pages.find(p=>p.role==='toc')!.tocEntries!.every(e=>next.pages.some(p=>p.id===e.targetPageId)));
 assert.deepEqual(next.pages.find(p=>p.role==='body')!.sourceRanges,story.pages.find(p=>p.role==='body')!.sourceRanges);
 assert.throws(()=>validateStory({...story,pages:story.pages.map(p=>p.role==='toc'?{...p,tocEntries:[{label:'无效',targetPageId:'bad space'}]}:p)}));
});
