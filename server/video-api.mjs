import {timingSafeEqual} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {checkVideoTools} from './video-render.mjs';
export function createVideoHandler(service,pairCode,{readiness=checkVideoTools}={}){
 let uploads=0,badCodes=[],cached=null,cachedAt=0;
 const send=(res,code,value)=>{if(res.destroyed)return;res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
 const ready=async()=>{if(!cached||Date.now()-cachedAt>5000){cachedAt=Date.now();cached=Promise.resolve().then(readiness);}return cached;};
 return async(req,res)=>{
  const path=req.url?.split('?')[0];
  if(path==='/api/video/status'&&req.method==='GET'){try{send(res,200,{...await ready(),maxPages:12,durations:[15,20,30],retentionMinutes:10});}catch{send(res,503,{ready:false,error:'暂时无法检查短片引擎。'});}return;}
  if(req.headers.origin&&![`http://${req.headers.host}`,`https://${req.headers.host}`].includes(req.headers.origin)){send(res,403,{error:'请从拾页页面发起请求。'});return;}
  badCodes=badCodes.filter(t=>Date.now()-t<60000);if(badCodes.length>=10){send(res,429,{error:'连接码尝试过于频繁，请一分钟后再试。'});return;}
  const code=String(req.headers['x-shiye-code']||''),owner=String(req.headers['x-shiye-video-owner']||'');
  if(!/^\d{8}$/.test(code)||code.length!==pairCode.length||!timingSafeEqual(Buffer.from(code),Buffer.from(pairCode))){badCodes.push(Date.now());send(res,401,{error:'连接码不正确，请查看电脑启动窗口中的 8 位连接码。'});return;}
  if(!/^[a-f0-9]{32}$/.test(owner)){send(res,400,{error:'短片会话无效，请刷新页面。'});return;}
  if(path==='/api/video/jobs'&&req.method==='POST'){
   if(uploads){send(res,429,{error:'正在接收另一份短片画面，请稍后重试。'});return;}uploads++;
   try{const engine=await ready();if(!engine.ready){send(res,503,engine);return;}const chunks=[];let bytes=0;
    for await(const chunk of req){bytes+=chunk.length;if(bytes>65_000_000){send(res,413,{error:'画面过大，请减少页数或照片后重试。'});return;}chunks.push(chunk);}
    let input;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{send(res,400,{error:'短片请求格式不正确。'});return;}
    const job=await service.submit(owner,input.requestId,input);send(res,202,job);
   }catch(e){send(res,/队列已满|本小时/.test(e.message)?429:400,{error:e.message||'短片提交失败，请重试。'});}finally{uploads--;}
   return;
  }
  const match=/^\/api\/video\/jobs\/([a-f0-9-]{36})(\/file)?$/.exec(path||'');
  if(!match){send(res,404,{error:'未找到短片接口。'});return;}
  try{
   service.get(owner,match[1]);
   if(req.method==='GET'&&match[2]){const file=await service.file(owner,match[1]);res.writeHead(200,{'Content-Type':'video/mp4','Content-Length':file.bytes,'Cache-Control':'no-store','Content-Disposition':'attachment; filename="shiye-memory.mp4"'});const stream=createReadStream(file.path);stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);return;}
   if(req.method==='GET'&&!match[2]){send(res,200,service.get(owner,match[1]));return;}
   if(req.method==='DELETE'&&!match[2]){send(res,200,await service.cancel(owner,match[1]));return;}
   send(res,405,{error:'不支持的短片操作。'});
  }catch(e){send(res,/找不到/.test(e.message)?404:409,{error:e.message});}
 };
}
