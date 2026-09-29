import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMarkdown } from '../src/core/markdown.ts';
import { layoutDocument, wrapText, DEFAULT_OPTIONS, LIMITS } from '../src/core/layout.ts';
import { decodeDrafts, validateSource, persistDrafts, STORAGE_KEY } from '../src/core/storage.ts';

const measure = (text: string, size: number) => Array.from(text).reduce((sum, c) => sum + (/[\u0000-\u00ff]/u.test(c) ? size * .55 : size), 0);
const compact = (text: string) => text.replace(/\s/g, '');

test('blank input yields zero pages', () => assert.equal(layoutDocument('  \n ', DEFAULT_OPTIONS, measure).length, 0));
test('basic Markdown and explicit breaks preserve human text', () => {
  const blocks = parseMarkdown('# 标题\n\n**重点**与正文\n- 第一项\n> 引用\n---\n下一页');
  assert.deepEqual(blocks.map(b => b.kind), ['heading', 'paragraph', 'list', 'quote', 'break', 'paragraph']);
  assert.equal(blocks[1].text, '重点与正文');
});
test('long CJK paragraphs are completely preserved across pages', () => {
  const input = '持续记录，让思考发生。'.repeat(300);
  const pages = layoutDocument(input, DEFAULT_OPTIONS, measure);
  assert.ok(pages.length > 1);
  assert.equal(compact(pages.flatMap(p => p.lines.map(l => l.text)).join('')), compact(input));
  for (const page of pages) for (const line of page.lines) assert.ok(line.y + line.lineHeight <= page.height - 90);
});
test('emoji graphemes and long unbroken English tokens are preserved', () => {
  const input = '👨‍👩‍👧‍👦记录✨' + 'averylongword'.repeat(80);
  const lines = wrapText(input, 380, 32, measure);
  assert.equal(lines.join(''), input);
  assert.ok(lines.length > 1);
  assert.ok(lines[0].includes('👨‍👩‍👧‍👦'));
});
test('hard break creates pages, repeated separators do not add blank pages', () => {
  const pages = layoutDocument('第一张\n---\n---\n第二张\n---', DEFAULT_OPTIONS, measure);
  assert.equal(pages.length, 2);
  assert.equal(pages[1].lines[0].text, '第二张');
});
test('long heading and code survive in all ratios and font scales', () => {
  const source = '# ' + '这是一个很长的标题'.repeat(35) + '\n\n```js\n' + 'const value = 123; '.repeat(80) + '\n```';
  for (const ratio of ['portrait', 'square', 'story'] as const) for (const fontScale of [.85, 1, 1.2]) {
    const pages = layoutDocument(source, {...DEFAULT_OPTIONS, ratio, fontScale}, measure);
    const result = compact(pages.flatMap(p => p.lines.map(l => l.text)).join(''));
    assert.equal(result, compact(parseMarkdown(source).map(b => b.text).join('')));
    assert.ok(pages.every(p => p.lines.every(l => l.y + l.lineHeight <= p.height - 90)));
  }
});
test('source limit rejects input without silent truncation', () => {
  assert.throws(() => validateSource('文'.repeat(LIMITS.chars + 1)), /20,000/);
  assert.equal(validateSource('正常文字'), '正常文字');
});
test('malformed storage and unknown versions are rejected safely', () => {
  assert.deepEqual(decodeDrafts('not json'), []);
  assert.deepEqual(decodeDrafts('{"version":99,"drafts":[]}'), []);
  assert.deepEqual(decodeDrafts('{"version":1,"drafts":[{"id":1}]}'), []);
});
test('stored drafts validate options and reject invalid fields', () => {
  const good = {id:'a', source:'# 我的内容', updatedAt:123, options:DEFAULT_OPTIONS};
  assert.equal(decodeDrafts(JSON.stringify({version:1,drafts:[good]})).length, 1);
  const bad = {...good, options:{...DEFAULT_OPTIONS,fontScale:Infinity}};
  assert.equal(decodeDrafts(JSON.stringify({version:1,drafts:[bad]})).length, 0);
});
test('HTML-like input is preserved as inert text', () => {
  assert.equal(parseMarkdown('<script>alert(1)</script>')[0].text, '<script>alert(1)</script>');
});
test('exactly 60 explicit pages accepted, 61 rejected without truncation', () => {
  assert.equal(layoutDocument(Array(60).fill('正文').join('\n---\n')+'\n---',DEFAULT_OPTIONS,measure).length,60);
  assert.throws(()=>layoutDocument(Array(61).fill('正文').join('\n---\n'),DEFAULT_OPTIONS,measure),/60 页/);
});
test('a stale tab cannot overwrite newer saved drafts', () => {
  const items=new Map<string,string>();
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>items.get(key)??null,setItem:(key:string,value:string)=>items.set(key,value)}});
  const draft={id:'a',source:'第一版',options:DEFAULT_OPTIONS,updatedAt:1};
  const expected=persistDrafts([draft],'a',null);
  const newer=JSON.stringify({version:1,drafts:[{...draft,source:'另一窗口的新内容',updatedAt:2}]});
  items.set(STORAGE_KEY,newer);
  assert.throws(()=>persistDrafts([draft],'a',expected),/其他窗口/);
  assert.equal(items.get(STORAGE_KEY),newer);
});
