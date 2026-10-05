import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm,readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';import {tmpdir} from 'node:os';import {resolve,join,sep} from 'node:path';import {createHash} from 'node:crypto';
import {createSourceStore} from '../server/source-store.mjs';
const draft=id=>({kind:'asset',sourceId:'open-doodles',originalUrl:'https://www.opendoodles.com/'+id+'.png',title:'素材 '+id,summary:'装饰自己的表达',rights:{usage:'reusable',license:'CC0-1.0',licenseUrl:'https://www.opendoodles.com/about',evidence:'已核对官网 CC0'},asset:{url:'https://www.opendoodles.com/'+id+'.png',type:'image/png',sha256:createHash('sha256').update(id).digest('hex'),bytes:99}});
const cache=(ids=['one'],acquire=async id=>({draft:draft(id)}))=>({manifest:ids.map(id=>({id,sourceId:'open-doodles',title:'素材 '+id})),acquire});
async function fixture(run){const parent=resolve(tmpdir()),root=await mkdtemp(join(parent,'shiye-source-jobs-'));try{const {createSourceJobs}=await import('../server/source-jobs.mjs');await run(root,createSourceJobs);}finally{assert.ok(resolve(root).startsWith(parent+sep+'shiye-source-jobs-'));await rm(root,{recursive:true,force:true});}}
test('manual collection persists candidates once and reports actual zero additions on repeat',()=>fixture(async(root,create)=>{
 const store=await createSourceStore({root:join(root,'catalog')}),jobs=await create({root:join(root,'jobs'),getStore:()=>store,assets:cache()});
 await jobs.trigger('manual');await jobs.waitForIdle();let state=jobs.status();assert.equal(state.latest.state,'succeeded');assert.equal(state.latest.added,1);assert.equal((await store.list())[0].review.state,'pending');assert.deepEqual(await store.published(),[]);
 const row=(await store.list())[0];await store.review(row.id,row.revision,{action:'approve',acknowledged:true});
 await jobs.trigger('manual');await jobs.waitForIdle();state=jobs.status();assert.equal(state.latest.added,0);assert.equal(state.latest.duplicates,1);assert.equal((await store.list())[0].review.state,'approved');
 const reopened=await create({root:join(root,'jobs'),getStore:()=>store,assets:cache()});assert.equal(reopened.status().latest.id,state.latest.id);assert.ok(reopened.status().lastSuccessAt);jobs.close();reopened.close();
}));
test('manual and scheduled trigger share one in-flight job and never fetch twice',()=>fixture(async(root,create)=>{
 const store=await createSourceStore({root:join(root,'catalog')});let release,calls=0;const gate=new Promise(r=>release=r);
 const jobs=await create({root,getStore:()=>store,assets:cache(['one'],async id=>{calls++;await gate;return {draft:draft(id)};})});
 const first=await jobs.trigger('manual'),second=await jobs.trigger('automatic');assert.equal(first.id,second.id);assert.equal(second.existing,true);assert.equal(jobs.status().running,true);release();await jobs.waitForIdle();assert.equal(calls,1);assert.equal((await store.list()).length,1);jobs.close();
}));
test('daily check uses 09:00 Shanghai, catches up once, can be disabled and survives restart',()=>fixture(async(root,create)=>{
 let now=Date.parse('2026-10-05T00:59:00Z');const store=await createSourceStore({root:join(root,'catalog')}),options={root:join(root,'jobs'),getStore:()=>store,assets:cache(),now:()=>now},jobs=await create(options);
 assert.equal(await jobs.tick(),false);now+=60_000;assert.equal(await jobs.tick(),true);await jobs.waitForIdle();assert.equal(jobs.status().lastScheduledDay,'2026-10-05');assert.equal(await jobs.tick(),false);
 const reopened=await create(options);assert.equal(await reopened.tick(),false);await reopened.setEnabled(false);now+=86_400_000;assert.equal(await reopened.tick(),false);await reopened.setEnabled(true);assert.equal(await reopened.tick(),true);await reopened.waitForIdle();assert.equal(reopened.status().latest.duplicates,1);jobs.close();reopened.close();
}));
test('partial failure and unavailable catalog remain explicit, successful items stay pending',()=>fixture(async(root,create)=>{
 const store=await createSourceStore({root:join(root,'catalog')}),jobs=await create({root:join(root,'jobs'),getStore:()=>store,assets:cache(['one','two'],async id=>{if(id==='two')throw new Error('来源需要重新核验许可');return {draft:draft(id)};})});
 await jobs.trigger('manual');await jobs.waitForIdle();assert.equal(jobs.status().latest.state,'partial');assert.equal(jobs.status().latest.failed,1);assert.equal(jobs.status().latest.added,1);assert.equal(jobs.status().lastSuccessAt,null);
 let fetched=false;const missing=await create({root:join(root,'missing'),getStore:()=>null,assets:cache(['one'],async()=>{fetched=true;return {};})});await missing.trigger('manual');await missing.waitForIdle();assert.equal(missing.status().latest.state,'failed');assert.match(missing.status().latest.error,/来源库/);assert.equal(fetched,false);jobs.close();missing.close();
}));
test('trashed assets are not resurrected; changed approved assets require review',()=>fixture(async(root,create)=>{
 const store=await createSourceStore({root:join(root,'catalog')}),row=await store.create(draft('one')),approved=await store.review(row.id,1,{action:'approve',acknowledged:true});
 const jobs=await create({root:join(root,'jobs'),getStore:()=>store,assets:cache(['one'],async id=>({draft:{...draft(id),asset:{...draft(id).asset,sha256:'a'.repeat(64)}}}))});
 await jobs.trigger('manual');await jobs.waitForIdle();assert.equal(jobs.status().latest.updated,1);assert.equal((await store.list())[0].review.state,'pending');assert.deepEqual(await store.published(),[]);
 const changed=(await store.list())[0];assert.ok(changed.revision>approved.revision);await store.trash(row.id,changed.revision,true);
 await jobs.trigger('manual');await jobs.waitForIdle();assert.equal(jobs.status().latest.skipped,1);assert.notEqual((await store.list())[0].trashedAt,null);jobs.close();
}));
test('interrupted jobs are recorded on restart without automatic same-day retry',()=>fixture(async(root,create)=>{
 const store=await createSourceStore({root:join(root,'catalog')});let release;const gate=new Promise(r=>release=r),now=()=>Date.parse('2026-10-05T01:05:00Z');
 const jobs=await create({root:join(root,'jobs'),getStore:()=>store,assets:cache(['one'],async id=>{await gate;return {draft:draft(id)};}),now});
 await jobs.trigger('automatic');await mkdir(join(root,'restart'));await copyFile(join(root,'jobs','collection.json'),join(root,'restart','collection.json'));
 const reopened=await create({root:join(root,'restart'),getStore:()=>store,assets:cache(),now});assert.equal(reopened.status().latest.state,'interrupted');assert.equal(await reopened.tick(),false);release();await jobs.waitForIdle();jobs.close();reopened.close();
}));
test('failed checkpoint starts no network work, and corrupt state is never silently overwritten',()=>fixture(async(root,create)=>{
 const store=await createSourceStore({root:join(root,'catalog')});let fetched=false;
 const jobs=await create({root:join(root,'jobs'),getStore:()=>store,assets:cache(['one'],async()=>{fetched=true;return {}; }),beforeCommit:()=>{throw new Error('模拟磁盘故障');}});
 await assert.rejects(()=>jobs.trigger('manual'),/磁盘|保存/);assert.equal(fetched,false);jobs.close();
 const bad=join(root,'broken');await mkdir(bad);await writeFile(join(bad,'collection.json'),'original invalid bytes');await assert.rejects(()=>create({root:bad,getStore:()=>store,assets:cache()}),/损坏/);assert.equal(await readFile(join(bad,'collection.json'),'utf8'),'original invalid bytes');
}));
test('failed progress checkpoint preserves the last persisted counters and prevents further runs',()=>fixture(async(root,create)=>{
 const store=await createSourceStore({root:join(root,'catalog')});let writes=0;
 const jobs=await create({root:join(root,'jobs'),getStore:()=>store,assets:cache(),beforeCommit:()=>{if(++writes>1)throw new Error('模拟后续写入失败');}});
 await jobs.trigger('manual');await jobs.waitForIdle();
 assert.equal((await store.list()).length,1);assert.match(jobs.status().error,/尚未保存/);assert.equal(jobs.status().latest.added,0);
 const saved=JSON.parse(JSON.parse(await readFile(join(root,'jobs','collection.json'),'utf8')).payload);assert.equal(saved.runs[0].added,0);
 await assert.rejects(()=>jobs.trigger('manual'),/尚未保存/);jobs.close();
}));
