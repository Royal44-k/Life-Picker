import {studioUrl} from './helpers/studio-url.mjs';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.goto(studioUrl(process.env.TEST_URL));await page.getByRole('heading',{name:'把经历，编成作品。'}).waitFor();
 await page.evaluate(async()=>{
  const db=await import('/src/studio/database.ts');const p=await import('/src/studio/planner.ts');const layout=await import('/src/core/layout.ts');
  const s=p.planStory('第一段\n---\n第二段',layout.DEFAULT_OPTIONS,{cover:false,target:0,ending:'none'});
  s.pages[0].source='x'.repeat(10001);s.pages[1].source='y'.repeat(10001);await db.saveStory(s,0);localStorage.setItem('shiye:studio:active',s.id);const url=new URL(location.href);url.searchParams.set('id',s.id);history.replaceState(null,'',url);
 });
 await page.reload();await page.getByRole('tab',{name:'分镜',exact:true}).click();await page.getByRole('button',{name:'编辑第 1 页'}).click();
 await page.getByRole('button',{name:'合并下一页',exact:true}).click();
 await page.getByRole('button',{name:'保存并关闭',exact:true}).click();
 assert.equal(await page.locator('.next-outline-row').count(),2,'Rejected oversized merge must leave both pages intact');
 await page.getByRole('button',{name:'编辑第 1 页'}).click();await page.getByLabel('本页文字').fill('拒绝超限合并后仍可正常编辑。');await page.getByRole('button',{name:'保存并关闭',exact:true}).click();await page.getByText('已保存到本机',{exact:true}).waitFor();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'备份作品',exact:true}).click();await download;
 assert.ok(await page.getByText('已保存到本机',{exact:true}).isVisible());console.log('PASS oversized merge rejected before mutation; original pages remain saved and backup works');
}finally{await browser.close();}
