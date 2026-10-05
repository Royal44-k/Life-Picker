import {timingSafeEqual} from 'node:crypto';
function readJson(req,limit){return new Promise((resolve,reject)=>{let length=0,done=false;const chunks=[];const finish=(error)=>{if(done)return;done=true;clearTimeout(timer);req.removeListener('data',data);req.removeListener('end',end);req.removeListener('error',failed);req.removeListener('aborted',aborted);if(error){reject(error);req.resume();return;}try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));}catch{reject(Object.assign(new Error('请求内容不是有效 JSON。'),{status:400}));}};const data=chunk=>{length+=chunk.length;if(length>limit){finish(Object.assign(new Error('来源数据过大，请分批处理。'),{status:413}));return;}chunks.push(chunk);},end=()=>finish(),failed=()=>finish(new Error('来源数据接收中断，请重试。')),aborted=()=>failed(),timer=setTimeout(()=>finish(Object.assign(new Error('接收来源数据超时，请重试。'),{status:408})),20000);req.on('data',data);req.on('end',end);req.on('error',failed);req.on('aborted',aborted);});}
export function createSourceHandler(store,pairCode,{unavailable='来源库暂时不可用，原文件已保留，请检查电脑服务。',recover=null,jobs=null,assets=null,jobsUnavailable='公开素材任务暂时不可用，手动来源仍可管理。请检查电脑服务。'}={}){
 let badCodes=[],writes=[],recovering=false;
 const send=(res,status,value)=>{if(res.destroyed)return;res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
  const collectionStatus=()=>jobs?{ready:true,...jobs.status()}:{ready:false,error:jobsUnavailable};
 const assetBytes=async row=>{
  if(!row||row.kind!=='asset')throw Object.assign(new Error('未找到可用素材。'),{status:404});
  try{if(!assets||row.asset?.type!=='image/png'||!row.asset.sha256)throw new Error();const bytes=await assets.read(row.asset.sha256);if(bytes.length!==row.asset.bytes)throw new Error();return bytes;}
  catch{throw Object.assign(new Error('素材文件尚未就绪或校验发生变化，请先检查公开素材更新，再重新审核。'),{status:409});}
 };
 const sendImage=(res,bytes)=>{if(res.destroyed)return;res.writeHead(200,{'Content-Type':'image/png','Content-Length':bytes.length,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});res.end(bytes);};
 return async(req,res)=>{
  const path=(req.url||'').split('?')[0],method=req.method;
  if(req.headers.origin&&![`http://${req.headers.host}`,`https://${req.headers.host}`].includes(req.headers.origin)){send(res,403,{error:'请从拾页页面操作来源库。'});return;}
  if(path==='/api/sources/status'&&method==='GET'){send(res,200,{ready:!!store,mode:'local-computer',requiresPairing:true,maxRecords:500,...(!store?{error:unavailable,canRecover:!!recover}:{})});return;}
  if(path==='/api/sources/published'&&method==='GET'){try{if(!store)throw new Error(unavailable);send(res,200,{records:await store.published()});}catch{send(res,503,{error:unavailable});}return;}
  const publicFile=/^\/api\/sources\/public-assets\/([\w:-]{1,100})$/.exec(path);
  if(publicFile&&method==='GET'){
   try{
    const row=store?(await store.published()).find(r=>r.id===publicFile[1]):null;
    if(!row)throw Object.assign(new Error('未找到已通过审核的素材。'),{status:404});
    const bytes=await assetBytes(row),current=(await store.published()).find(r=>r.id===row.id&&r.revision===row.revision);
    if(!current)throw Object.assign(new Error('来源状态已变化，请刷新素材列表。'),{status:404});
    sendImage(res,bytes);
   }catch(error){send(res,error.status||503,{error:error.status?error.message:'素材暂时不可用，请稍后重试。'});}
   return;
  }
  badCodes=badCodes.filter(t=>Date.now()-t<60000);if(badCodes.length>=10){send(res,429,{error:'连接码尝试过于频繁，请一分钟后再试。'});return;}
  const code=String(req.headers['x-shiye-code']||'');if(!/^\d{8}$/.test(code)||code.length!==pairCode.length||!timingSafeEqual(Buffer.from(code),Buffer.from(pairCode))){badCodes.push(Date.now());send(res,401,{error:'连接码不正确，请查看电脑启动窗口中的 8 位连接码。'});return;}
  if(recovering){send(res,409,{error:'正在恢复来源库，请稍后刷新。'});return;}
  const mutation=['POST','PUT','DELETE'].includes(method);if(mutation){writes=writes.filter(t=>Date.now()-t<60000);if(writes.length>=60){send(res,429,{error:'来源操作较频繁，请稍后重试。'});return;}writes.push(Date.now());}
  try{
   if(path==='/api/sources/recover'&&method==='POST'&&recover){const body=await readJson(req,18_000_000);if(store)throw new Error('当前来源库正常，请使用普通恢复，不会覆盖已有记录。');if(recovering)throw Object.assign(new Error('正在恢复来源库，请稍后刷新。'),{status:409});if(body.acknowledged!==true)throw new Error('请确认保留损坏原文件并从备份恢复。');recovering=true;try{const result=await recover(body.bundle);store=result.store;send(res,200,{added:result.added,originalPreserved:true});}finally{recovering=false;}return;}
   if(path==='/api/sources/collection'&&method==='GET'){send(res,200,collectionStatus());return;}
   if(path==='/api/sources/collection/run'&&method==='POST'){
    if(!jobs){send(res,503,{error:jobsUnavailable});return;}if(!store){send(res,503,{error:unavailable});return;}
    await readJson(req,1000);send(res,202,await jobs.trigger('manual'));return;
   }
   if(path==='/api/sources/collection/schedule'&&method==='PUT'){
    if(!jobs){send(res,503,{error:jobsUnavailable});return;}const body=await readJson(req,1000);await jobs.setEnabled(body?.enabled);send(res,200,collectionStatus());return;
   }   if(!store){send(res,503,{error:unavailable});return;}
   if(path==='/api/sources/catalog'&&method==='GET'){send(res,200,{records:await store.list()});return;}
   if(path==='/api/sources/backup'&&method==='GET'){send(res,200,await store.backup());return;}
   if(path==='/api/sources/restore'&&method==='POST'){const body=await readJson(req,18_000_000);send(res,200,await store.restore(body.bundle));return;}
   if(path==='/api/sources/records'&&method==='POST'){const draft=await readJson(req,100_000);send(res,201,{record:await store.create(draft)});return;}
   const privateFile=/^\/api\/sources\/assets\/([\w:-]{1,100})$/.exec(path);
   if(privateFile&&method==='GET'){const row=(await store.list()).find(r=>r.id===privateFile[1]);sendImage(res,await assetBytes(row));return;}
   const match=/^\/api\/sources\/records\/([\w:-]{1,100})(?:\/(review|trash))?$/.exec(path);if(!match){send(res,404,{error:'未找到来源接口。'});return;}
   const [,,action]=match,id=match[1];if(!(method==='PUT'&&!action||method==='DELETE'&&!action||method==='POST'&&['review','trash'].includes(action))){send(res,405,{error:'不支持的来源操作。'});return;}const body=await readJson(req,100_000);
   if(method==='PUT'&&!action){send(res,200,{record:await store.edit(id,body.expected,body.draft)});return;}
   if(method==='POST'&&action==='review'){if(body.action==='approve'&&body.acknowledged===true){const candidate=(await store.list()).find(r=>r.id===id);if(candidate?.kind==='asset')await assetBytes(candidate);}send(res,200,{record:await store.review(id,body.expected,body)});return;}
   if(method==='POST'&&action==='trash'){send(res,200,{record:await store.trash(id,body.expected,body.trashed)});return;}
   if(method==='DELETE'&&!action){send(res,200,await store.erase(id,body.expected));return;}
   send(res,405,{error:'不支持的来源操作。'});
  }catch(e){send(res,e.status||(/另一窗口|已存在|已由其他进程/.test(e.message)?409:/不存在/.test(e.message)?404:e.code?503:400),{error:e.code?'电脑来源库读写失败，本次操作未完成；请检查存储空间后重试。':e.message||'来源操作失败，请重试。'});}
 };
}
