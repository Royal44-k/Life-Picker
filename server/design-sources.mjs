import {createHash,randomUUID} from 'node:crypto';
import {mkdir,writeFile,rename,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {parseSourceDraft,sourceIdentity} from './source-model.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const queries={marp:'marp theme license:mit archived:false',reveal:'reveal.js theme license:mit archived:false'};
const cut=(s,n)=>Array.from(typeof s==='string'?s:'').reduce((x,c)=>x.length+c.length<=n?x+c:x,'');
class DesignConnectionError extends Error {}
async function json(fetcher,path,signal){
 const response=await fetcher('https://api.github.com'+path,{redirect:'error',signal,headers:{Accept:'application/vnd.github+json','User-Agent':'Shiye-Open-Design/1.10','X-GitHub-Api-Version':'2022-11-28'}});
 if(response.redirected)throw new DesignConnectionError('GitHub 来源发生跳转，请稍后核对。');
 if([403,429].includes(response.status))throw new DesignConnectionError('GitHub 暂时拒绝访问或触发匿名接口限流，请稍后手动重试。');
 if(!response.ok){if(response.status===404)throw Error('候选许可不存在。');throw new DesignConnectionError('GitHub 接口暂不可用（HTTP '+response.status+'）。');}
 if(!(response.headers.get('content-type')||'').includes('application/json'))throw new DesignConnectionError('GitHub 响应格式变化。');
 if(Number(response.headers.get('content-length'))>1000000){await response.body?.cancel();throw new DesignConnectionError('GitHub 响应过大。');}
 if(!response.body)throw new DesignConnectionError('GitHub 响应为空。');const reader=response.body.getReader(),chunks=[];let size=0;
 try{while(true){signal.throwIfAborted();const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1000000)throw new DesignConnectionError('GitHub 响应过大。');chunks.push(value);}}
 catch(e){await reader.cancel().catch(()=>{});throw e;}finally{reader.releaseLock();}
 try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new DesignConnectionError('GitHub 响应无法解析。');}
}
export async function createDesignSources({root,getStore,fetcher=fetch,now=Date.now}){
 const folder=resolve(root);await mkdir(folder,{recursive:true});let active=false,candidates=new Map(),last={checkedAt:null,kind:'marp',results:[],failures:0,partial:false,error:''};
 const status=()=>({...structuredClone(last),running:active});
 async function exclusive(signal,fn){if(active)throw Error('开放设计正在处理，请稍后再试。');signal?.throwIfAborted();active=true;try{return await fn();}finally{active=false;}}
 async function discover(input,signal){
  if(!input||!Object.hasOwn(queries,input.kind))throw Error('请选择 Marp 或 reveal.js 主题。');
  return exclusive(signal,async()=>{
   const deadline=AbortSignal.any([AbortSignal.timeout(80000),...(signal?[signal]:[])]),request=path=>json(fetcher,path,AbortSignal.any([deadline,AbortSignal.timeout(15000)]));
   try{
    const data=await request('/search/repositories?q='+encodeURIComponent(queries[input.kind])+'&per_page=6&sort=updated');
    if(!data||!Array.isArray(data.items)||data.items.length>100)throw new DesignConnectionError('GitHub 搜索结果格式变化。');
    const found=new Map();let failures=0;const seen=new Set();
    for(const repo of data.items.slice(0,6)){
     deadline.throwIfAborted();const name=repo?.full_name;
     if(typeof name!=='string'||!/^([A-Za-z0-9][A-Za-z0-9-]{0,38})\/([A-Za-z0-9_.-]{1,100})$/.test(name)||name.split('/')[1]==='..'||repo.html_url!=='https://github.com/'+name){failures++;continue;}
     if(seen.has(name.toLowerCase()))continue;seen.add(name.toLowerCase());
     try{
      if(repo.license?.spdx_id!=='MIT')throw Error('许可未确认');
      const l=await request('/repos/'+name+'/license');
      if(l?.license?.spdx_id!=='MIT'||l.encoding!=='base64'||typeof l.content!=='string'||l.content.length>12000||!/^[a-f0-9]{40}$/.test(l.sha)||typeof l.html_url!=='string'||!l.html_url.startsWith('https://github.com/'+name+'/blob/'))throw Error('许可未确认');
      const bytes=Buffer.from(l.content,'base64'),legal=bytes.toString('utf8');
      if(legal.length>3000||!legal.includes('Permission is hereby granted, free of charge')||!legal.includes('THE SOFTWARE IS PROVIDED')||!legal.includes('Copyright'))throw Error('MIT 声明需人工核对');
      const digest=hash(bytes),key=hash(name.toLowerCase()+':'+l.sha);
      const draft=parseSourceDraft({kind:'reference',sourceId:'github-design',originalUrl:repo.html_url,title:cut(name,120),author:{name:cut(name.split('/')[0],100),url:'https://github.com/'+name.split('/')[0]},tags:['开放设计','待适配',input.kind],summary:'',analysis:'',metrics:[],rights:{usage:'reference-only',license:'MIT',licenseUrl:l.html_url,attribution:legal,checkedAt:null,changes:'尚未适配为拾页模板。',evidence:'GitHub 官方许可接口，核验时间 '+new Date(now()).toISOString()+'；许可 blob '+l.sha+'；SHA-256 '+digest+'。项目许可不代表演示照片、插画及外部字体均可复用，适配前须分别核对。'},asset:null});
      const item={key,title:draft.title,url:repo.html_url,description:cut(repo.description,300),licenseUrl:l.html_url,checkedAt:now(),licenseSha256:digest};
      deadline.throwIfAborted();const target=join(folder,key+'.json'),temp=target+'.'+randomUUID()+'.tmp';
      try{await writeFile(temp,JSON.stringify({repo:name,licenseBlob:l.sha,licenseSha256:digest,licenseText:legal,checkedAt:item.checkedAt}),{flag:'wx',mode:0o600});deadline.throwIfAborted();await rename(temp,target);}finally{await rm(temp,{force:true}).catch(()=>{});}
      found.set(key,{item,draft});
     }catch(e){if(deadline.aborted||e instanceof DesignConnectionError||e instanceof TypeError)throw e;if(['TimeoutError','AbortError'].includes(e.name))throw new DesignConnectionError('GitHub 连接超时，请稍后手动重试。');failures++;}
    }
    deadline.throwIfAborted();candidates=found;last={checkedAt:now(),kind:input.kind,results:[...found.values()].map(x=>x.item),failures,partial:failures>0||data.incomplete_results===true,error:''};return {...status(),running:false};
   }catch(e){if(signal?.aborted)throw new DOMException('开放设计检查已取消。','AbortError');const message=deadline.aborted?'开放设计检查超时，请稍后手动重试。':e instanceof TypeError?'无法连接 GitHub，请稍后手动重试。':e.message;last={...last,error:message};throw Error(message);}
  });
 }
 async function importCandidate(input,signal){return exclusive(signal,async()=>{
  const candidate=candidates.get(input?.key);if(!candidate||now()-candidate.item.checkedAt>86400000)throw Error('候选已失效，请重新检查开放设计。');
  const store=getStore();if(!store)throw Error('来源库暂不可用。');const rows=await store.list();signal?.throwIfAborted();const existing=rows.find(r=>sourceIdentity(r)===sourceIdentity(candidate.draft));if(existing)return {record:existing,duplicate:true};
  const record=await store.create(candidate.draft);return {record,duplicate:false};
 });}
 return {status,discover,import:importCandidate};
}
