import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeBundle,readBundle} from '../src/studio/backup.ts';
import {makeJournalBundle,readJournalBundle} from '../src/journal/backup.ts';
import {planStory} from '../src/studio/planner.ts';
import {DEFAULT_OPTIONS} from '../src/core/layout.ts';
import {zipSync,strToU8} from 'fflate';
const credit={version:1,recordId:'source-1',revision:2,title:'阅读插画',url:'https://www.opendoodles.com/',author:'Pablo Stanley',authorUrl:null,collectedAt:100,checkedAt:200,license:'CC0-1.0',licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/',attribution:'',changes:'原图；仅在作品中缩放。',evidence:'官网已核验',originalHash:'a'.repeat(64)};
function fixture(){const story=planStory('## 自己的观察\n\n今天读到的一句话。',DEFAULT_OPTIONS,{target:0,cover:false,ending:'none'});story.pages[0].assetId='illustration';const asset={id:'illustration',name:'阅读插画',type:'image/png',width:1,height:1,bytes:3,blob:new Blob([new Uint8Array([1,2,3])],{type:'image/png'}),createdAt:1,sourceCredit:credit};return {story,asset};}
test('source credit survives a story backup with the original image bytes',async()=>{const {story,asset}=fixture(),blob=await makeBundle(story,async()=>asset),restored=readBundle(new Uint8Array(await blob.arrayBuffer()));assert.deepEqual(restored.assets[0].sourceCredit,credit);assert.deepEqual(new Uint8Array(await restored.assets[0].blob.arrayBuffer()),new Uint8Array([1,2,3]));});
test('story and shared journal backups reject unsafe or forged source metadata',async()=>{
 const {story,asset}=fixture();
 for(const bad of [{...credit,url:'javascript:alert(1)'},{...credit,licenseUrl:'https://example.com/?api_key=secret'},{...credit,authorUrl:'https://person:password@example.com/'},{...credit,checkedAt:null},{...credit,originalHash:'not-a-hash'},{...credit,title:'x'.repeat(121)}]){
  const corrupted={...asset,sourceCredit:bad};
  await assert.rejects(()=>makeBundle(story,async()=>corrupted),/来源/);
  const raw=zipSync({'manifest.json':strToU8(JSON.stringify({format:'shiye-story',version:1,story,assets:[{...corrupted,blob:undefined}]})),'media/illustration':new Uint8Array([1,2,3])});assert.throws(()=>readBundle(raw),/来源/);
 }
});
test('journal export and restore preserve shared illustration credit and reject invalid links',async()=>{
 const {asset}=fixture();const entry={version:1,id:'journal-1',revision:1,date:'2026-10-05',text:'我自己的阅读记录',assetIds:['illustration'],tags:[],starred:false,createdAt:1,updatedAt:1};
 const blob=await makeJournalBundle([entry],[],async()=>asset);assert.deepEqual(readJournalBundle(new Uint8Array(await blob.arrayBuffer())).assets[0].sourceCredit,credit);
 await assert.rejects(()=>makeJournalBundle([entry],[],async()=>({...asset,sourceCredit:{...credit,url:'file:///private'}})),/来源/);
});
