import {installBrowser} from '../server/xhs-browser.mjs';
import {resolve,join} from 'node:path';import {mkdir,readFile,copyFile,rm} from 'node:fs/promises';import {constants} from 'node:fs';import {randomUUID} from 'node:crypto';import {execFile} from 'node:child_process';import {installXhs,PINNED_XHS,verifyXhsBinary} from '../server/xhs-runtime.mjs';
const folder=resolve('.local/xhs-runtime/bin');
async function nativeDownload(){
 const temporary=join(folder,'native-'+randomUUID()+'.download');await mkdir(folder,{recursive:true});const quote=s=>"'"+s.replaceAll("'","''")+"'";
 try{await new Promise((ok,bad)=>execFile('powershell.exe',['-NoProfile','-NonInteractive','-Command','Invoke-WebRequest -Uri '+quote(PINNED_XHS.url)+' -OutFile '+quote(temporary)+' -TimeoutSec 60 -ErrorAction Stop'],{windowsHide:true,timeout:75000},error=>error?bad(new Error('系统下载仍未完成，请检查网络后重新运行本机准备。')):ok()));verifyXhsBinary(await readFile(temporary));await copyFile(temporary,join(folder,PINNED_XHS.file),constants.COPYFILE_EXCL);return {version:PINNED_XHS.version};}finally{await rm(temporary,{force:true}).catch(()=>{});}
}
try{let result;try{result=await installXhs(folder);}catch(e){if(process.platform!=='win32'||!['TimeoutError','TypeError'].includes(e.name)&&!e.message.includes('无法下载'))throw e;console.log('正在使用系统下载客户端核对同一固定版本…');result=await nativeDownload();}
 console.log('个人来源工具已就绪：'+result.version+'，SHA-256 校验通过。');await installBrowser(resolve('.local/xhs-browser-cache'));console.log('浏览器依赖已校验。请重启拾页，在“我的 → 来源与审核 → 个人小红书参考”正常扫码。');
}catch(e){console.error(e.message);process.exitCode=1;}
