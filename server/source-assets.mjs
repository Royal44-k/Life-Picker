import {createHash,randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile,rename,rm,stat} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {inflateSync} from 'node:zlib';
import {PUBLIC_ASSETS} from './source-manifest.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex'),MAX_BYTES=8_000_000;
const hosts=new Set(['www.opendoodles.com','opendoodles.s3-us-west-1.amazonaws.com','www.openpeeps.com','cdn.prod.website-files.com','creativecommons.org']);
function knownUrl(value){let url;try{url=new URL(value);}catch{throw new Error('素材来源链接无效。');}if(url.protocol!=='https:'||url.port||url.username||url.password||!hosts.has(url.hostname))throw new Error('素材只允许清单中的官方 HTTPS 来源。');return url.toString();}
const signature=Buffer.from([137,80,78,71,13,10,26,10]);
function crc32(data){let n=0xffffffff;for(const b of data){n^=b;for(let k=0;k<8;k++)n=(n>>>1)^((n&1)?0xedb88320:0);}return (n^0xffffffff)>>>0;}
export function inspectPublicPng(bytes){
 if(!Buffer.isBuffer(bytes)||bytes.length<45||bytes.length>MAX_BYTES||!bytes.subarray(0,8).equals(signature))throw new Error('素材必须是完整且不超过 8 MB 的 PNG。');
 let offset=8,width=0,height=0,color=0,ended=false;const idat=[];
 while(offset<bytes.length){
  if(offset+12>bytes.length)throw new Error('PNG 数据不完整。');const size=bytes.readUInt32BE(offset),end=offset+12+size;
  if(end>bytes.length)throw new Error('PNG 数据不完整。');const type=bytes.toString('ascii',offset+4,offset+8),body=bytes.subarray(offset+8,end-4);
  if(crc32(bytes.subarray(offset+4,end-4))!==bytes.readUInt32BE(end-4))throw new Error('PNG 文件校验失败。');
  if(offset===8&&type!=='IHDR')throw new Error('PNG 缺少尺寸信息。');
  if(type==='IHDR'){
   if(offset!==8||size!==13)throw new Error('PNG 头部无效。');width=body.readUInt32BE(0);height=body.readUInt32BE(4);color=body[9];
   if(width<1||height<1||width>4096||height>4096||width*height>12_000_000)throw new Error('素材尺寸或像素数量超过限制。');
   if(body[8]!==8||![2,6].includes(color)||body[10]!==0||body[11]!==0||body[12]!==0)throw new Error('PNG 格式需要重新核验。');
  }else if(type==='IDAT')idat.push(body);
  else if(type==='IEND'){if(size!==0||end!==bytes.length)throw new Error('PNG 结束标记无效。');ended=true;break;}
  else if(type[0]===type[0].toUpperCase()||['acTL','fcTL','fdAT'].includes(type))throw new Error('PNG 包含未支持的数据块。');
  offset=end;
 }
 if(!ended||!idat.length)throw new Error('PNG 数据不完整。');
 const stride=width*(color===2?3:4)+1,expected=stride*height;let raw;
 try{raw=inflateSync(Buffer.concat(idat),{maxOutputLength:expected});}catch{throw new Error('PNG 无法完整解码。');}
 if(raw.length!==expected)throw new Error('PNG 图像长度不正确。');for(let y=0;y<height;y++)if(raw[y*stride]>4)throw new Error('PNG 滤镜无效。');
 return {width,height};
}
async function fetchBytes(url,{fetchImpl,signal,limit,type,timeoutMs}){
 knownUrl(url);const controller=new AbortController(),abort=()=>controller.abort();if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});let timedOut=false;
 const timer=setTimeout(()=>{timedOut=true;controller.abort();},timeoutMs);
 try{
  const request=()=>fetchImpl(url,{redirect:'error',signal:controller.signal,headers:{Accept:type,'User-Agent':'Shiye-Personal-Source-Check/1.10'}});
  let response;try{response=await request();}catch(e){controller.signal.throwIfAborted();if(!['UND_ERR_CONNECT_TIMEOUT','ECONNRESET','ETIMEDOUT','EAI_AGAIN'].includes(e?.cause?.code))throw e;response=await request();}
  if(response.redirected)throw new Error('来源发生重定向，需要重新核对。');
  if(!response.ok)throw new Error('来源暂时无法访问（HTTP '+response.status+'）。');
  if(!(response.headers.get('content-type')||'').toLowerCase().startsWith(type))throw new Error('来源文件类型变化，需要重新核验。');
  if(Number(response.headers.get('content-length'))>limit){await response.body?.cancel();throw new Error('来源文件过大，超过下载限制。');}
  if(!response.body)throw new Error('来源响应没有文件内容。');const reader=response.body.getReader(),chunks=[];let length=0;
  try{while(true){controller.signal.throwIfAborted();const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>limit)throw new Error('来源文件过大，超过下载限制。');chunks.push(value);}}
  catch(error){await reader.cancel().catch(()=>{});throw error;}finally{reader.releaseLock();}
  return Buffer.concat(chunks);
 }catch(error){if(timedOut)throw new Error('核验公开来源超时，请稍后手动重试。');if(signal?.aborted)throw new DOMException('素材核验已取消。','AbortError');if(error instanceof TypeError)throw new Error('无法连接公开来源，或来源发生重定向；未生成可用素材。');throw error;}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
async function atomic(file,content){const temp=file+'.'+randomUUID()+'.tmp';try{await writeFile(temp,content,{flag:'wx',mode:0o600});await rename(temp,file);}catch(error){await rm(temp,{force:true}).catch(()=>{});throw error;}}
async function limitedRead(file,limit){const info=await stat(file);if(info.size>limit)throw new Error('缓存文件超过限制。');return readFile(file);}
function validateManifest(entries){
 if(!Array.isArray(entries)||entries.length>24)throw new Error('公开素材清单数量无效。');const ids=new Set();
 return entries.map(item=>{
  if(!item||!/^[a-z0-9-]{1,80}$/.test(item.id)||ids.has(item.id)||!/^[a-z0-9-]{1,50}$/.test(item.sourceId)||item.license!=='CC0-1.0'||![item.sha256,item.licenseSha256].every(v=>/^[a-f0-9]{64}$/.test(v))||!Number.isSafeInteger(item.bytes)||item.bytes<45||item.bytes>MAX_BYTES)throw new Error('公开素材清单格式无效。');
  ids.add(item.id);for(const key of ['url','pageUrl','licensePageUrl','legalUrl'])knownUrl(item[key]);return structuredClone(item);
 });
}
export async function createPublicAssetCache({root,manifest=PUBLIC_ASSETS,fetchImpl=fetch,now=Date.now,timeoutMs=20_000}){
 const entries=validateManifest(manifest),folder=resolve(root),files=join(folder,'files'),proofs=join(folder,'proofs');
 await Promise.all([mkdir(files,{recursive:true}),mkdir(proofs,{recursive:true})]);
 const entryFor=id=>{const item=entries.find(e=>e.id===id);if(!item)throw new Error('未知素材，不在已核对的清单中。');return item;};
 const checkFile=(entry,bytes)=>{if(bytes.length!==entry.bytes||hash(bytes)!==entry.sha256)throw new Error('素材文件变化或校验不一致，需要重新核验。');const size=inspectPublicPng(bytes);if(size.width!==entry.width||size.height!==entry.height)throw new Error('素材尺寸变化，需要重新核验。');return bytes;};
 async function read(sha256){if(!/^[a-f0-9]{64}$/.test(sha256))throw new Error('素材校验值无效。');const entry=entries.find(e=>e.sha256===sha256);if(!entry)throw new Error('素材不在已核对的清单中。');return checkFile(entry,await limitedRead(join(files,sha256+'.png'),MAX_BYTES));}
 async function acquire(id,{signal,memo=new Map()}={}){
  signal?.throwIfAborted();const entry=entryFor(id),load=(url,type,limit)=>{const key=type+':'+url;if(!memo.has(key))memo.set(key,fetchBytes(url,{fetchImpl,signal,limit,type,timeoutMs}));return memo.get(key);};
  const [listing,publisher,legal]=await Promise.all([load(entry.pageUrl,'text/html',500_000),load(entry.licensePageUrl,'text/html',500_000),load(entry.legalUrl,'text/plain',20_000)]);
  if(!listing.toString('utf8').includes(entry.url))throw new Error('官网页面没有找到该文件链接，需要重新核对对应关系。');
  const publisherHtml=publisher.toString('utf8');
  if(!/href\s*=\s*["']https?:\/\/creativecommons\.org\/publicdomain\/zero\/1\.0\/?["']/i.test(publisherHtml))throw new Error('官网许可说明变化，请人工核对 CC0 适用范围。');
  if(hash(legal)!==entry.licenseSha256)throw new Error('许可文本校验变化，需要重新审核。');
  const checkedAt=now();let cached=false,bytes;
  try{bytes=await read(entry.sha256);cached=true;}catch{bytes=checkFile(entry,await load(entry.url,'image/png',Math.min(MAX_BYTES,entry.bytes+1024)));signal?.throwIfAborted();await atomic(join(files,entry.sha256+'.png'),bytes);}
  const proofFile=join(proofs,entry.sha256+'.json');let validProof=false;
  try{const proof=JSON.parse((await limitedRead(proofFile,1_500_000)).toString('utf8'));validProof=proof.originalUrl===entry.url&&proof.licensePageUrl===entry.licensePageUrl&&hash(proof.legalText)===entry.licenseSha256&&hash(proof.publisherHtml)===proof.publisherSha256&&hash(proof.listingHtml)===proof.listingSha256;}catch{}
  if(!validProof){signal?.throwIfAborted();await atomic(proofFile,JSON.stringify({version:1,originalUrl:entry.url,licensePageUrl:entry.licensePageUrl,listingUrl:entry.pageUrl,checkedAt,publisherHtml,publisherSha256:hash(publisher),listingHtml:listing.toString('utf8'),listingSha256:hash(listing),legalUrl:entry.legalUrl,legalText:legal.toString('utf8'),legalSha256:hash(legal),assetSha256:entry.sha256}));}
  return {id:entry.id,cached,checkedAt,draft:{kind:'asset',sourceId:entry.sourceId,originalUrl:entry.url,title:entry.title,author:{name:entry.author,url:entry.pageUrl},publishedAt:null,summary:entry.summary,analysis:'',tags:entry.tags,metrics:[],rights:{usage:'reusable',license:entry.license,licenseUrl:entry.licensePageUrl,attribution:entry.author+' · '+entry.sourceId+' · CC0 1.0',changes:'保留官方原始 PNG；在作品中可调整摆放与裁切。',evidence:'已核对官网文件链接与 CC0 声明。许可原文：'+entry.legalUrl+'；许可文本 SHA256：'+entry.licenseSha256+'；原图 SHA256：'+entry.sha256+'。原许可页面与原文快照保存在电脑素材缓存。',checkedAt:null},asset:{url:entry.url,type:'image/png',sha256:entry.sha256,bytes:bytes.length}}};
 }
 return {manifest:structuredClone(entries),acquire,read};
}
