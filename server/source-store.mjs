import {randomUUID,createHash} from 'node:crypto';
import {mkdir,readFile,writeFile,rename,rm,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createCandidate,validateCandidate,editCandidate,reviewCandidate,setCandidateTrashed,sourceIdentity,publicCandidate} from './source-model.mjs';
const MAX_ROWS=500,MAX_BYTES=8_000_000;
const hash=value=>createHash('sha256').update(value).digest('hex');
function envelope(format,records){const payload=JSON.stringify({version:1,records});if(Buffer.byteLength(payload)>MAX_BYTES)throw new Error('来源记录超过 8 MB，请分批备份或整理回收站。');return {format,version:1,payload,sha256:hash(payload)};}
function decode(value,format){
 if(!value||value.format!==format||value.version!==1||typeof value.payload!=='string'||Buffer.byteLength(value.payload)>MAX_BYTES||typeof value.sha256!=='string'||hash(value.payload)!==value.sha256)throw new Error('来源数据损坏或校验不一致，原数据保留。');
 let payload;try{payload=JSON.parse(value.payload);}catch{throw new Error('来源数据损坏，原数据保留。');}if(payload.version!==1||!Array.isArray(payload.records)||payload.records.length>MAX_ROWS)throw new Error('来源数据数量或格式无效。');
 const records=payload.records.map(validateCandidate),ids=new Set(),identities=new Set();for(const row of records){const identity=sourceIdentity(row);if(ids.has(row.id)||identities.has(identity))throw new Error('来源数据有重复记录。');ids.add(row.id);identities.add(identity);}return records;
}
export async function createSourceStore({root,now=Date.now,id=randomUUID,beforeCommit=async()=>{}}){
 const folder=resolve(root),file=join(folder,'catalog.json');await mkdir(folder,{recursive:true});let records=[],fingerprint=null,tail=Promise.resolve();
 try{if((await stat(file)).size>MAX_BYTES*2)throw new Error('来源数据文件过大，原文件保留。');const raw=await readFile(file,'utf8');let data;try{data=JSON.parse(raw);}catch{throw new Error('来源库损坏，原文件保留，请从备份恢复。');}records=decode(data,'shiye-source-store');fingerprint=hash(raw);}catch(e){if(e.code!=='ENOENT')throw e;}
 const copy=value=>structuredClone(value),serial=fn=>{const task=tail.then(fn);tail=task.catch(()=>{});return task;};
 async function persist(next){
  if(next.length>MAX_ROWS)throw new Error('来源库最多 500 条（含回收站），请先备份并整理。');
  let current=null;try{current=hash(await readFile(file));}catch(e){if(e.code!=='ENOENT')throw e;}if(current!==fingerprint)throw new Error('来源库已由其他进程修改，请重新载入后再操作；本次修改未保存。');
  const raw=JSON.stringify(envelope('shiye-source-store',next)),temp=join(folder,'.catalog-'+randomUUID()+'.tmp');await beforeCommit();
  try{await writeFile(temp,raw,{flag:'wx',mode:0o600});await rename(temp,file);}catch(e){await rm(temp,{force:true}).catch(()=>{});throw e;}
  records=next;fingerprint=hash(raw);
 }
 function get(id,expected){const row=records.find(r=>r.id===id);if(!row)throw new Error('来源记录不存在，请刷新列表。');if(!Number.isSafeInteger(expected)||row.revision!==expected)throw new Error('另一窗口已更新来源，请先保留编辑内容并重新载入版本。');return row;}
 function unique(row,except=null){if(records.some(r=>r.id!==except&&sourceIdentity(r)===sourceIdentity(row)))throw new Error('这个来源已存在（可能在回收站），不会重复添加；请查看已有记录。');}
 async function replace(row){unique(row,row.id);await persist(records.map(r=>r.id===row.id?row:r));return copy(row);}
 return {
  list:()=>serial(()=>copy([...records].sort((a,b)=>b.updatedAt-a.updatedAt))),
  published:()=>serial(()=>records.map(publicCandidate).filter(Boolean).sort((a,b)=>b.updatedAt-a.updatedAt)),
  create:input=>serial(async()=>{const row=createCandidate(input,{id:id(),now:now()});unique(row);await persist([...records,row]);return copy(row);}),
  edit:(id,expected,input)=>serial(()=>replace(editCandidate(get(id,expected),input,{now:now()}))),
  review:(id,expected,input)=>serial(()=>replace(reviewCandidate(get(id,expected),input,{now:now()}))),
  trash:(id,expected,trashed)=>serial(()=>replace(setCandidateTrashed(get(id,expected),trashed,{now:now()}))),
  erase:(id,expected)=>serial(async()=>{const row=get(id,expected);if(row.trashedAt===null)throw new Error('请先移入回收站，再永久删除。');await persist(records.filter(r=>r.id!==id));return {deleted:true};}),
  backup:()=>serial(()=>envelope('shiye-sources',records)),
  restore:bundle=>serial(async()=>{const incoming=decode(bundle,'shiye-sources'),seen=new Set(records.map(sourceIdentity)),added=[];let skipped=0;for(const old of incoming){if(seen.has(sourceIdentity(old))){skipped++;continue;}const row=createCandidate(old,{id:id(),now:now()});row.collectedAt=old.collectedAt;row.review.note='从备份恢复，使用前请重新核对来源与许可。';row.trashedAt=old.trashedAt;added.push(validateCandidate(row));seen.add(sourceIdentity(row));}if(added.length)await persist([...records,...added]);return {added:added.length,skipped};})
 };
}
export async function recoverSourceStore({root,bundle,now=Date.now,id=randomUUID}){
 const incoming=decode(bundle,'shiye-sources'),folder=resolve(root),file=join(folder,'catalog.json');
 const info=await stat(file);if(info.size>MAX_BYTES*2)throw new Error('来源库文件过大，原文件保留，请在电脑上检查后恢复。');
 const original=await readFile(file);let healthy=false;
 try{decode(JSON.parse(original.toString('utf8')),'shiye-source-store');healthy=true;}catch{}
 if(healthy)throw new Error('当前来源库正常，请使用普通恢复，不会覆盖已有记录。');
 const records=incoming.map(old=>{const row=createCandidate(old,{id:id(),now:now()});row.collectedAt=old.collectedAt;row.review.note='从备份恢复，使用前请重新核对来源与许可。';row.trashedAt=old.trashedAt;return validateCandidate(row);});
 const raw=JSON.stringify(envelope('shiye-source-store',records)),suffix=randomUUID(),archive=join(folder,'catalog-before-recovery-'+suffix+'.json'),temp=join(folder,'.catalog-recovery-'+suffix+'.tmp');
 await writeFile(archive,original,{flag:'wx',mode:0o600});
 try{
  await writeFile(temp,raw,{flag:'wx',mode:0o600});
  if(hash(await readFile(file))!==hash(original))throw new Error('来源库已由其他进程修改，原文件与备份均已保留，请重新载入。');
  await rename(temp,file);
 }catch(error){await rm(temp,{force:true}).catch(()=>{});throw error;}
 return {store:await createSourceStore({root,now,id}),added:records.length};
}
