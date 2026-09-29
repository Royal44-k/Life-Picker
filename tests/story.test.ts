import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planStory, movePage, editPage, rebuildStory } from '../src/studio/planner.ts';
import { layoutStory } from '../src/studio/scene.ts';
import { DEFAULT_OPTIONS } from '../src/core/layout.ts';
const measure = (s:string,n:number) => Array.from(s).reduce((v,c)=>v+(/[\x00-\xff]/.test(c)?n*.55:n),0);
const fixture='# 自己的节奏\n\n开篇的真实经历。\n\n## 第一次尝试\n\n第一天失败了，第二天调整。\n\n## 我的发现\n\n- 先记录\n- 再复盘\n\n> 保留原话 ✨';
test('story planning preserves every source block and explicit page boundaries',()=>{
  const s=planStory(fixture,DEFAULT_OPTIONS,{target:6,cover:true,ending:'none'});
  assert.equal(s.pages[0].role,'cover');
  assert.equal(s.pages.filter(p=>p.role!=='cover'&&p.role!=='toc'&&p.role!=='ending').map(p=>p.source).join('\n\n'),fixture);
  const hard=planStory('第一页\n---\n第二页',DEFAULT_OPTIONS,{target:0,cover:false,ending:'none'});
  assert.equal(hard.pages.length,2);assert.equal(hard.pages[1].source,'第二页');
});
test('target is soft: short notes are not padded and long notes never lose text',()=>{
  const short=planStory('今天终于开始记录。',DEFAULT_OPTIONS,{target:9,cover:true,ending:'none'});
  assert.ok(short.pages.length<6);
  const text='持续记录✨，让思考发生。'.repeat(700);
  const long=planStory(text,DEFAULT_OPTIONS,{target:6,cover:false,ending:'none'});
  assert.equal(long.pages.map(p=>p.source).join(''),text);assert.ok(long.pages.length>6);assert.ok(long.warnings.length);
});
test('page edits and ordering persist; locks survive regeneration and keep edited text',()=>{
  let s=planStory(fixture,DEFAULT_OPTIONS,{target:0,cover:true,ending:'none'});
  const id=s.pages[1].id;
  s=editPage(s,id,{source:'我的手动修改',locked:true});
  assert.throws(()=>editPage(s,id,{source:'错误覆盖'}),/锁定/);
  const next=rebuildStory(s,fixture+'\n\n新内容。',measure);
  assert.equal(next.pages.find(p=>p.id===id)?.source,'我的手动修改');
  s=movePage(s,id,1);assert.equal(s.pages[2]?.id,id);
});
test('long titles, emoji and every canvas ratio fit within page bounds',()=>{
  for(const ratio of ['portrait','square','story'] as const){
    const s=planStory('# '+ '超长标题👨‍👩‍👧‍👦'.repeat(35)+'\n\n正文。',{...DEFAULT_OPTIONS,ratio},{target:0,cover:true,ending:'none'},measure);
    const scenes=layoutStory(s,measure);
    for(const scene of scenes)for(const line of scene.lines){assert.ok(line.y+line.lineHeight<=scene.height-115);assert.ok(line.x+measure(line.text,line.size)<=1000+1);}
  }
});
test('invalid pyramid and missing image report issues instead of silently dropping data',()=>{
  let s=planStory('内容',DEFAULT_OPTIONS,{target:0,cover:false,ending:'none'});
  s=editPage(s,s.pages[0].id,{diagram:'pyramid',source:'只有一层',assetId:'missing'});
  const scene=layoutStory(s,measure)[0];
  assert.ok(scene.warnings.some(w=>w.includes('3')));
  assert.equal(scene.assetId,'missing');
});

test('second-level sections keep headings and explanations together',()=>{
 const source='# 总题\n\n开篇。\n\n## 观点甲\n\n这是观点甲的解释。\n\n## 观点乙\n\n这是观点乙的解释。';
 const s=planStory(source,DEFAULT_OPTIONS,{target:0,cover:true,ending:'none'});
 assert.ok(s.pages.filter(p=>p.role==='body').length>=3);
 assert.ok(s.pages.some(p=>p.source==='## 观点甲\n\n这是观点甲的解释。'));
});
test('code continuing across pages keeps literal markup visible',()=>{
 const code='const text = "**不要丢掉这些符号**";\n'.repeat(70);
 const source='```ts\n'+code+'```';
 const s=planStory(source,DEFAULT_OPTIONS,{target:0,cover:false,ending:'none'},measure);
 const output=layoutStory(s,measure).flatMap(s=>s.lines.map(l=>l.text)).join('');
 assert.equal(output.replace(/\s/g,''),code.replace(/\s/g,''));
});
test('comparison cards use separate columns instead of a vertical list',()=>{
 const s=planStory('方案甲\n\n方案乙',DEFAULT_OPTIONS,{target:0,cover:false,ending:'none'});
 s.pages[0].diagram='compare';
 const lines=layoutStory(s,measure)[0].lines;
 assert.notEqual(lines[0].x,lines[1].x);assert.equal(lines[0].y,lines[1].y);
});



test('AI source excerpts preserve long multi-heading input and emoji without page limits',async()=>{
 const {sourceBlocks}=await import('../src/studio/planner.ts');
 const source=Array.from({length:100},(_,i)=>'## 章节 '+i+'\n\n自己的经历👨‍👩‍👧‍👦✨'+('真实。'.repeat(20))).join('\n\n');
 const blocks=sourceBlocks(source);
 assert.ok(blocks.length<=60);assert.equal(blocks.map(b=>b.text).join(''),source);
 assert.deepEqual(sourceBlocks(source),blocks);assert.equal(new Set(blocks.map(b=>b.id)).size,blocks.length);
});

test('regenerating keeps photos, crop choices and stable identities on matched pages',()=>{
 let s=planStory('# 我的故事\n\n## 一个发现\n\n真实的经历。',DEFAULT_OPTIONS,{target:0,cover:true,ending:'none'});
 const cover=s.pages[0],body=s.pages.at(-1)!;
 s=editPage(s,cover.id,{assetId:'photo-cover',focusX:.2});
 s=editPage(s,body.id,{assetId:'photo-body',fit:'contain'});
 const next=rebuildStory(s,'# 新的故事标题\n\n## 一个发现\n\n真实的经历。',measure);
 assert.equal(next.pages[0].assetId,'photo-cover');assert.equal(next.pages[0].focusX,.2);
 const same=next.pages.find(p=>p.id===body.id)!;
 assert.equal(same.id,body.id);assert.equal(same.assetId,'photo-body');assert.equal(same.fit,'contain');
});

test('table of contents only includes real headings, not code examples',()=>{
 const source='# 教程\n\n## 真实章节\n\n正文。\n\n```md\n## 示例标题不可进入目录\n```';
 const s=planStory(source,DEFAULT_OPTIONS,{target:0,cover:true,ending:'none',toc:'yes'});
 const toc=s.pages.find(p=>p.role==='toc')!;
 assert.ok(toc.source.includes('真实章节'));assert.ok(!toc.source.includes('示例标题'));
});
test('manual split keeps literal code across every continued page',async()=>{
 const {splitPage}=await import('../src/studio/planner.ts');
 let s=planStory('占位',DEFAULT_OPTIONS,{target:0,cover:false,ending:'none'});
 const code='const title = "**符号不能消失**";\n'.repeat(60);
 s=editPage(s,s.pages[0].id,{source:'```js\n'+code+'```'});
 const split=splitPage(s,s.pages[0].id,measure);
 assert.ok(split.pages.length>1);
 const rendered=layoutStory(split,measure).flatMap(s=>s.lines.map(l=>l.text)).join('');
 assert.equal(rendered.replace(/\s/g,''),code.replace(/\s/g,''));
});

test('third-level headings stay with their parent section when the page has room',()=>{
 const source='## 一个观点\n\n简短的解释。\n\n### 一个细节\n\n来自自己的观察。';
 const s=planStory(source,DEFAULT_OPTIONS,{target:0,cover:false,ending:'none'},measure);
 assert.equal(s.pages.length,1);assert.ok(s.pages[0].source.includes('### 一个细节'));
});
test('bounded pagination balances paragraph density instead of leaving a tiny final page',()=>{
 const source=Array.from({length:13},(_,i)=>String(i+1)+'文'.repeat(20)).join('\n\n');
 const s=planStory(source,DEFAULT_OPTIONS,{target:0,cover:false,ending:'none'},measure);
 const scenes=layoutStory(s,measure);
 const heights=scenes.map(s=>s.lines.at(-1)!.y+s.lines.at(-1)!.lineHeight-s.lines[0].y);
 assert.ok(heights.length>=2);assert.ok(Math.max(...heights)-Math.min(...heights)<450);
 assert.equal(s.pages.map(p=>p.source).join('\n\n'),source);
});


test('planned pages carry valid source ranges and semantic block ids',()=>{
 const source='# 来源测试\r\n\r\n## 一个发现\r\n\r\n来自自己的原话。';
 const story=planStory(source,DEFAULT_OPTIONS,{target:0,cover:false,ending:'none'},measure);
 for(const page of story.pages){
  assert.ok(page.sourceRanges?.length);assert.equal(page.sourceVersion,story.sourceHash);
  for(const range of page.sourceRanges!){assert.ok(page.sourceIds.includes(range.blockId));assert.ok(source.slice(range.start,range.end).trim());}
 }
});


test('table of contents follows actual continued pages, ordering and deletion',()=>{
 let s=planStory('# 目录验证\n\n## 第一章\n\n开始。\n\n## 第二章\n\n后来的记录。',DEFAULT_OPTIONS,{target:0,cover:true,ending:'none',toc:'yes'},measure);
 const first=s.pages.find(p=>p.role==='body'&&p.source.includes('## 第一章'))!;
 const second=s.pages.find(p=>p.role==='body'&&p.source.includes('## 第二章'))!;
 s=editPage(s,first.id,{source:'## 第一章\n\n'+ '这一段保留全部内容。'.repeat(100)});
 let scenes=layoutStory(s,measure);let number=scenes.findIndex(p=>p.id===second.id)+1;
 let text=scenes.filter(p=>p.role==='toc').flatMap(p=>p.lines.map(l=>l.text)).join('');
 assert.ok(text.includes('第二章  ·  第 '+number+' 页'));
 s=movePage(s,second.id,-1);scenes=layoutStory(s,measure);number=scenes.findIndex(p=>p.id===second.id)+1;
 text=scenes.filter(p=>p.role==='toc').flatMap(p=>p.lines.map(l=>l.text)).join('');
 assert.ok(text.includes('第二章  ·  第 '+number+' 页'));
 s={...s,pages:s.pages.filter(p=>p.id!==first.id)};scenes=layoutStory(s,measure);
 text=scenes.filter(p=>p.role==='toc').flatMap(p=>p.lines.map(l=>l.text)).join('');
 assert.ok(!text.includes('第一章'));assert.ok(scenes.some(p=>p.warnings.some(w=>w.includes('移除'))));
});
test('regeneration remaps table of contents targets and manual edits stay manual',()=>{
 let s=planStory('## 章节甲\n\n甲的正文。\n\n## 章节乙\n\n乙的正文。',DEFAULT_OPTIONS,{target:0,cover:true,ending:'none',toc:'yes'},measure);
 s=rebuildStory(s,s.source,measure);const toc=s.pages.find(p=>p.role==='toc')!;
 assert.ok(toc.tocEntries?.length);assert.ok(toc.tocEntries!.every(e=>s.pages.some(p=>p.id===e.targetPageId)));
 s=editPage(s,toc.id,{source:'## 我自己写的导读\n\n用自己的话介绍这篇内容。'});
 assert.equal(s.pages.find(p=>p.id===toc.id)!.tocEntries,undefined);
 assert.ok(layoutStory(s,measure).find(p=>p.id===toc.id)!.lines.some(l=>l.text.includes('我自己写的导读')));
});


test('directory page numbers include the directory own continuation pages',()=>{
 const source=Array.from({length:25},(_,i)=>'## 第 '+(i+1)+' 章：'+ '留住自己的真实细节'.repeat(2)+'\n\n自己的记录。').join('\n\n');
 const story=planStory(source,DEFAULT_OPTIONS,{target:0,cover:true,ending:'none',toc:'yes'},measure);
 const scenes=layoutStory(story,measure),toc=scenes.filter(s=>s.role==='toc');
 assert.ok(toc.length>1);
 const last=story.pages.at(-1)!;const number=scenes.findIndex(s=>s.id===last.id)+1;
 assert.ok(toc.flatMap(s=>s.lines.map(l=>l.text)).join('').includes('第 '+number+' 页'));
 assert.deepEqual(layoutStory(story,measure),scenes);
});


test('merging and splitting keep directory targets and the chosen photo crop',async()=>{
 const {mergePage,splitPage}=await import('../src/studio/planner.ts');
 let story=planStory('## 章节甲\n\n甲的正文。\n\n## 章节乙\n\n乙的正文。',DEFAULT_OPTIONS,{target:0,cover:false,ending:'none',toc:'yes'},measure);
 const body=story.pages.filter(p=>p.role==='body');
 story=editPage(story,body[1].id,{assetId:'photo',focusX:.2,focusY:.8,fit:'contain'});
 story=mergePage(story,body[0].id);
 const merged=story.pages.find(p=>p.id===body[0].id)!;
 assert.equal(merged.focusX,.2);assert.equal(merged.focusY,.8);assert.equal(merged.assetId,'photo');
 assert.ok(story.pages.find(p=>p.role==='toc')!.tocEntries!.every(e=>e.targetPageId===merged.id));
 story=splitPage(story,merged.id,measure);
 const entries=story.pages.find(p=>p.role==='toc')!.tocEntries!;
 assert.notEqual(entries[0].targetPageId,entries[1].targetPageId);
 assert.ok(entries.every(e=>story.pages.some(p=>p.id===e.targetPageId)));
});

test('merging pages from different original revisions never certifies mixed source offsets',async()=>{
 const {mergePage}=await import('../src/studio/planner.ts');
 let s=planStory('## 甲\n\n旧甲。\n\n## 乙\n\n旧乙。',DEFAULT_OPTIONS,{target:0,cover:false,ending:'none'},measure);
 const second=s.pages[1];s=editPage(s,second.id,{locked:true});
 s=rebuildStory(s,'## 甲\n\n这里是一段更长的新甲内容。\n\n## 乙\n\n当前的乙。',measure);
 s=editPage(s,second.id,{locked:false});assert.notEqual(s.pages[1].sourceVersion,s.sourceHash);
 const merged=mergePage(s,s.pages[0].id);assert.notEqual(merged.pages[0].sourceVersion,merged.sourceHash);
});
