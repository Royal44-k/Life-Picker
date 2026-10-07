import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultCompanion,advanceCompanion,validateCompanion,mergeCompanion,appearanceAvailable,progressFromRecords} from '../src/journal/companion-profile.ts';
import {newEntry,newMemory} from '../src/journal/model.ts';
import {addQuote} from '../src/journal/quotes.ts';
import {makeJournalBundle,readJournalBundle,restoreJournalIdentity} from '../src/journal/backup.ts';
const entry=()=>({...newEntry('2026-10-07'),revision:1,text:'这是自己留下的经历。'});
test('纪念只来自成功保存的内容，重复编辑不累计，已获得不会撤回',()=>{
 const initial=defaultCompanion();assert.deepEqual(initial.earned,[]);
 assert.deepEqual(progressFromRecords([{...entry(),revision:0}],[]),{pages:0,quotes:0,memories:0});
 const one=advanceCompanion(initial,progressFromRecords([entry()],[]));
 assert.deepEqual(one.earned,['page']);assert.deepEqual(advanceCompanion(one,{pages:0,quotes:0,memories:0}).earned,['page']);
 const many=advanceCompanion(one,{pages:30,quotes:1,memories:1});assert.deepEqual(new Set(many.earned),new Set(['page','quote','memory','ten','thirty']));
 assert.equal(advanceCompanion(many,{pages:30,quotes:1,memories:1}),many);
});
test('装扮按真实进度开启，基础书签始终可选，非法字段不被悄悄重置',()=>{
 const p=defaultCompanion();assert.equal(appearanceAvailable(p,'leaf'),true);assert.equal(appearanceAvailable(p,'sky'),true);
 assert.equal(appearanceAvailable(p,'blossom'),false);assert.equal(appearanceAvailable(p,'star'),false);
 const earned=advanceCompanion(p,{pages:1,quotes:1,memories:1});assert.equal(appearanceAvailable(earned,'blossom'),true);assert.equal(appearanceAvailable(earned,'star'),true);
 for(const patch of [{version:2},{revision:-1},{appearance:'unknown'},{appearance:'star'},{earned:['made-up']},{earned:['page','page']},{updatedAt:NaN}])assert.throws(()=>validateCompanion({...p,...patch}),/小拾|装扮|纪念/);
});
test('恢复合并已获得纪念，保留本机装扮，不覆盖成另一个设备的选择',()=>{
 const current={...advanceCompanion(defaultCompanion(),{pages:1,quotes:0,memories:0}),appearance:'sky' as const,revision:3};
 const incoming={...advanceCompanion(defaultCompanion(),{pages:10,quotes:1,memories:1}),appearance:'star' as const,revision:8};
 const merged=mergeCompanion(current,incoming);assert.equal(merged.appearance,'sky');assert.equal(merged.revision,4);assert.ok(merged.earned.includes('memory'));
 assert.equal(mergeCompanion(defaultCompanion(),incoming).appearance,'star');
});
test('原话与回忆纪念仅统计有效记录，回收状态不撤回既有纪念',()=>{
 const e=addQuote(entry(),'自己留下的经历'),album={...newMemory('一本回忆',[e]),revision:1};
 assert.deepEqual(progressFromRecords([e],[album]),{pages:1,quotes:1,memories:1});
 assert.deepEqual(progressFromRecords([{...e,trashedAt:1}],[{...album,trashedAt:1}]),{pages:0,quotes:0,memories:0});
});
test('完整记录备份往返小拾资料，旧备份仍可读，恢复不带原记录 ID',async()=>{
 const e=entry(),profile={...advanceCompanion(defaultCompanion(),{pages:1,quotes:1,memories:1}),appearance:'star' as const,revision:2};
 const blob=await makeJournalBundle([e],[],async()=>undefined,profile);
 const parsed=readJournalBundle(new Uint8Array(await blob.arrayBuffer()));assert.deepEqual(parsed.companion,profile);
 const restored=restoreJournalIdentity(parsed);assert.deepEqual(restored.companion,profile);assert.notEqual(restored.entries[0].id,e.id);
 const old=await makeJournalBundle([e],[],async()=>undefined);assert.equal(readJournalBundle(new Uint8Array(await old.arrayBuffer())).companion,undefined);
});
