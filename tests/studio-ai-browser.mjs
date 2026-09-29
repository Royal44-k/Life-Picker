import {studioUrl} from './helpers/studio-url.mjs';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(studioUrl(process.env.TEST_URL));await page.getByRole('heading',{name:'把经历，编成作品。'}).waitFor();
 await page.getByLabel('作品原文').fill(Array.from({length:100},(_,i)=>'## 小标题 '+i+'\n\n这一段还要保留。').join('\n\n'));
 await page.getByRole('button',{name:'AI 编辑成篇 · 先看建议',exact:true}).click();
 await page.getByRole('heading',{name:'AI 编辑成篇',exact:true}).waitFor({timeout:5000});
 assert.deepEqual(errors,[]);console.log('PASS AI dialog opens even when rule layout would exceed 60 pages');
}finally{await browser.close();}
