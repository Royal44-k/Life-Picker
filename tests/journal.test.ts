import test from 'node:test';import assert from 'node:assert/strict';
import {newEntry,validateEntry,newMemory,validateMemory,entryToStory,memoryToStory} from '../src/journal/model.ts';
import {DEFAULT_OPTIONS} from '../src/core/layout.ts';
test('journals preserve date, text and private tags without copying private metadata to public story',()=>{
 const entry=newEntry('2026-09-29');entry.text='## 今天的发现\n\n我真实拍下的天空。';entry.tags=['只给自己','散步'];entry.assetIds=['my-photo'];entry.starred=true;
 assert.equal(validateEntry(entry).date,'2026-09-29');const story=entryToStory(entry,DEFAULT_OPTIONS);
 assert.equal(story.source,entry.text);assert.ok(story.pages.some(p=>p.assetId==='my-photo'));assert.ok(!JSON.stringify(story).includes('只给自己'));assert.equal(entry.tags.length,2);
 for(const date of ['2026-02-30','2026-13-01','yesterday'])assert.throws(()=>validateEntry({...entry,date}),/日期/);
 assert.throws(()=>validateEntry({...entry,text:'文'.repeat(20001)}));assert.throws(()=>validateEntry({...entry,assetIds:['same','same']}));
});
test('memory snapshots remain stable when original entries change and preserve confirmed order',()=>{
 const a=newEntry('2026-09-28');a.text='第一天看到的风景。';a.assetIds=['photo-a'];const b=newEntry('2026-09-29');b.text='第二天留下的感受。';b.assetIds=['photo-b'];
 const album=newMemory('九月的两天',[a,b]);a.text='原记录后来又修改了';b.assetIds=[];
 assert.equal(validateMemory(album).items[0].text,'第一天看到的风景。');assert.deepEqual(album.items[1].assetIds,['photo-b']);
 const story=memoryToStory(album,DEFAULT_OPTIONS);assert.deepEqual(story.pages.filter(p=>p.assetId).map(p=>p.assetId),['photo-a','photo-b']);assert.ok(story.source.includes('第一天看到的风景。'));assert.ok(!story.source.includes('原记录后来又修改了'));
 assert.throws(()=>newMemory('没有素材',[]),/记录/);assert.throws(()=>validateMemory({...album,items:[]}),/内容/);
});
