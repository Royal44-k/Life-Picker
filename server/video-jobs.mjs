import {randomUUID,createHash} from 'node:crypto';
import {mkdir,readdir,rm,unlink} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {validateVideoInput,renderMemoryVideo} from './video-render.mjs';
export async function createVideoService({root,render=renderMemoryVideo,ttlMs=600000,queueLimit=3}={}){
 const directory=resolve(root);await mkdir(directory,{recursive:true});const jobs=new Map();let activeId=null,worker=null,closed=false,created=[];
 function folder(id){if(!/^[a-f0-9-]{36}$/.test(id))throw new Error('Invalid job identifier');const path=resolve(directory,'job-'+id);if(!path.startsWith(directory+sep))throw new Error('Unsafe render path');return path;}
 async function remove(id){await rm(folder(id),{recursive:true,force:true});}
 for(const name of await readdir(directory))if(/^job-[a-f0-9-]{36}$/.test(name))await remove(name.slice(4));
 function own(owner,id){const job=jobs.get(id);if(!job||job.owner!==owner)throw new Error('找不到这个短片任务，可能已过期或服务已重启。');return job;}
 function status(j){return {id:j.id,status:j.status,progress:j.progress,error:j.error,expiresAt:j.finishedAt?j.finishedAt+ttlMs:null,...(j.result?{video:{width:j.result.width,height:j.result.height,duration:j.result.duration,bytes:j.result.bytes}}:{})};}
 async function cleanup(){for(const j of jobs.values())if(j.finishedAt&&Date.now()-j.finishedAt>=ttlMs&&j.id!==activeId){try{await remove(j.id);jobs.delete(j.id);}catch{/* Windows may still be finishing a download; retry next cleanup. */}}}
 const timer=setInterval(()=>void cleanup(),Math.min(ttlMs,60000));timer.unref();
 function kick(){if(worker||closed)return;worker=(async()=>{while(!closed){const job=[...jobs.values()].find(j=>j.status==='queued');if(!job)break;activeId=job.id;job.status='rendering';
   try{await mkdir(folder(job.id),{recursive:true});if(job.controller.signal.aborted)throw new DOMException('Cancelled','AbortError');const result=await render(job.source,folder(job.id),{signal:job.controller.signal,onProgress:n=>{if(job.status==='rendering')job.progress=n;}});
    if(job.controller.signal.aborted)throw new DOMException('Cancelled','AbortError');job.result=result;job.progress=100;job.status='done';
    for(const name of await readdir(folder(job.id)))if(/^frame-\d+\.png$/.test(name))await unlink(resolve(folder(job.id),name));
   }catch(e){job.status=job.controller.signal.aborted?'cancelled':'failed';job.error=job.status==='cancelled'?'已取消，原相册保留。':e.message||'生成失败，请重试。';job.result=null;try{await remove(job.id);}catch{}}
   finally{job.source=null;job.finishedAt=Date.now();activeId=null;}
  }})().finally(()=>{worker=null;if(!closed&&[...jobs.values()].some(j=>j.status==='queued'))kick();});}
 const service={
  async submit(owner,requestId,input){
   if(closed)throw new Error('短片服务正在关闭，请稍后重试。');if(!/^[a-f0-9]{32}$/.test(owner)||typeof requestId!=='string'||!/^[-\w]{8,80}$/.test(requestId))throw new Error('短片会话或请求标识无效，请刷新页面。');
   const source=validateVideoInput(input),hash=createHash('sha256').update(String(source.duration));for(const f of source.frames){hash.update(f.bytes);hash.update(JSON.stringify(f.photo||null));}const fingerprint=hash.digest('hex');
   await cleanup();const existing=[...jobs.values()].find(j=>j.owner===owner&&j.requestId===requestId);if(existing){if(existing.fingerprint!==fingerprint)throw new Error('这次请求内容已改变，请重新发起短片任务。');return status(existing);}
   if([...jobs.values()].filter(j=>['queued','rendering'].includes(j.status)).length>=queueLimit)throw new Error('短片队列已满，请等待已有任务完成。');
   created=created.filter(t=>Date.now()-t<3600000);if(created.length>=20)throw new Error('本小时已创建 20 个短片任务，请稍后再试。');created.push(Date.now());
   const job={id:randomUUID(),owner,requestId,fingerprint,source,status:'queued',progress:0,createdAt:Date.now(),finishedAt:0,error:undefined,result:null,controller:new AbortController()};jobs.set(job.id,job);kick();return status(job);
  },
  get(owner,id){return status(own(owner,id));},
  async cancel(owner,id){const j=own(owner,id);j.controller.abort();j.status='cancelled';j.error='已取消，原相册保留。';j.finishedAt=Date.now();j.result=null;if(activeId!==id){j.source=null;await remove(id);}return status(j);},
  async file(owner,id){const j=own(owner,id);if(j.status!=='done'||!j.result)throw new Error('短片尚未完成或已过期，请检查任务状态。');return {...j.result};},
  cleanup,
  async close(){closed=true;clearInterval(timer);for(const j of jobs.values())j.controller.abort();if(worker)await worker;for(const j of jobs.values())await remove(j.id);jobs.clear();}
 };
 return service;
}
