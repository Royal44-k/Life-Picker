import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();await page.goto('http://localhost:5173');await page.getByRole('heading',{name:'把经历，编成作品。'}).waitFor();
 const result=await page.evaluate(async()=>{
  const {planStory}=await import('/src/studio/planner.ts'),{applyTemplate}=await import('/src/studio/templates.ts'),{layoutStory}=await import('/src/studio/scene.ts'),{drawScene}=await import('/src/studio/render.ts'),{createMeasure}=await import('/src/core/renderer.ts'),{DEFAULT_OPTIONS}=await import('/src/core/layout.ts');
  const photo=document.createElement('canvas');photo.width=200;photo.height=200;const cx=photo.getContext('2d');cx.fillStyle='#14755c';cx.fillRect(0,0,200,200);const blob=await new Promise(r=>photo.toBlob(r));
  const asset={id:'solid',name:'solid.png',type:'image/png',width:200,height:200,bytes:blob.size,blob,createdAt:1};
  let story=planStory('## 一张照片\n\n> 保留照片的真实颜色\n\n```js\nconst keep = true;\n```\n\n- 一条记录',DEFAULT_OPTIONS,{target:0,cover:false,ending:'none'});story.pages[0].assetId='solid';story=applyTemplate(story,story.pages[0].id,'photo-magazine');
  const scene=layoutStory(story,createMeasure(story.options))[0],canvas=document.createElement('canvas');await drawScene(canvas,scene,story.options,1080,async()=>asset);
  const ctx=canvas.getContext('2d');const tinted=[];for(const line of scene.lines.filter(l=>l.kind==='quote'||l.kind==='code')){const rgb=[...ctx.getImageData(300,Math.floor(line.y+10),1,1).data];if(rgb[0]!==20||rgb[1]!==117||rgb[2]!==92)tinted.push({kind:line.kind,rgb});}
  const list=scene.lines.find(l=>l.marker);let markerPixels=0;if(list){const data=ctx.getImageData(90,Math.floor(list.y),25,Math.ceil(list.lineHeight)).data;for(let i=0;i<data.length;i+=4)if(data[i]!==20||data[i+1]!==117||data[i+2]!==92)markerPixels++;}
  return {tinted,markerPixels};
 });
 assert.deepEqual(result.tinted,[],'right-column block backgrounds must not cover photo');assert.equal(result.markerPixels,0,'list marker must stay in the right column');console.log('PASS photo magazine quote/code/list painting stays inside its text column');
}finally{await browser.close();}
