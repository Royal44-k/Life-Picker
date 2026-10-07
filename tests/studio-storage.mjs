import {studioUrl} from './helpers/studio-url.mjs';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const base=process.env.TEST_URL||'http://localhost:5173';
const browser=await chromium.launch({channel:'msedge',headless:true});
const ctx=await browser.newContext({viewport:{width:390,height:844}});
const page=await ctx.newPage();
await mkdir('artifacts',{recursive:true});
try{
 await page.goto(studioUrl(base));await page.getByRole('heading',{name:'把经历，编成作品。'}).waitFor();
 const result=await page.evaluate(async()=>{
  const db=await import('/src/studio/database.ts');const planner=await import('/src/studio/planner.ts');const layout=await import('/src/core/layout.ts');const backup=await import('/src/studio/backup.ts');const render=await import('/src/studio/render.ts');
  const s=planner.planStory('# 真实测试\n\n保存的是这一句。',layout.DEFAULT_OPTIONS,{target:0,cover:true,ending:'none'});
  const first=await db.saveStory(s,0);const next=await db.saveStory({...s,pages:s.pages.map(p=>({...p,source:'最新的修改'}))},first);
  let conflict='';try{await db.saveStory(s,first);}catch(e){conflict=e.message;}
  const current=(await db.allStories()).find(x=>x.id===s.id);
  let missing='';s.pages[0].assetId='does-not-exist';try{await render.storyZip(s,()=>{});}catch(e){missing=e.message;}
  delete s.pages[0].assetId;
  let stale='';try{render.confirmedScenes({...s,source:'已经改了原文'});}catch(e){stale=e.message;}
  const bundle=await backup.makeBundle(s,db.getAsset);const restored=backup.readBundle(new Uint8Array(await bundle.arrayBuffer()));
  const fresh=planner.planStory('这个导入必须整体回滚',layout.DEFAULT_OPTIONS,{target:0,cover:false,ending:'none'});
  let batchError='';try{await db.importStories([fresh,s]);}catch(e){batchError=e.message;}
  const batchPartial=(await db.allStories()).some(x=>x.id===fresh.id);
  return {first,next,conflict,current:current.pages[0].source,missing,stale,restore:restored.story.source,batchError,batchPartial};
 });
 assert.equal(result.first,1);assert.equal(result.next,2);assert.match(result.conflict,/另一窗口/);assert.equal(result.current,'最新的修改');assert.match(result.missing,/照片缺失/);assert.match(result.stale,/原文已修改/);assert.equal(result.restore,'# 真实测试\n\n保存的是这一句。');
 assert.match(result.batchError,/作品已存在/);assert.equal(result.batchPartial,false);
 console.log('PASS real IndexedDB revisions, stale-write refusal, missing-photo export refusal, stale source refusal and restore');
 await page.getByRole('tab',{name:'预览',exact:true}).click();await page.waitForTimeout(350);
 await page.screenshot({path:'artifacts/shiye-1.1-mobile-view.jpg',type:'jpeg',quality:55});
 await page.setViewportSize({width:1440,height:1100});await page.getByRole('tab',{name:'原文',exact:true}).click();await page.waitForTimeout(200);
 await page.screenshot({path:'artifacts/shiye-1.1-desktop.jpg',type:'jpeg',quality:50});
 await writeFile('artifacts/studio-storage-results.json',JSON.stringify(result,null,2));
}finally{await browser.close();}
