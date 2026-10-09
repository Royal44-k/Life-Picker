import {createHash,randomUUID} from 'node:crypto';import {mkdir,readFile,writeFile,rename,rm,stat} from 'node:fs/promises';import {resolve,join,sep} from 'node:path';import {execFile} from 'node:child_process';
export const PINNED_BROWSER=Object.freeze({version:'148.0.7778.215',bytes:189954738,sha256:'5ae94143fa323167b7085242504e05dc8eeb6d96ca5feb80c887ade36f242b40',url:'https://cdn.one-world.ai/browsers/148.0.7778.215/windows-x64.zip'});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function verifyBrowserArchive(bytes){if(bytes.length!==PINNED_BROWSER.bytes||hash(bytes)!==PINNED_BROWSER.sha256)throw Error('浏览器依赖校验失败，未解压或运行。');return true;}
export const browserFolder=root=>join(resolve(root),'xiaohongshu-mcp','browser',PINNED_BROWSER.version);
export async function browserInstalled(root){try{const folder=browserFolder(root),receipt=JSON.parse(await readFile(join(folder,'shiye-verified.json'),'utf8'));if(receipt.archive!==PINNED_BROWSER.sha256||receipt.files.length!==2)return false;for(const name of ['chrome.exe','chrome.dll']){const item=receipt.files.find(f=>f.name===name);if(!item||!Number.isSafeInteger(item.bytes)||item.bytes>400000000)return false;const path=join(folder,'browser',name);if((await stat(path)).size!==item.bytes||hash(await readFile(path))!==item.sha256)return false;}return true;}catch{return false;}}
const quote=s=>"'"+s.replaceAll("'","''")+"'";
const run=cmd=>new Promise((ok,bad)=>execFile('powershell.exe',['-NoProfile','-NonInteractive','-Command',cmd],{windowsHide:true,timeout:360000,maxBuffer:100000},e=>e?bad(Error('浏览器依赖准备未完成，请检查网络和磁盘后重试。')):ok()));
export async function installBrowser(root,{archive}={}){
 if(process.platform!=='win32')throw Error('浏览器准备仅支持 Windows。');if(await browserInstalled(root))return {existing:true,version:PINNED_BROWSER.version};
 const folder=browserFolder(root),parent=resolve(folder,'..'),temporary=join(parent,'prepare-'+randomUUID()),download=join(temporary,'download.zip'),stage=join(temporary,'expanded');await mkdir(stage,{recursive:true});
 try{let path=archive;if(!path){console.log('准备固定浏览器依赖（约 190 MB）…');await run("$ProgressPreference='SilentlyContinue'; Invoke-WebRequest -Uri "+quote(PINNED_BROWSER.url)+" -OutFile "+quote(download)+" -TimeoutSec 300 -ErrorAction Stop");path=download;}
  verifyBrowserArchive(await readFile(path));
  await run("$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.IO.Compression.FileSystem; $base=[IO.Path]::GetFullPath("+quote(stage)+"); $zip=[IO.Compression.ZipFile]::OpenRead("+quote(resolve(path))+"); try { $total=0L; foreach($entry in $zip.Entries) { $target=[IO.Path]::GetFullPath([IO.Path]::Combine($base,$entry.FullName)); if(-not $target.StartsWith($base+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase) -or $entry.FullName.Contains(':') -or $entry.Length -gt 400000000) {throw 'Invalid archive path'}; $total+=$entry.Length; if($total -gt 1000000000) {throw 'Oversized archive'} }; foreach($entry in $zip.Entries) { $target=[IO.Path]::GetFullPath([IO.Path]::Combine($base,$entry.FullName)); if($entry.Name -eq '') {[IO.Directory]::CreateDirectory($target) | Out-Null} else {[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($target)) | Out-Null; [IO.Compression.ZipFileExtensions]::ExtractToFile($entry,$target,$false)} } } finally {$zip.Dispose()}");
  const files=[];for(const name of ['chrome.exe','chrome.dll']){const bytes=await readFile(join(stage,'browser',name));files.push({name,bytes:bytes.length,sha256:hash(bytes)});}
  await writeFile(join(stage,'shiye-verified.json'),JSON.stringify({archive:PINNED_BROWSER.sha256,files}));
  // Never replace an unknown existing browser directory.
  try{await stat(folder);throw Error('已有浏览器目录未通过校验，请先人工检查；本次未覆盖。');}catch(e){if(e.code!=='ENOENT')throw e;}
  await rename(stage,folder);if(!await browserInstalled(root))throw Error('浏览器解压后校验失败。');return {existing:false,version:PINNED_BROWSER.version};
 }finally{if(!resolve(temporary).startsWith(parent+sep+'prepare-'))throw Error('准备目录不在预期位置。');await rm(temporary,{recursive:true,force:true});}
}
