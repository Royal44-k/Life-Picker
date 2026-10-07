import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {unzipSync,strFromU8} from 'fflate';
const base=process.env.TEST_URL||'http://localhost:5173';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[],ai=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()==='POST'&&/\/api\/(ai|chat|inspiration)/.test(r.url()))ai.push(r.url());});
 await page.goto(base+'/?view=journal&new');await page.getByLabel('随心记文字').fill('今天看到一束光。\n走慢一点，也能到达。\n只有自己知道的秘密。');
 await page.getByLabel('记录日期').fill('2026-10-07');await page.getByLabel('记录标签').fill('私藏');
 async function collect(text){
  await page.getByRole('button',{name:'摘一句原话',exact:true}).click();
  await page.getByRole('button',{name:'选择原句：'+text,exact:true}).click();
  await page.getByRole('button',{name:'收进原话簿',exact:true}).click();
  await page.getByRole('dialog').waitFor({state:'hidden'});
 }
 await collect('今天看到一束光。');await collect('走慢一点，也能到达。');
 await page.getByRole('button',{name:'摘一句原话',exact:true}).click();await page.getByRole('button',{name:'选择原句：今天看到一束光。',exact:true}).click();
 assert.equal(await page.getByRole('button',{name:'收进原话簿',exact:true}).isDisabled(),true);await page.getByRole('button',{name:'关闭弹窗',exact:true}).click();
 await page.getByLabel('随心记文字').fill('后来修改的原文，原话快照应该继续留下。');
 await page.getByRole('link',{name:'原话簿 · 本页 2 句',exact:true}).click();
 await page.getByRole('heading',{name:'原话簿',exact:true}).waitFor();assert.equal(await page.getByTestId('quote-card').count(),2);assert.equal(await page.getByText('原文后来有调整 · 这里保留收藏时的文字',{exact:true}).count(),2);
 await page.getByLabel('搜索原话').fill('看到一束光');assert.equal(await page.getByTestId('quote-card').count(),1);
 await page.getByRole('button',{name:'选择原话：今天看到一束光。',exact:true}).click();
 await page.getByLabel('搜索原话').fill('走慢一点');await page.getByText('1 句在当前搜索之外',{exact:true}).waitFor();await page.getByLabel('搜索原话').fill('');
 await page.getByRole('button',{name:'移除原话：今天看到一束光。',exact:true}).click();await page.getByText('已移除这句收藏，原记录文字仍保留。',{exact:true}).waitFor();assert.equal(await page.getByTestId('quote-card').count(),1);
 await page.getByRole('button',{name:'撤销移除原话',exact:true}).click();await page.getByText('这句原话已恢复。',{exact:true}).waitFor();assert.equal(await page.getByTestId('quote-card').count(),2);
 await page.screenshot({path:'artifacts/quotes-mobile.jpg',fullPage:true,type:'jpeg',quality:75});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.getByRole('link',{name:/回到原记录/}).first().click();assert.equal(await page.getByLabel('随心记文字').inputValue(),'后来修改的原文，原话快照应该继续留下。');
 await page.getByRole('button',{name:'收好这页',exact:true}).click();
 const dl=page.waitForEvent('download');await page.getByRole('button',{name:'备份全部记录',exact:true}).click();const data=await readFile(await (await dl).path());
 const manifest=JSON.parse(strFromU8(unzipSync(data)['manifest.json']));assert.equal(manifest.entries[0].quotes.length,2);assert.equal(manifest.entries[0].tags[0],'私藏');
 await page.getByLabel('恢复随心记备份').setInputFiles({name:'quotes.zip',mimeType:'application/zip',buffer:data});await page.getByText('备份已恢复为新的记录，原内容保留。',{exact:true}).waitFor();
 await page.goto(base+'/?view=quotes');await page.getByTestId('quote-card').nth(3).waitFor();assert.equal(await page.getByTestId('quote-card').count(),4);
 // Original and restored records have independent source identities.
 const sourceLinks=await page.locator('.quote-source').evaluateAll(els=>els.map(el=>el.getAttribute('href')));assert.equal(new Set(sourceLinks).size,2);
 await page.goto(base+'/?view=journal');await page.getByRole('button',{name:/删除记录/}).first().click();await page.getByRole('button',{name:'撤销删除记录',exact:true}).waitFor();
 await page.goto(base+'/?view=quotes');await page.getByTestId('quote-card').first().waitFor();assert.equal(await page.getByTestId('quote-card').count(),2);
 await page.goto(base+'/?view=journal');await page.getByRole('button',{name:'记录回收站',exact:true}).click();await page.getByRole('button',{name:/恢复记录/}).click();await page.getByText('记录已恢复。',{exact:true}).waitFor();await page.getByRole('button',{name:'关闭弹窗',exact:true}).click();
 await page.goto(base+'/?view=quotes');await page.getByTestId('quote-card').nth(3).waitFor();
 await page.getByRole('button',{name:'选择原话：走慢一点，也能到达。',exact:true}).first().click();await page.getByRole('button',{name:'整理为新作品',exact:true}).click();
 assert.equal(await page.getByLabel('原话公开文案').inputValue(),'走慢一点，也能到达。');
 await page.getByRole('button',{name:'另存到创作工作台',exact:true}).click();
 await page.getByLabel('作品原文').waitFor();assert.equal(await page.getByLabel('作品原文').inputValue(),'走慢一点，也能到达。');
 assert.deepEqual(errors,[]);assert.deepEqual(ai,[]);console.log('PASS quotes mobile capture/duplicate/search/snapshot/source/remove-undo/backup/restore/recycle/public-copy; no AI requests');
}finally{await browser.close();}
