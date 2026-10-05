import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join,resolve,sep} from 'node:path';
import {createUsageStore,DEFAULT_PRICING,readUsage,estimateCost,billingMonth} from '../server/usage-store.mjs';
const request={feature:'copy',provider:'deepseek',model:'deepseek-flash',inputBytes:20000,maxOutput:2600};
const usage={input:1000,output:200,cacheHit:400,cacheMiss:600};
async function fixture(run){const parent=resolve(tmpdir()),root=await mkdtemp(join(parent,'shiye-usage-'));let clock=Date.parse('2026-10-05T00:00:00Z'),fail=false;const store=await createUsageStore({root,now:()=>clock,beforeCommit:async()=>{if(fail)throw Error('disk fault');}});try{await run({root,store,setTime:v=>clock=Date.parse(v),fault:v=>fail=v});}finally{assert.ok(root.startsWith(parent+sep+'shiye-usage-'));await rm(root,{recursive:true,force:true});}}
test('usage validates provider counts, preserves unknown cache split and uses Beijing billing month',()=>{
 assert.deepEqual(readUsage('deepseek',{usage:{prompt_tokens:1000,completion_tokens:200,prompt_cache_hit_tokens:400,prompt_cache_miss_tokens:600}}),usage);
 assert.equal(readUsage('deepseek',{usage:{prompt_tokens:-1,completion_tokens:2}}),null);
 assert.equal(readUsage('deepseek',{usage:{prompt_tokens:3,completion_tokens:2,prompt_cache_hit_tokens:8}}),null);
 assert.deepEqual(readUsage('ollama',{prompt_eval_count:8,eval_count:2}),{input:8,output:2,cacheHit:null,cacheMiss:null});
 assert.equal(readUsage('deepseek',{}),null);assert.equal(estimateCost(usage,DEFAULT_PRICING),0.002816);
 assert.equal(estimateCost({...usage,cacheHit:null,cacheMiss:null},DEFAULT_PRICING),0.0036);
 assert.equal(billingMonth(Date.parse('2026-09-30T16:00:00Z')),'2026-10');
});
test('reservations serialize across store instances, enforce budget and keep pricing snapshots',()=>fixture(async({root,store})=>{
 let data=await store.snapshot();await store.configure({...data.settings,monthlyYuan:.1},data.settings.revision);const other=await createUsageStore({root,now:()=>Date.parse('2026-10-05T00:00:00Z')});
 const values=await Promise.allSettled([store.reserve(request),other.reserve(request)]);assert.equal(values.filter(r=>r.status==='fulfilled').length,1);const row=values.find(r=>r.status==='fulfilled').value;
 await store.finish(row.id,{status:'completed',usage});data=await store.snapshot();assert.equal(data.month.estimatedYuan,.002816);assert.equal(data.month.heldYuan,0);
 const firstPricing=data.rows[0].pricing;await store.configure({...data.settings,pricing:{...data.settings.pricing,output:16}},data.settings.revision);assert.deepEqual((await store.snapshot()).rows[0].pricing,firstPricing);
}));
test('missing usage and interrupted requests retain holds until explicit bill reconciliation',()=>fixture(async({root,store})=>{
 const row=await store.reserve(request);await store.finish(row.id,{status:'cancelled',usage:null});let data=await store.snapshot();assert.equal(data.month.unknownCount,1);assert.equal(data.month.heldYuan,row.reservedYuan);assert.equal(data.rows[0].estimatedYuan,null);
 await assert.rejects(()=>store.reconcile(row.id,-1,'2026-10-05',data.rows[0].revision),/费用/);
 await store.reconcile(row.id,.02,'2026-10-05',data.rows[0].revision);data=await store.snapshot();assert.equal(data.month.manualYuan,.02);assert.equal(data.month.heldYuan,0);assert.equal(data.month.unknownCount,0);
 const again=await createUsageStore({root,now:()=>Date.parse('2026-10-05T00:00:00Z')});assert.equal((await again.snapshot()).month.manualYuan,.02);assert.ok(!(await readFile(join(root,'usage.json'),'utf8')).includes('API_KEY'));
}));
test('settings conflicts, monthly reset, disabled local/cloud calls, failures and corruption fail closed',()=>fixture(async({root,store,setTime,fault})=>{
 let data=await store.snapshot();const old=data.settings;await store.configure({...old,enabled:false},old.revision);await assert.rejects(()=>store.configure(old,old.revision),/更新/);await assert.rejects(()=>store.reserve(request),/关闭/);await assert.rejects(()=>store.reserve({...request,provider:'ollama',model:'local'}),/关闭/);
 data=await store.snapshot();await store.configure({...data.settings,enabled:true},data.settings.revision);fault(true);await assert.rejects(()=>store.reserve(request),/disk fault/);assert.equal((await store.snapshot()).rows.length,0);fault(false);
 const row=await store.reserve(request);await store.finish(row.id,{status:'error',usage});setTime('2026-10-31T16:00:00Z');data=await store.snapshot();assert.equal(data.month.key,'2026-11');assert.equal(data.month.estimatedYuan,0);assert.equal(data.rows.length,1);
 await assert.rejects(()=>store.reserve({...request,model:'unknown-model'}),/单价/);await writeFile(join(root,'usage.json'),'corrupt');await assert.rejects(()=>store.reserve(request),/损坏/);await assert.rejects(()=>createUsageStore({root}),/损坏/);
}));
test('a removed ledger is never silently recreated during an existing session',()=>fixture(async({root,store})=>{
 const row=await store.reserve(request);await store.finish(row.id,{status:'completed',usage});await rm(join(root,'usage.json'));await assert.rejects(()=>store.reserve(request),/账本/);
}));
test('independent Node processes share reservations and orphaned holds survive restart',()=>fixture(async({root,store})=>{
 const {execFile}=await import('node:child_process'),{promisify}=await import('node:util'),exec=promisify(execFile);let data=await store.snapshot();await store.configure({...data.settings,monthlyYuan:.1},data.settings.revision);
 const moduleUrl=new URL('../server/usage-store.mjs',import.meta.url).href;
 const script=`import {createUsageStore} from ${JSON.stringify(moduleUrl)};const s=await createUsageStore({root:${JSON.stringify(root)},now:()=>Date.parse('2026-10-05T00:00:00Z')});try{await s.reserve(${JSON.stringify(request)});console.log(JSON.stringify({ok:true,pid:process.pid}));}catch(e){console.log(JSON.stringify({ok:false,message:e.message,pid:process.pid}));}`;
 const values=(await Promise.all([exec(process.execPath,['--input-type=module','-e',script]),exec(process.execPath,['--input-type=module','-e',script])])).map(r=>JSON.parse(r.stdout));assert.equal(values.filter(r=>r.ok).length,1);assert.match(values.find(r=>!r.ok).message,/预算/);data=await store.snapshot();assert.equal(data.rows.length,1);assert.equal(data.rows[0].status,'interrupted');assert.ok(data.month.heldYuan>0);assert.equal(data.month.unknownCount,1);
 await writeFile(join(root,'usage.lock'),JSON.stringify({pid:values[0].pid,token:'orphan'}));await store.reconcile(data.rows[0].id,.01,'2026-10-05',data.rows[0].revision);assert.equal((await store.snapshot()).month.heldYuan,0);
}));
test('orphan reconciliation accepts the exact revision shown by snapshot',()=>fixture(async({root,store})=>{
 const {execFile}=await import('node:child_process'),{promisify}=await import('node:util');await promisify(execFile)(process.execPath,['--input-type=module','-e',`import {createUsageStore} from ${JSON.stringify(new URL('../server/usage-store.mjs',import.meta.url).href)};const s=await createUsageStore({root:${JSON.stringify(root)}});await s.reserve(${JSON.stringify(request)});`]);const data=await store.snapshot();assert.equal(data.rows[0].status,'interrupted');await store.reconcile(data.rows[0].id,.01,'2026-10-05',data.rows[0].revision);assert.equal((await store.snapshot()).rows[0].manual.yuan,.01);
}));
