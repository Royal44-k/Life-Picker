import {test} from 'node:test';import assert from 'node:assert/strict';
import {planStory} from '../src/studio/planner.ts';import {layoutStory,roughMeasure} from '../src/studio/scene.ts';
import {DEFAULT_OPTIONS} from '../src/core/layout.ts';
const settings={cover:false,toc:'no' as const,ending:'none' as const};
const text=Array.from({length:8},(_,i)=>'## 观察 '+(i+1)+'\n\n这是第'+(i+1)+'段亲身观察，保留自己的表达。').join('\n\n');
const body=(s:ReturnType<typeof planStory>)=>s.pages.filter(p=>p.role==='body'||p.role==='diagram').map(p=>p.source).join('').replace(/\s/g,'');
test('six and nine page goals choose different measured boundaries without deleting original sections',()=>{
 const six=planStory(text,DEFAULT_OPTIONS,{...settings,target:6}),nine=planStory(text,DEFAULT_OPTIONS,{...settings,target:9});
 assert.equal(six.pages.length,6);assert.equal(nine.pages.length,8);
 assert.equal(body(six),text.replace(/\s/g,''));assert.equal(body(nine),body(six));
});
test('auxiliary pages count toward goal, explicit boundaries take priority and short notes are not padded',()=>{
 const six=planStory(text,DEFAULT_OPTIONS,{...settings,target:6,cover:true,ending:'question'});assert.equal(six.pages.length,6);
 const hard=planStory(text.replaceAll('\n\n##','\n\n---\n\n##'),DEFAULT_OPTIONS,{...settings,target:6});assert.equal(hard.pages.length,8);assert.ok(hard.warnings.length);
 assert.equal(planStory('今天记下一个自己的小发现。',DEFAULT_OPTIONS,{...settings,target:9}).pages.length,1);
});
test('target search is deterministic and safe for long code, emoji and each ratio',()=>{
 const source='## 亲历\n\n'+('慢慢记录👨‍👩‍👧‍👦✨。'.repeat(90))+'\n\n\x60\x60\x60js\n'+('const word = "---🙂";\n'.repeat(90))+'\x60\x60\x60';
 for(const ratio of ['square','portrait','story'] as const){
  const options={...DEFAULT_OPTIONS,ratio},a=planStory(source,options,{...settings,target:6}),b=planStory(source,options,{...settings,target:6});
  assert.equal(body(a),source.replace(/\s/g,''));assert.deepEqual(a.pages.map(p=>p.source),b.pages.map(p=>p.source));
  for(const scene of layoutStory(a,roughMeasure))for(const line of scene.lines)assert.ok(line.y+line.lineHeight<=scene.height-115);
 }
});

test('purpose recommendations use explicit evidence and do not rewrite content',async()=>{
 const {purposeAdvice}=await import('../src/studio/purpose.ts'),{newPage}=await import('../src/studio/planner.ts');
 const ordered=newPage('## 实操\n\n1. 先记录素材\n2. 再核对文字');
 assert.equal(purposeAdvice(ordered,'tutorial').template,'steps');
 assert.notEqual(purposeAdvice(newPage('## 看法\n\n- 感受甲\n- 感受乙'),'tutorial').template,'steps');
 assert.equal(purposeAdvice(newPage('## 本周\n\n周一：记录树影。\n\n周三：再次经过。'),'life').template,'timeline');
 assert.notEqual(purposeAdvice(newPage('那次记录。\n\n后来再想起。'),'life').template,'timeline');
 assert.equal(purposeAdvice(newPage('3 次实测。\n\n2 小时观察。'),'product').template,'data');
 assert.notEqual(purposeAdvice(newPage('很轻巧。\n\n很方便。'),'product').template,'data');
 assert.notEqual(purposeAdvice(newPage('## A\n\n## B\n\n## C'),'knowledge').template,'pyramid');
 assert.equal(ordered.source,'## 实操\n\n1. 先记录素材\n2. 再核对文字');
});
test('purpose is optional in legacy backups and validates known purposes only',async()=>{
 const {validateStory,makeBundle,readBundle}=await import('../src/studio/backup.ts');
 const s=planStory('自己记录的细节',DEFAULT_OPTIONS,{...settings,target:0,purpose:'life'});validateStory(s);
 const data=readBundle(new Uint8Array(await(await makeBundle(s,async()=>undefined)).arrayBuffer()));assert.equal(data.story.settings.purpose,'life');
 assert.throws(()=>validateStory({...s,settings:{...s.settings,purpose:'viral'}}),/用途|设置/);
});
