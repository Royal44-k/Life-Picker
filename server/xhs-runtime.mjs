import {browserInstalled} from './xhs-browser.mjs';
import {createHash,randomBytes} from 'node:crypto';import {mkdir,readFile,writeFile,rename,rm,stat} from 'node:fs/promises';import {resolve,join} from 'node:path';import {spawn,execFile} from 'node:child_process';import {createServer,connect} from 'node:net';import {XhsError} from './xhs-transport.mjs';
export const PINNED_XHS=Object.freeze({version:'v2.5.5',file:'xiaohongshu-mcp-windows-amd64.exe',sha256:'cb55674f90c1649c875be9c4cde3af193b02fc34ffc860c40c8d711e6ca53e27',url:'https://github.com/xpzouying/xiaohongshu-mcp/releases/download/v2.5.5/xiaohongshu-mcp-windows-amd64.exe'});
export function verifyXhsBinary(bytes){if(!Buffer.isBuffer(bytes)||bytes.length>30000000||createHash('sha256').update(bytes).digest('hex')!==PINNED_XHS.sha256)throw new Error('个人来源工具校验失败，请重新安装固定版本。');return true;}
export function xhsLaunchSpec(root,port,token,env=process.env,cacheRoot=join(resolve(root),'cache')){if(!Number.isInteger(port)||port<1024||port>65535||typeof token!=='string'||!token)throw Error('个人来源启动参数无效。');const clean={};for(const key of ['SystemRoot','WINDIR','PATH','PATHEXT','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','PROGRAMFILES','PROGRAMFILES(X86)'])if(env[key])clean[key]=env[key];return {args:['-headless=true','-port','127.0.0.1:'+port],options:{cwd:resolve(root),windowsHide:true,stdio:'ignore',env:{...clean,LOCALAPPDATA:resolve(cacheRoot),AUTH_TOKEN:token,COOKIES_PATH:join(resolve(root),'cookies.json')}}};}
export async function installXhs(root,{fetcher=fetch,signal}={}){
 if(process.platform!=='win32'||process.arch!=='x64')throw Error('当前安装器仅支持 Windows x64。');const folder=resolve(root),file=join(folder,PINNED_XHS.file);await mkdir(folder,{recursive:true});
 try{const existing=await readFile(file);verifyXhsBinary(existing);return {file,existing:true,version:PINNED_XHS.version,sha256:PINNED_XHS.sha256};}catch(e){if(e.code!=='ENOENT')throw e;}
 const response=await fetcher(PINNED_XHS.url,{signal:AbortSignal.any([AbortSignal.timeout(120000),...(signal?[signal]:[])])});if(!response.ok||!response.body)throw Error('无法下载个人来源工具，请稍后重试。');const reader=response.body.getReader(),chunks=[];let length=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>30000000)throw Error('个人来源工具文件大小异常。');chunks.push(value);}}catch(e){await reader.cancel().catch(()=>{});throw e;}finally{reader.releaseLock();}
 const bytes=Buffer.concat(chunks);verifyXhsBinary(bytes);const temp=file+'.download';try{await writeFile(temp,bytes,{flag:'wx'});await rename(temp,file);}catch(e){await rm(temp,{force:true}).catch(()=>{});throw e;}return {file,existing:false,version:PINNED_XHS.version,sha256:PINNED_XHS.sha256};
}
const freePort=()=>new Promise((ok,bad)=>{const server=createServer();server.once('error',bad);server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(()=>ok(port));});});
const socketReady=port=>new Promise(ok=>{const socket=connect({host:'127.0.0.1',port});let done=false;const finish=v=>{if(done)return;done=true;socket.destroy();ok(v);};socket.setTimeout(300,()=>finish(false));socket.once('connect',()=>finish(true));socket.once('error',()=>finish(false));});
export function createXhsRuntime({root,binary=join(resolve(root),PINNED_XHS.file),startupMs=45000,cacheRoot=join(resolve(root),'cache')}){
 const folder=resolve(root);let child=null,starting=null,target=null,generation=0,stopping=Promise.resolve();
 async function installed(){try{if((await stat(binary)).size>30000000)return false;verifyXhsBinary(await readFile(binary));return await browserInstalled(cacheRoot);}catch{return false;}}
 function stop(){generation++;const proc=child;child=null;target=null;if(proc?.pid){stopping=new Promise(done=>{if(process.platform==='win32')execFile('taskkill.exe',['/PID',String(proc.pid),'/T','/F'],{windowsHide:true,timeout:10000},()=>done());else{proc.kill('SIGTERM');done();}});}return stopping;}
 async function endpoint(signal){
  await stopping;signal?.throwIfAborted();if(child&&target)return target;if(starting)return starting;const run=generation;
  starting=(async()=>{let bytes;try{bytes=await readFile(binary);}catch(e){if(e.code==='ENOENT')throw new XhsError('not_installed');throw new XhsError();}verifyXhsBinary(bytes);if(!await browserInstalled(cacheRoot))throw new XhsError('not_installed');if(process.platform!=='win32')throw new XhsError('not_installed');await mkdir(folder,{recursive:true});const port=await freePort(),token=randomBytes(32).toString('hex');signal?.throwIfAborted();if(run!==generation)throw new DOMException('Cancelled','AbortError');
   const spec=xhsLaunchSpec(folder,port,token,process.env,cacheRoot),proc=spawn(binary,spec.args,spec.options);child=proc;let failed=false;proc.once('error',()=>{failed=true;});proc.once('exit',()=>{failed=true;if(child===proc){child=null;target=null;}});const until=Date.now()+startupMs;
   while(Date.now()<until){signal?.throwIfAborted();if(run!==generation)throw new DOMException('Cancelled','AbortError');if(failed)throw new XhsError();if(await socketReady(port)){target={url:'http://127.0.0.1:'+port,token};return target;}await new Promise(r=>setTimeout(r,300));}
   throw new XhsError();
  })().catch(e=>{stop();throw e;}).finally(()=>{starting=null;});return starting;
 }
 return {installed,endpoint,stop};
}
