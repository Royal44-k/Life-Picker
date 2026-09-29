import test from 'node:test';import assert from 'node:assert/strict';import {unzipSync,zipSync,strToU8} from 'fflate';
import {makeJournalBundle,readJournalBundle,restoreJournalIdentity} from '../src/journal/backup.ts';import {newEntry,newMemory} from '../src/journal/model.ts';
test('journal backups retain photos, private metadata, followups and frozen memories',async()=>{
 const a=newEntry('2026-09-28');a.text='原话';a.tags=['私藏'];a.assetIds=['photo'];const b=newEntry('2026-09-29');b.text='后来怎么样了';b.followUpTo=a.id;
 const memory=newMemory('两天的记忆',[a,b]);const blob=new Blob(['photo-bytes'],{type:'image/png'});const asset={id:'photo',name:'a.png',type:'image/png',width:10,height:10,bytes:blob.size,blob,createdAt:1,trashedAt:2};
 const zip=await makeJournalBundle([a,b],[memory],async()=>asset);const restored=readJournalBundle(new Uint8Array(await zip.arrayBuffer()));
 assert.equal(restored.assets.length,1);assert.equal(await restored.assets[0].blob.text(),'photo-bytes');assert.deepEqual(restored.entries[0].tags,['私藏']);assert.equal(restored.entries[1].followUpTo,a.id);assert.equal(restored.memories[0].items[0].text,'原话');
 const copy=restoreJournalIdentity(restored);assert.notEqual(copy.entries[0].id,a.id);assert.equal(copy.entries[1].followUpTo,copy.entries[0].id);assert.equal(copy.memories[0].items[0].entryId,copy.entries[0].id);assert.equal(copy.entries[0].assetIds[0],copy.assets[0].id);assert.equal(copy.assets[0].trashedAt,undefined);
 const files=unzipSync(new Uint8Array(await zip.arrayBuffer()));delete files['media/photo'];assert.throws(()=>readJournalBundle(zipSync(files)),/照片/);
 files['manifest.json']=strToU8('{"format":"other"}');assert.throws(()=>readJournalBundle(zipSync(files)),/备份/);
});

test('journal backup rejects bit-corrupted valid JSON instead of silently changing private text',async()=>{
 const entry={...newEntry('2026-09-29'),text:'CORRUPTION_A'};const blob=await makeJournalBundle([entry],[],async()=>undefined),raw=new Uint8Array(await blob.arrayBuffer());const i=Buffer.from(raw).indexOf('CORRUPTION_A');assert.ok(i>=0);raw[i+'CORRUPTION_'.length]='B'.charCodeAt(0);assert.throws(()=>readJournalBundle(raw),/损坏|校验/);
});
