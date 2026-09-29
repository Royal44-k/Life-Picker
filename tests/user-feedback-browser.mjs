import {studioUrl} from './helpers/studio-url.mjs';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(studioUrl(process.env.TEST_URL));await page.getByRole('heading',{name:'把经历，编成作品。'}).waitFor();
 await page.getByRole('button',{name:'新建作品',exact:true}).click();
 await page.getByLabel('作品原文').fill('# 选择自己要保存的一张\n\n第一段文字。\n\n---\n\n## 第二段\n\n这一段必须出现在对应图片。');
 await page.getByRole('button',{name:'生成分镜',exact:true}).click();
 await page.getByText('已保存到本机',{exact:true}).waitFor();
 await page.getByRole('button',{name:'保存单图',exact:true}).click();
 const picker=page.getByLabel('选择要保存的图片');
 await picker.waitFor({timeout:5000});await picker.selectOption('1');
 await page.getByAltText('可长按保存的第 2 张图片').waitFor();
 const expected=await page.evaluate(async()=>{
  const db=await import('/src/studio/database.ts');const render=await import('/src/studio/render.ts');
  const s=(await db.allStories()).find(s=>s.id===localStorage.getItem('shiye:studio:active'));
  const blob=await render.scenePng(render.confirmedScenes(s)[1],s.options);
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].map(n=>n.toString(16).padStart(2,'0')).join('');
 });
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'下载 PNG',exact:true}).click();
 const result=await download;assert.ok(result.suggestedFilename().endsWith('-02.png'));
 assert.equal(createHash('sha256').update(await readFile(await result.path())).digest('hex'),expected);

 await page.evaluate(()=>{
  const original=HTMLCanvasElement.prototype.toBlob;window.__originalToBlob=original;window.__delayedStarted=false;window.__delayedDone=false;let first=true;
  HTMLCanvasElement.prototype.toBlob=function(callback,...args){const delay=first;first=false;if(delay)window.__delayedStarted=true;return original.call(this,blob=>{if(delay)setTimeout(()=>{callback(blob);window.__delayedDone=true;},150);else callback(blob);},...args);};
 });
 await picker.selectOption('0');await page.waitForFunction(()=>window.__delayedStarted);
 await picker.selectOption('1');await page.waitForFunction(()=>window.__delayedDone);
 await page.getByAltText('可长按保存的第 2 张图片').waitFor();
 await page.evaluate(()=>{HTMLCanvasElement.prototype.toBlob=window.__originalToBlob;});

 await page.getByRole('button',{name:'关闭弹窗'}).click();
 await page.getByRole('tab',{name:'素材',exact:true}).click();
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=60;c.height=40;const x=c.getContext('2d');x.fillStyle='#14755c';x.fillRect(0,0,60,40);return c.toDataURL().split(',')[1];});
 await page.getByLabel('上传照片').setInputFiles({name:'可撤销的照片.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
 await page.getByText('可撤销的照片.png',{exact:true}).waitFor();
 await page.getByRole('button',{name:'用作封面照片'}).click();await page.getByText('已保存到本机',{exact:true}).waitFor();
 await page.getByRole('button',{name:'删除照片：可撤销的照片.png'}).click();
 await page.getByRole('button',{name:'移入回收站',exact:true}).click();
 await page.getByRole('button',{name:'撤销删除',exact:true}).waitFor();await page.getByRole('button',{name:'撤销删除',exact:true}).click();
 await page.getByRole('button',{name:'删除照片：可撤销的照片.png'}).waitFor();
 await page.getByRole('button',{name:'删除照片：可撤销的照片.png'}).click();await page.getByRole('button',{name:'移入回收站',exact:true}).click();
 await page.getByRole('button',{name:'打开照片回收站'}).click();

 const recyclePixel=await page.evaluate(async()=>{
  const db=await import('/src/studio/database.ts');const render=await import('/src/studio/render.ts');
  const story=(await db.allStories()).find(s=>s.id===localStorage.getItem('shiye:studio:active'));
  const blob=await render.scenePng(render.confirmedScenes(story)[0],story.options);
  const img=await createImageBitmap(blob),c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);return [...ctx.getImageData(300,300,1,1).data];
 });
 assert.ok(recyclePixel[1]>90&&recyclePixel[1]>recyclePixel[0]*2,'Photo used in the work still renders while in recycle bin');

 assert.ok(await page.getByRole('button',{name:'永久删除：可撤销的照片.png'}).isDisabled());
 assert.ok(await page.getByText(/仍用于.*个作品/).isVisible());
 await page.getByRole('button',{name:'恢复照片：可撤销的照片.png'}).click();
 await page.getByRole('button',{name:'关闭弹窗'}).click();
 assert.ok(await page.getByRole('button',{name:'删除照片：可撤销的照片.png'}).isVisible());

 await page.screenshot({path:'artifacts/photo-library-mobile.jpg',type:'jpeg',quality:60});
 await page.getByLabel('上传照片').setInputFiles({name:'未使用的照片.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
 await page.getByRole('button',{name:'删除照片：未使用的照片.png'}).click();await page.getByRole('button',{name:'移入回收站',exact:true}).click();
 await page.getByRole('button',{name:'打开照片回收站'}).click();
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'永久删除：未使用的照片.png'}).click();
 await page.getByText('回收站是空的。',{exact:true}).waitFor();
 await page.getByRole('button',{name:'关闭弹窗'}).click();
 await page.getByRole('button',{name:'保存单图',exact:true}).click();await page.getByAltText('可长按保存的第 2 张图片').waitFor();
 await page.screenshot({path:'artifacts/select-page-mobile.jpg',type:'jpeg',quality:60});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));

 assert.deepEqual(errors,[]);
 console.log('PASS chosen-page PNG matches exact scene; photo delete, undo, restore and used-photo protection');
}finally{await browser.close();}
