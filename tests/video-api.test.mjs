import test from 'node:test';import assert from 'node:assert/strict';import {createServer} from 'node:http';import {mkdtemp,mkdir,rm,writeFile} from 'node:fs/promises';import {resolve,sep} from 'node:path';
import {createVideoService} from '../server/video-jobs.mjs';import {createVideoHandler} from '../server/video-api.mjs';import {frame} from './helpers/video-png.mjs';
test('video HTTP enforces pairing, origin, owner and bounded valid input for create/status/file/cancel',async()=>{
 const root=resolve('.local/video-tests');await mkdir(root,{recursive:true});const dir=await mkdtemp(resolve(root,'http-')),owner='d'.repeat(32);
 const service=await createVideoService({root:dir,render:async(_s,d)=>{const path=resolve(d,'memory.mp4');await writeFile(path,'generated-video');return {path,width:720,height:1280,duration:15,bytes:15};}});
 const server=createServer(createVideoHandler(service,'12345678',{readiness:async()=>({ready:true})}));await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,headers={'Content-Type':'application/json','X-Shiye-Code':'12345678','X-Shiye-Video-Owner':owner};
 try{
 assert.equal((await fetch(base+'/api/video/status')).status,200);assert.equal((await fetch(base+'/api/video/jobs',{method:'POST',body:'{}'})).status,401);assert.equal((await fetch(base+'/api/video/jobs',{method:'POST',headers:{...headers,Origin:'https://other.example'},body:'{}'})).status,403);
 assert.equal((await fetch(base+'/api/video/jobs',{method:'POST',headers,body:JSON.stringify({requestId:'valid-request',duration:15,frames:[]})})).status,400);
 const response=await fetch(base+'/api/video/jobs',{method:'POST',headers,body:JSON.stringify({requestId:'valid-request',duration:15,frames:[frame()]})});assert.equal(response.status,202);const job=await response.json();assert.ok(job.id);assert.ok(!JSON.stringify(job).includes(owner));
 let done;for(let i=0;i<30;i++){done=await(await fetch(base+'/api/video/jobs/'+job.id,{headers})).json();if(done.status==='done')break;await new Promise(r=>setTimeout(r,10));}assert.equal(done.status,'done');assert.ok(!JSON.stringify(done).includes(dir));
 assert.equal((await fetch(base+'/api/video/jobs/'+job.id,{headers:{...headers,'X-Shiye-Video-Owner':'e'.repeat(32)}})).status,404);const file=await fetch(base+'/api/video/jobs/'+job.id+'/file',{headers});assert.equal(file.status,200);assert.equal(file.headers.get('content-type'),'video/mp4');assert.equal(await file.text(),'generated-video');
 assert.equal((await fetch(base+'/api/video/jobs/'+job.id,{method:'DELETE',headers})).status,200);assert.equal((await fetch(base+'/api/video/jobs/'+job.id+'/file',{headers})).status,409);
 }finally{await new Promise(r=>server.close(r));await service.close();if(!resolve(dir).startsWith(root+sep))throw new Error('Unsafe cleanup');await rm(dir,{recursive:true,force:true});}
});
