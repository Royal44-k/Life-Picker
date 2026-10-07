import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.TEST_URL||'http://localhost:5173',browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.goto(base+'/?view=journal&new');await page.getByLabel('随心记文字').fill('仍然想留下的这一句。');
 await page.getByRole('button',{name:'摘一句原话',exact:true}).click();await page.getByRole('button',{name:'选择原句：仍然想留下的这一句。',exact:true}).click();
 await page.evaluate(async()=>{const db=await import('/src/journal/database.ts'),entry=(await db.listEntries())[0];await db.saveEntry({...entry,text:entry.text+'\n另一窗口的新细节。'},entry.revision);});
 await page.getByRole('button',{name:'收进原话簿',exact:true}).click();await page.getByRole('dialog').getByRole('alert').waitFor();
 await page.getByRole('button',{name:'关闭弹窗',exact:true}).click();
 assert.equal(await page.getByRole('button',{name:'重新载入已保存版本',exact:true}).count(),1,'capture conflict needs a real reload action');
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'重新载入已保存版本',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[aria-label="随心记文字"]')?.value.includes('另一窗口的新细节'));
 await page.getByRole('button',{name:'摘一句原话',exact:true}).click();await page.getByRole('button',{name:'选择原句：仍然想留下的这一句。',exact:true}).click();await page.getByRole('button',{name:'收进原话簿',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
 const row=await page.evaluate(async()=>{const db=await import('/src/journal/database.ts');return (await db.listEntries())[0];});
 assert.equal(row.text,'仍然想留下的这一句。\n另一窗口的新细节。');assert.equal(row.quotes.length,1);assert.equal(row.quotes[0].text,'仍然想留下的这一句。');
 console.log('PASS capture conflict offers real database reload, retains latest source and allows checked re-selection without overwrite');
}finally{await browser.close();}
