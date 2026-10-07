import {test,after} from 'node:test';import {chromium} from 'playwright';import assert from 'node:assert/strict';
const base=process.env.TEST_URL||'http://localhost:5182',browser=await chromium.launch({channel:'msedge',headless:true});after(()=>browser.close());
test('photo upload guards unload before draft changes, then releases after save',async()=>{
 const page=await browser.newPage({viewport:{width:390,height:844}});try{
  await page.goto(base+'/?view=journal&new=1');await page.getByLabel('随心记文字').fill('已经保存的原记录。');await page.getByText('已保存到本机',{exact:true}).waitFor();
  const png=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=20;c.height=20;return c.toDataURL().split(',')[1];}),'base64');
  await page.evaluate(()=>{const read=FileReader.prototype.readAsArrayBuffer;window.__pendingPhotoReads=[];FileReader.prototype.readAsArrayBuffer=function(blob){const reader=this;window.__pendingPhotoReads.push(()=>read.call(reader,blob));};window.__releasePhoto=()=>{FileReader.prototype.readAsArrayBuffer=read;for(const run of window.__pendingPhotoReads)run();};});
  await page.getByLabel('为记录添加照片').setInputFiles({name:'待整理.png',mimeType:'image/png',buffer:png});await page.getByText('正在整理照片…',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>{const e=new Event('beforeunload',{cancelable:true});dispatchEvent(e);return e.defaultPrevented;}),true,'upload must guard browser refresh even when saved draft is unchanged');
  await page.evaluate(()=>window.__releasePhoto());await page.getByRole('button',{name:'从记录移除照片：待整理.png'}).waitFor();await page.getByText('已保存到本机',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>{const e=new Event('beforeunload',{cancelable:true});dispatchEvent(e);return e.defaultPrevented;}),false,'finished upload and save must release browser guard');
  await page.reload();await page.getByRole('button',{name:'从记录移除照片：待整理.png'}).waitFor();assert.equal(await page.getByLabel('随心记文字').inputValue(),'已经保存的原记录。');
  const dialogs=[];page.on('dialog',d=>{dialogs.push(d.type());void d.dismiss();});await page.getByRole('button',{name:'整理为作品',exact:true}).click();await page.getByRole('button',{name:'另存到创作工作台',exact:true}).click();await page.getByLabel('作品原文').waitFor({timeout:5000});assert.deepEqual(dialogs,[],'successful explicit handoff must not show an unload warning');
 }finally{await page.close();}
});
test('saved companion appearance reaches journal and memory chats without a model request',async()=>{
 const page=await browser.newPage({viewport:{width:390,height:844}});let requests=0;await page.route('**/api/chat',r=>{requests++;return r.abort();});await page.route('**/api/status',r=>r.fulfill({json:{deepseek:true}}));
 try{
  await page.goto(base+'/?view=companion');await page.getByRole('button',{name:'预览装扮：晴空蓝'}).click();await page.getByRole('button',{name:'保存装扮',exact:true}).click();await page.getByText('小拾的新装扮已保存到本机。',{exact:true}).waitFor();
  await page.goto(base+'/?view=journal');await page.locator('.xiaoshi-character [data-appearance=sky]').waitFor();await page.getByRole('button',{name:'聊一聊',exact:true}).click();await page.locator('.xiaoshi-chat-intro svg').waitFor();assert.equal(await page.locator('.xiaoshi-chat-intro svg').getAttribute('data-appearance'),'sky');await page.getByRole('button',{name:'关闭弹窗'}).click();
  await page.evaluate(async()=>{const m=await import('/src/journal/model.ts'),d=await import('/src/journal/database.ts');await d.saveMemory(m.newMemory('外观一致的回忆',[{...m.newEntry('2026-10-07'),text:'今天留下自己的故事。'}]),0);});
  await page.goto(base+'/?view=memories');await page.getByRole('button',{name:'打开回忆册：外观一致的回忆'}).click();await page.getByRole('button',{name:'请小拾帮我想开场'}).click();await page.locator('.xiaoshi-chat-intro svg').waitFor();assert.equal(await page.locator('.xiaoshi-chat-intro svg').getAttribute('data-appearance'),'sky');assert.equal(requests,0);
 }finally{await page.close();}
});
