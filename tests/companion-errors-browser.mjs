import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true}),base=process.env.TEST_URL||'http://localhost:5182';
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/?view=companion');
 await page.getByRole('button',{name:'预览装扮：晴空蓝'}).click();assert.equal(await page.evaluate(()=>{const e=new Event('beforeunload',{cancelable:true});dispatchEvent(e);return e.defaultPrevented;}),true);
 page.once('dialog',d=>d.dismiss());await page.getByRole('button',{name:'返回我的',exact:true}).click();assert.ok(page.url().includes('companion'));
 await page.evaluate(async()=>{const s=await import('/src/journal/companion-store.ts');const p=await s.readCompanion();await s.saveAppearance('leaf',p.revision);});
 await page.getByRole('button',{name:'保存装扮',exact:true}).click();await page.getByRole('alert').filter({hasText:'另一窗口'}).waitFor();assert.equal(await page.getByText('小拾的新装扮已保存到本机。',{exact:true}).count(),0);
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'重新读取小拾资料',exact:true}).click();await page.getByText('已读取本机最新的小拾资料。',{exact:true}).waitFor();await page.getByRole('button',{name:'预览装扮：晴空蓝'}).click();
 await page.evaluate(()=>{const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(v,...args){const req=put.call(this,v,...args);if(this.name==='meta'&&v.id==='shiye:companion:v1'){IDBObjectStore.prototype.put=put;queueMicrotask(()=>this.transaction.abort());}return req;};});
 await page.getByRole('button',{name:'保存装扮',exact:true}).click();await page.getByRole('alert').filter({hasText:'中断'}).waitFor();assert.equal(await page.getByRole('button',{name:'预览装扮：晴空蓝'}).getAttribute('aria-pressed'),'true');
 await page.getByRole('button',{name:'保存装扮',exact:true}).click();await page.getByText('小拾的新装扮已保存到本机。',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>{const e=new Event('beforeunload',{cancelable:true});dispatchEvent(e);return e.defaultPrevented;}),false);
 await page.goto(base+'/?view=memories&period=year&anchor=2026-02-30');await page.getByRole('heading',{name:'回忆册',exact:true}).waitFor();assert.deepEqual(errors,[]);console.log('PASS companion dirty navigation, explicit reload after real revision conflict, write error retains preview/retry, clean unload and invalid memory-date fallback');
}finally{await browser.close();}
