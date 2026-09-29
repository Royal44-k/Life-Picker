import test from 'node:test';import assert from 'node:assert/strict';
import {TEMPLATES,applyTemplate} from '../src/studio/templates.ts';
import {planStory,rebuildStory} from '../src/studio/planner.ts';
import {layoutStory,roughMeasure} from '../src/studio/scene.ts';
import {DEFAULT_OPTIONS} from '../src/core/layout.ts';
import {validateStory,makeBundle,readBundle} from '../src/studio/backup.ts';
const settings={target:0,cover:false,ending:'none'} as const;
test('twelve structural templates preserve editable text and survive backup/rebuild',async()=>{
 assert.equal(TEMPLATES.length,12);const source='## 我亲自试过的记录\n\n第一天写了 20 分钟。\n\n第二天整理 3 张照片。\n\n第三天留下 1 个问题。';
 for(const template of TEMPLATES){
  let s=planStory(source,DEFAULT_OPTIONS,settings);const id=s.pages[0].id;
  s=applyTemplate(s,id,template.id);assert.equal(s.source,source);assert.equal(s.pages[0].source,source);
  assert.equal(validateStory(s).pages[0].template,template.id);
  const round=readBundle(new Uint8Array(await (await makeBundle(s,async()=>undefined)).arrayBuffer()));assert.equal(round.story.pages[0].template,template.id);
  assert.equal(rebuildStory(s,source).pages[0].template,template.id);
  const scenes=layoutStory(s,roughMeasure);assert.ok(scenes.every(s=>s.lines.every(l=>l.x>=70&&l.y>=150&&l.y+l.lineHeight<s.height-115)));
  const text=scenes.flatMap(s=>s.lines.map(l=>l.text)).join('');for(const phrase of ['我亲自试过的记录','第一天写了 20 分钟。','第二天整理 3 张照片。','第三天留下 1 个问题。'])assert.ok(text.includes(phrase),template.id+' missing '+phrase);
 }
});
test('templates have distinct layouts and reject locked pages',()=>{
 const source='## 我的观察\n\n上午走了 3 公里。\n\n下午拍了 5 张照片。\n\n晚上写下 1 个想法。';const story=planStory(source,DEFAULT_OPTIONS,settings);
 const signatures=new Set(TEMPLATES.filter(t=>t.id!=='photo-magazine').map(t=>JSON.stringify(layoutStory(applyTemplate(story,story.pages[0].id,t.id),roughMeasure).map(s=>({lines:s.lines.map(l=>[l.x,l.y,l.size,l.weight]),shapes:s.shapes})))));
 assert.equal(signatures.size,11);
 story.pages[0].locked=true;assert.throws(()=>applyTemplate(story,story.pages[0].id,'quote'),/锁定/);
});
test('structured templates fall back without inventing metrics, dropping code, or losing long text',()=>{
 for(const template of ['data','compare','timeline','steps','checklist','summary'] as const){
  const story=planStory('占位',DEFAULT_OPTIONS,settings);story.pages[0].source='## 很长的真实记录\n\n'+('我写下自己的感受。'.repeat(200))+'\n\n```\n## 字面代码 123\n```';
  const scenes=layoutStory(applyTemplate(story,story.pages[0].id,template),roughMeasure);
  assert.ok(scenes.some(s=>s.warnings.some(w=>w.includes('文字'))));
  const text=scenes.flatMap(s=>s.lines.map(l=>l.text)).join('');assert.equal((text.match(/我写下自己的感受。/g)||[]).length,200);assert.ok(text.includes('## 字面代码 123'));
 }
 const s=planStory('## 只有感受\n\n今天轻松。\n\n明天再试。',DEFAULT_OPTIONS,settings);
 assert.ok(layoutStory(applyTemplate(s,s.pages[0].id,'data'),roughMeasure)[0].warnings.some(w=>w.includes('数值')));
});
test('photo magazine preserves crop and photo and uses a real side column',()=>{
 let story=planStory('## 散步\n\n这是我拍下的天空。',DEFAULT_OPTIONS,settings);story.pages[0].assetId='photo';story.pages[0].focusX=.2;
 story=applyTemplate(story,story.pages[0].id,'photo-magazine');const scene=layoutStory(story,roughMeasure)[0];
 assert.equal(scene.assetId,'photo');assert.equal(scene.photo?.focusX,.2);assert.ok(scene.photo!.w<600);assert.ok(scene.lines[0].x>scene.photo!.x+scene.photo!.w);
});

test('all templates keep text within each ratio at the largest supported font',()=>{
 for(const ratio of ['portrait','square','story'] as const)for(const t of TEMPLATES){
  const options={...DEFAULT_OPTIONS,ratio,fontScale:1.2};const story=planStory('## 尺寸核验\n\n第一项 3 次。\n\n第二项 2 次。\n\n第三项 1 次。',options,settings);
  const scenes=layoutStory(applyTemplate(story,story.pages[0].id,t.id),roughMeasure);
  for(const scene of scenes)for(const line of scene.lines){assert.ok(line.x>=70&&line.y>=150&&line.y+line.lineHeight<scene.height-115,t.id+' '+ratio);assert.ok(line.x+roughMeasure(line.text,line.size,line.weight,line.kind)<=1010,t.id+' horizontal overflow');}
 }
});
test('structured templates do not parse quoted heading text a second time',()=>{
 const story=planStory('## 我的摘录\n\n> ## 这几个符号也是原话\n\n> 另一段有来源的原话。',DEFAULT_OPTIONS,settings);
 const scenes=layoutStory(applyTemplate(story,story.pages[0].id,'compare'),roughMeasure);
 assert.ok(scenes.flatMap(s=>s.lines.map(l=>l.text)).join('').includes('## 这几个符号也是原话'));
});
