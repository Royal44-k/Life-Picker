import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.TEST_URL||'http://localhost:5173',browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.goto(base+'/?view=journal&new');await page.getByLabel('随心记文字').fill('慢慢保存，也要稳稳留下。');
 await page.getByRole('button',{name:'摘一句原话',exact:true}).click();await page.getByRole('button',{name:'选择原句：慢慢保存，也要稳稳留下。',exact:true}).click();
 await page.evaluate(()=>{
  const original=IDBDatabase.prototype.transaction;window.__holdJournal=true;
  IDBDatabase.prototype.transaction=function(names,mode,...args){
   const tx=original.call(this,names,mode,...args);
   if(mode==='readwrite'&&[].concat(names).includes('journals')){
    const store=tx.objectStore('journals');function keepAlive(){const request=store.get('__keepalive__');request.onsuccess=()=>{if(window.__holdJournal)keepAlive();};}keepAlive();
   }
   return tx;
  };
 });
 await page.getByRole('button',{name:'收进原话簿',exact:true}).click();await page.getByRole('button',{name:'正在收藏…',exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>{const e=new Event('beforeunload',{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented;}),true,'pending quote write must guard browser refresh');
 assert.equal(await page.getByText('原话已收藏，可以在原话簿中继续整理。',{exact:true}).count(),0);
 await page.getByRole('button',{name:'关闭弹窗',exact:true}).click();assert.equal(await page.getByRole('dialog').count(),1);
 await page.evaluate(()=>window.__holdJournal=false);await page.getByRole('dialog').waitFor({state:'hidden'});
 assert.equal(await page.evaluate(()=>{const e=new Event('beforeunload',{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented;}),false,'committed quote allows normal navigation');
 await page.reload();await page.getByRole('link',{name:'原话簿 · 本页 1 句',exact:true}).waitFor();
 console.log('PASS pending capture write guards browser unload, prevents premature success/close, releases after commit, survives reload');
}finally{await browser.close();}
