import test from 'node:test';import assert from 'node:assert/strict';
import {capturedDateFromExif,readPhotoDate,validateCapturedDate} from '../src/studio/photo-date.ts';
import {jpegWithDate} from './helpers/exif-fixture.mjs';
import {makeBundle,readBundle} from '../src/studio/backup.ts';import {makeJournalBundle,readJournalBundle} from '../src/journal/backup.ts';import {newEntry} from '../src/journal/model.ts';import {planStory} from '../src/studio/planner.ts';import {DEFAULT_OPTIONS} from '../src/core/layout.ts';import {zipSync,unzipSync,strToU8,strFromU8} from 'fflate';
test('EXIF local calendar day never shifts with timezone and invalid, future, nonoriginal dates remain unconfirmed',()=>{
 for(const hour of ['00:01:02','23:59:59'])assert.equal(capturedDateFromExif('2024:02:29 '+hour,'2026-10-07'),'2024-02-29');
 for(const value of ['2023:02:29 10:00:00','2026:13:01 01:00:00','2024:02:29 24:00:00','2024:02:29 01:60:00','2024:02:29 01:00:61','2027:01:01 00:00:00','0000:00:00 00:00:00','2024-02-29T23:00:00Z',new Date(),123,null])assert.equal(capturedDateFromExif(value,'2026-10-07'),undefined);
 assert.equal(validateCapturedDate(undefined),undefined);assert.equal(validateCapturedDate('2024-02-29'),'2024-02-29');assert.throws(()=>validateCapturedDate('2024-02-30'),/日期/);
});
test('real JPEG EXIF is read locally; missing, malformed and unparseable metadata never blocks upload',async()=>{
 assert.equal(await readPhotoDate(jpegWithDate('2024:02:29 23:59:59')),'2024-02-29');
 assert.equal(await readPhotoDate(jpegWithDate('2023:02:29 12:00:00')),undefined);
 assert.equal(await readPhotoDate(new Uint8Array([255,216,255,217])),undefined);
 assert.equal(await readPhotoDate(new Uint8Array([1,2,3,4])),undefined);
 const damaged=jpegWithDate('2024:02:29 23:59:59');damaged[20]=255;assert.equal(await readPhotoDate(damaged.subarray(0,32)),undefined);
});
test('photo date survives story and journal backups; impossible dates reject both incoming and outgoing manifests',async()=>{
 const blob=new Blob(['picture'],{type:'image/jpeg'}),asset={id:'photo-date',name:'一页.jpg',type:'image/jpeg',width:12,height:10,bytes:blob.size,blob,createdAt:1,capturedDate:'2024-02-29'};
 const story=planStory('这一天',DEFAULT_OPTIONS,{target:0,cover:false,ending:'none'});story.pages[0].assetId=asset.id;const entry={...newEntry('2024-03-01'),text:'我自己选择的记录日',assetIds:[asset.id]};
 const bundles=[{make:()=>makeBundle(story,async()=>asset),read:readBundle,bad:()=>makeBundle(story,async()=>({...asset,capturedDate:'2024-02-30'}))},{make:()=>makeJournalBundle([entry],[],async()=>asset),read:readJournalBundle,bad:()=>makeJournalBundle([entry],[],async()=>({...asset,capturedDate:'2024-02-30'}))}];
 for(const bundle of bundles){const zip=await bundle.make(),parsed=bundle.read(new Uint8Array(await zip.arrayBuffer()));assert.equal(parsed.assets[0].capturedDate,'2024-02-29');assert.equal(await parsed.assets[0].blob.text(),'picture');const files=unzipSync(new Uint8Array(await zip.arrayBuffer())),manifest=JSON.parse(strFromU8(files['manifest.json']));manifest.assets[0].capturedDate='2024-02-30';files['manifest.json']=strToU8(JSON.stringify(manifest));assert.throws(()=>bundle.read(zipSync(files)),/日期/);await assert.rejects(bundle.bad,/日期/);}
});
