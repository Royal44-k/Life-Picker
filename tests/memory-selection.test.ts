import test from 'node:test';import assert from 'node:assert/strict';
import {memoryRange,sampleMemories,snapshotState} from '../src/journal/selection.ts';
import {newEntry,newMemory} from '../src/journal/model.ts';
const row=(id:string,date:string,text=id)=>({...newEntry(date),id,text,revision:1});
test('calendar ranges include the full local week, leap month and year',()=>{
 assert.deepEqual(memoryRange('week','2026-09-29'),{start:'2026-09-28',end:'2026-10-04'});
 assert.deepEqual(memoryRange('month','2024-02-11'),{start:'2024-02-01',end:'2024-02-29'});
 assert.deepEqual(memoryRange('year','2026-12-31'),{start:'2026-01-01',end:'2026-12-31'});
 assert.throws(()=>memoryRange('month','2026-02-30'),/日期/);
});
test('sampling respects range, locks, exclusions, duplicate copies and diverse dates',()=>{
 const entries=[row('a','2026-09-01'),row('b','2026-09-01'),row('c','2026-09-02'),row('d','2026-09-03'),row('e','2026-09-04'),row('copy','2026-09-02','c'),row('old','2026-08-31'),{...row('trash','2026-09-03'),trashedAt:4},{...row('blank','2026-09-04'),text:''}];
 const range={start:'2026-09-01',end:'2026-09-30'};
 const ids=sampleMemories(entries,{...range,count:3,locked:['a'],excluded:['d'],previous:[]},()=>0).map(e=>e.id);
 assert.deepEqual(ids,['a','c','e']);
 assert.throws(()=>sampleMemories(entries,{...range,count:1,locked:['a','c'],excluded:[],previous:[]}),/锁定/);
 assert.throws(()=>sampleMemories(entries,{...range,count:2,locked:['old'],excluded:[],previous:[]}),/锁定/);
 assert.deepEqual(sampleMemories(entries,{start:'2027-01-01',end:'2027-01-31',count:6,locked:[],excluded:[],previous:[]}),[]);
});
test('change group chooses alternatives when available and keeps locked entries',()=>{
 const entries=['a','b','c','d','e'].map((id,i)=>row(id,'2026-09-0'+(i+1))), range={start:'2026-09-01',end:'2026-09-30',count:3,locked:['a'],excluded:[],previous:['a','b','c']};
 assert.deepEqual(sampleMemories(entries,range,()=>0).map(e=>e.id),['a','d','e']);
 assert.equal(sampleMemories([entries[0]],{...range,count:6,previous:[]}).length,1);
});
test('snapshots report changed or removed originals without modifying confirmed content',()=>{
 const e=row('a','2026-09-01','我的原话');const item=newMemory('九月',[e]).items[0];
 assert.equal(snapshotState(item,[e]),'current');assert.equal(snapshotState(item,[{...e,revision:2,text:'后来改了'}]),'changed');
 assert.equal(snapshotState(item,[{...e,trashedAt:3}]),'removed');assert.equal(snapshotState(item,[]),'removed');assert.equal(item.text,'我的原话');
});
