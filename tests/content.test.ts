import {test} from 'node:test';
import assert from 'node:assert/strict';
import {indexSource} from '../src/studio/content.ts';

test('source index preserves original offsets, line endings and every character',()=>{
 const source='# 文章\r\n\r\n开篇✨。\r\n\r\n## 第二章\r\n- 一个细节\r\n- 另一个细节\r\n\r\n> 原话\r\n\r\n---\r\n结尾';
 const index=indexSource(source);
 assert.equal(index.blocks.map(b=>b.text).join(''),source);
 for(const b of index.blocks)assert.equal(source.slice(b.start,b.end),b.text);
 assert.equal(index.blocks.filter(b=>b.kind==='break').length,1);
});
test('headings keep hierarchy even when levels jump and code contains fake headings',()=>{
 const source='# 文章\n\n## 章节\n\n#### 跳级子标题\n\n正文\n\n```md\n## 代码中的假标题\n---\n```\n\n## 下一章';
 const index=indexSource(source);
 assert.deepEqual(index.headings.map(h=>h.label),['文章','章节','跳级子标题','下一章']);
 assert.equal(index.headings[2].parentId,index.headings[1].id);
 assert.equal(index.blocks.filter(b=>b.kind==='break').length,0);
 assert.ok(index.blocks.find(b=>b.kind==='code')?.text.includes('假标题'));
});
test('unrelated insertion keeps existing semantic block ids and duplicate blocks remain distinct',()=>{
 const source='# 标题\n\n我的原话。\n\n我的原话。';
 const before=indexSource(source).blocks.filter(b=>b.kind!=='blank');
 const after=indexSource('新写的开场。\n\n'+source).blocks.filter(b=>b.kind!=='blank');
 assert.deepEqual(after.slice(1).map(b=>b.id),before.map(b=>b.id));
 assert.notEqual(before[1].id,before[2].id);
});
test('heading binds to its first content block while higher sections are distinguished',()=>{
 const source='## 章节甲\n\n### 小标题\n\n正文。\n\n## 章节乙\n\n后来的记录。';
 const index=indexSource(source);
 const body=index.blocks.find(b=>b.text.includes('正文。'))!;
 assert.equal(body.parentId,index.headings[1].id);
 assert.equal(body.sectionId,index.headings[0].id);
});
