import test from 'node:test';
import {unzipSync,zipSync,strFromU8,strToU8} from 'fflate';
import assert from 'node:assert/strict';
import {newEntry,validateEntry,entryToStory} from '../src/journal/model.ts';
import {addQuote,removeQuote,restoreQuote,collectQuotes,quoteCandidates,quotesToSource,resolveQuotes} from '../src/journal/quotes.ts';
import {DEFAULT_OPTIONS} from '../src/core/layout.ts';
import {makeJournalBundle,readJournalBundle,restoreJournalIdentity} from '../src/journal/backup.ts';

const entry=()=>({...newEntry('2026-10-07'),revision:1,text:'今天看到一束光。\n走慢一点，也能到达。\n只有自己知道的秘密。',tags:['私人标签']});
test('原话只接受真实摘录，不改写空白或补写内容，并拒绝重复、超长、超量',()=>{
 const e=entry(),next=addQuote(e,'走慢一点，也能到达。');
 assert.equal(e.quotes,undefined);assert.equal(next.quotes?.[0].text,'走慢一点，也能到达。');assert.equal(next.quotes?.[0].sourceDate,e.date);
 assert.throws(()=>addQuote(e,'编造的经历'),/原文/);assert.throws(()=>addQuote(e,'  '),/选择/);assert.throws(()=>addQuote(next,'走慢一点，也能到达。'),/已经/);
 assert.throws(()=>addQuote({...e,text:'文'.repeat(501)},'文'.repeat(501)),/500/);
 const full={...e,text:Array.from({length:21},(_,i)=>`片段${i}。`).join('\n')};let current=full;
 for(let i=0;i<20;i++)current=addQuote(current,`片段${i}。`);
 assert.throws(()=>addQuote(current,'片段20。'),/20/);
});
test('原句建议保留精确文本，跳过过长片段，不把引号与颜文字任意改写',()=>{
 const text='  今天说：“慢慢来。”\n(๑•̀ㅂ•́)و✧  可以的！\n'+ '长'.repeat(501)+'\n最后一句';
 const suggestions=quoteCandidates(text);
 assert.ok(suggestions.includes('今天说：“慢慢来。”'));assert.ok(suggestions.includes('(๑•̀ㅂ•́)و✧  可以的！'));
 assert.ok(suggestions.includes('最后一句'));assert.ok(suggestions.every(s=>s.length<=500&&text.includes(s)));
});
test('旧记录兼容，非法收藏字段拒绝；原文变更保留快照，回收隐藏',()=>{
 assert.equal(validateEntry(entry()).quotes,undefined);
 const next=addQuote(entry(),'今天看到一束光。'),quote=next.quotes![0];
 for(const quotes of [null,{},[null],[{...quote,text:''}],[{...quote,sourceDate:'2026-02-30'}],[{...quote,createdAt:NaN}],[{...quote,id:'a/b'}],[quote,quote],[{...quote,text:'文'.repeat(501)}]])assert.throws(()=>validateEntry({...next,quotes}),/原话/);
 const changed=validateEntry({...next,text:'后来改写了整段经历',date:'2026-10-08'});
 const rows=collectQuotes([changed,{...next,id:'trashed',trashedAt:Date.now()}]);
 assert.equal(rows.length,1);assert.equal(rows[0].quote.text,quote.text);assert.equal(rows[0].quote.sourceDate,'2026-10-07');assert.equal(rows[0].sourceChanged,true);
 assert.throws(()=>addQuote({...next,trashedAt:Date.now()},quote.text),/恢复/);
});
test('移除与撤销保护身份和快照，重复恢复不会生成副本',()=>{
 let e=addQuote(entry(),'今天看到一束光。');e=addQuote(e,'走慢一点，也能到达。');const quote=e.quotes![0];
 const removed=removeQuote(e,quote.id);assert.equal(removed.quotes!.length,1);assert.equal(e.quotes!.length,2);
 const restored=restoreQuote({...removed,text:'原文后来变化'},quote,0);assert.deepEqual(restored.quotes,e.quotes);
 assert.throws(()=>restoreQuote(restored,quote,0),/已经/);assert.throws(()=>removeQuote(e,'missing'),/不存在/);
});
test('作品仅包含显式选中原话；删掉的来源不能被过时选择重新生成',()=>{
 const a=addQuote(entry(),'走慢一点，也能到达。'),b=addQuote({...entry(),text:'第二句公开内容。还有秘密。'},'第二句公开内容。');
 const rows=collectQuotes([a,b]),one=rows.find(r=>r.entryId===a.id)!;
 const text=quotesToSource([one]);assert.equal(text,'走慢一点，也能到达。');
 const story=entryToStory({...entry(),text,assetIds:[]},DEFAULT_OPTIONS);const serialized=JSON.stringify(story);
 for(const secret of ['私人标签','只有自己知道的秘密',b.quotes![0].text,a.id,one.quote.id])assert.equal(serialized.includes(secret),false);
 assert.equal(resolveQuotes([a,b],[one.key])[0].quote.id,one.quote.id);
 assert.throws(()=>resolveQuotes([{...a,trashedAt:Date.now()},b],[one.key]),/重新/);
 assert.throws(()=>resolveQuotes([a],[one.key,one.key]),/重复/);
 assert.throws(()=>quotesToSource([]),/选择/);assert.throws(()=>quotesToSource(Array(10).fill(one)),/9/);
});
test('完整 ZIP 保存原话，恢复新记录身份不破坏出处',async()=>{
 const e=addQuote(entry(),'今天看到一束光。');const blob=await makeJournalBundle([e],[],async()=>undefined);
 const data=readJournalBundle(new Uint8Array(await blob.arrayBuffer()));assert.deepEqual(data.entries[0].quotes,e.quotes);
 const restored=restoreJournalIdentity(data);assert.notEqual(restored.entries[0].id,e.id);assert.deepEqual(restored.entries[0].quotes,e.quotes);
 assert.equal(collectQuotes(restored.entries)[0].entryId,restored.entries[0].id);
 assert.equal(resolveQuotes(restored.entries,[collectQuotes(restored.entries)[0].key]).length,1);
});

test('损坏的 ZIP 原话字段整包拒绝，不能静默遗漏收藏',async()=>{
 const e=addQuote(entry(),'今天看到一束光。'),blob=await makeJournalBundle([e],[],async()=>undefined);
 const files=unzipSync(new Uint8Array(await blob.arrayBuffer())),manifest=JSON.parse(strFromU8(files['manifest.json']));
 manifest.entries[0].quotes[0].sourceDate='2026-02-30';files['manifest.json']=strToU8(JSON.stringify(manifest));
 assert.throws(()=>readJournalBundle(zipSync(files)),/原话/);
});
