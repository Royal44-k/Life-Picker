import test from 'node:test';import assert from 'node:assert/strict';import {createServer} from 'node:http';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {resolve,join,sep} from 'node:path';import {createHash} from 'node:crypto';
import {createSourceStore} from '../server/source-store.mjs';import {createSourceJobs} from '../server/source-jobs.mjs';import {createSourceHandler} from '../server/source-api.mjs';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8/x8AAwMCAO+aSugAAAAASUVORK5CYII=','base64'),sha=createHash('sha256').update(png).digest('hex');
const draft={kind:'asset',sourceId:'open-doodles',originalUrl:'https://www.opendoodles.com/test.png',title:'可核对的测试素材',summary:'测试候选',rights:{usage:'reusable',license:'CC0-1.0',licenseUrl:'https://www.opendoodles.com/about',evidence:'已核对官网'},asset:{url:'https://www.opendoodles.com/test.png',type:'image/png',sha256:sha,bytes:png.length}};
const call=(base,path,method='GET',body,code='12345678',extra={})=>fetch(base+'/api/sources/'+path,{method,headers:{'Content-Type':'application/json','X-Shiye-Code':code,...extra},body:body===undefined?undefined:JSON.stringify(body)});
async function fixture(run){const parent=resolve(tmpdir()),root=await mkdtemp(join(parent,'shiye-collection-api-')),store=await createSourceStore({root:join(root,'catalog')});let cacheReady=true;
 const assets={manifest:[{id:'test-asset',sourceId:'open-doodles',title:draft.title}],acquire:async()=>({draft}),read:async value=>{if(!cacheReady||value!==sha)throw new Error('cache unavailable');return png;}};
 const jobs=await createSourceJobs({root:join(root,'jobs'),getStore:()=>store,assets}),handler=createSourceHandler(store,'12345678',{jobs,assets}),server=createServer((req,res)=>void handler(req,res));await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 try{await run({base,store,jobs,setCacheReady:value=>cacheReady=value});}finally{jobs.close();await jobs.waitForIdle();await new Promise(r=>server.close(r));assert.ok(resolve(root).startsWith(parent+sep+'shiye-collection-api-'));await rm(root,{recursive:true,force:true});}
}
test('collection API protects status and trigger, records real work and persists automatic preference',()=>fixture(async({base,jobs,store})=>{
 assert.equal((await call(base,'collection','GET',undefined,'')).status,401);
 const status=await call(base,'collection');assert.equal(status.status,200);assert.equal((await status.json()).ready,true);
 assert.equal((await call(base,'collection/run','POST',{},'12345678',{Origin:'https://other.example'})).status,403);
 const started=await call(base,'collection/run','POST',{});assert.equal(started.status,202);assert.ok((await started.json()).id);await jobs.waitForIdle();assert.equal((await store.list()).length,1);
 const result=await(await call(base,'collection')).json();assert.equal(result.latest.added,1);assert.equal(result.latest.state,'succeeded');assert.equal(result.personalXhs.state,'not_connected');
 assert.equal((await call(base,'collection/schedule','PUT',{enabled:'false'})).status,400);
 assert.equal((await call(base,'collection/schedule','PUT',{enabled:false})).status,200);assert.equal(jobs.status().enabled,false);
}));
test('pending previews require pairing; public files require current approval; missing cache cannot be approved',()=>fixture(async({base,store,setCacheReady})=>{
 const row=await store.create(draft);
 assert.equal((await call(base,'assets/'+row.id,'GET',undefined,'')).status,401);
 assert.equal((await call(base,'public-assets/'+row.id,'GET',undefined,'')).status,404);
 let file=await call(base,'assets/'+row.id);assert.equal(file.status,200);assert.equal(file.headers.get('content-type'),'image/png');assert.equal(file.headers.get('cache-control'),'no-store');assert.deepEqual(Buffer.from(await file.arrayBuffer()),png);
 setCacheReady(false);assert.equal((await call(base,'records/'+row.id+'/review','POST',{expected:1,action:'approve',acknowledged:true})).status,409);assert.equal((await store.list())[0].review.state,'pending');
 setCacheReady(true);assert.equal((await call(base,'records/'+row.id+'/review','POST',{expected:1,action:'approve',acknowledged:true})).status,200);
 file=await call(base,'public-assets/'+row.id,'GET',undefined,'');assert.equal(file.status,200);assert.deepEqual(Buffer.from(await file.arrayBuffer()),png);
 const approved=(await store.list())[0];await store.edit(row.id,approved.revision,{...draft,title:'修改后需重审'});assert.equal((await call(base,'public-assets/'+row.id,'GET',undefined,'')).status,404);
}));
test('collection unavailable is explicit without hiding the manual source catalog',async()=>{
 const server=createServer((req,res)=>void createSourceHandler({list:async()=>[],published:async()=>[]},'12345678')(req,res));await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 try{const status=await(await call(base,'collection')).json();assert.equal(status.ready,false);assert.match(status.error,/公开素材|任务/);assert.equal((await call(base,'catalog')).status,200);}finally{await new Promise(r=>server.close(r));}
});
