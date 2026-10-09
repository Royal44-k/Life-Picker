import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {OPEN_DESIGNS,createOpenTemplate} from '../src/studio/open-templates.ts';
import {TEMPLATES,templateExists} from '../src/studio/templates.ts';import {getTheme} from '../src/core/themes.ts';
import {layoutStory,roughMeasure} from '../src/studio/scene.ts';import {validateStory,makeBundle,readBundle} from '../src/studio/backup.ts';
test('open theme sets preserve provenance and exact license notice with no third-party font dependency',()=>{
 assert.equal(TEMPLATES.length,12);assert.equal(OPEN_DESIGNS.length,2);
 for(const d of OPEN_DESIGNS){assert.equal(d.license,'MIT');assert.match(d.revision,/^[a-f0-9]{40}$/);assert.ok(d.source.startsWith('https://github.com/'));assert.ok(d.author);assert.ok(d.modifications);assert.ok(templateExists(d.id));assert.equal(getTheme(d.theme).id,d.theme);assert.match(readFileSync('public'+d.licenseUrl,'utf8'),/Permission is hereby granted/);}
 assert.equal(getTheme('gaia').paper.toLowerCase(),'#fff8e1');assert.equal(getTheme('white').accent.toLowerCase(),'#2a76dd');
});
test('open designs are editable cover/body plans and preserve all text, photos, crop, and backup at every ratio',async()=>{
 const source='## 我的真实小事\n\n第一天认真写下了观察。\n\n第二天记录了照片后的感受。';
 for(const d of OPEN_DESIGNS)for(const ratio of ['portrait','square','story'] as const){
  const s=createOpenTemplate(d.id,source,ratio,roughMeasure);assert.equal(s.source,source);assert.equal(s.options.theme,d.theme);assert.equal(s.pages[0].role,'cover');assert.ok(s.pages.some(p=>p.role==='body'));assert.ok(s.pages.every(p=>p.template===d.id));s.pages.find(p=>p.role==='body')!.assetId='photo';s.pages.find(p=>p.role==='body')!.focusX=.2;
  assert.equal(validateStory(s).source,source);const scenes=layoutStory(s,roughMeasure);const words=scenes.filter(p=>p.role==='body').flatMap(p=>p.lines.map(l=>l.text)).join('');for(const text of ['第一天认真写下了观察。','第二天记录了照片后的感受。'])assert.equal(words.split(text).length-1,1);assert.equal(scenes.filter(p=>p.assetId==='photo').length,1);assert.equal(scenes.find(p=>p.assetId==='photo')!.photo!.focusX,.2);
  for(const p of scenes)for(const line of p.lines){assert.ok(line.y+line.lineHeight<p.height-115);assert.ok(line.x+roughMeasure(line.text,line.size,line.weight,line.kind)<=1010);}
  s.pages.forEach(p=>{delete p.assetId;});const round=readBundle(new Uint8Array(await(await makeBundle(s,async()=>undefined)).arrayBuffer()));assert.equal(round.story.options.theme,d.theme);assert.ok(round.story.pages.every(p=>p.template===d.id));
 }
 assert.throws(()=>createOpenTemplate('remote-code' as any,source),/模板/);
});
