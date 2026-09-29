import {inflateSync} from 'node:zlib';
import {makeGentleAudio} from './video-audio.mjs';
const signature=Buffer.from([137,80,78,71,13,10,26,10]);
function crc32(data){let n=0xffffffff;for(const b of data){n^=b;for(let k=0;k<8;k++)n=(n>>>1)^((n&1)?0xedb88320:0);}return (n^0xffffffff)>>>0;}
function inspectPng(bytes){
 if(bytes.length<45||!bytes.subarray(0,8).equals(signature))throw new Error('短片画面必须是完整 PNG。');
 let offset=8,width=0,height=0,color=0,ended=false,idat=[];
 while(offset<bytes.length){if(offset+12>bytes.length)throw new Error('PNG 数据不完整。');const size=bytes.readUInt32BE(offset),end=offset+12+size;if(end>bytes.length)throw new Error('PNG 数据不完整。');const type=bytes.toString('ascii',offset+4,offset+8),body=bytes.subarray(offset+8,end-4);
  if(crc32(bytes.subarray(offset+4,end-4))!==bytes.readUInt32BE(end-4))throw new Error('PNG 校验失败，请重新生成画面。');
  if(offset===8&&type!=='IHDR')throw new Error('PNG 缺少尺寸信息。');
  if(type==='IHDR'){if(offset!==8||size!==13)throw new Error('PNG 头部无效。');width=body.readUInt32BE(0);height=body.readUInt32BE(4);color=body[9];if(width!==1080||![1080,1440,1920].includes(height))throw new Error('画面尺寸必须为 1080 像素宽的拾页卡片。');if(body[8]!==8||![2,6].includes(color)||body[10]!==0||body[11]!==0||body[12]!==0)throw new Error('PNG 格式不受支持，请重新生成画面。');}
  else if(type==='IDAT')idat.push(body);
  else if(type==='IEND'){if(size!==0||end!==bytes.length)throw new Error('PNG 结束标记无效。');ended=true;break;}
  else if(type[0]===type[0].toUpperCase())throw new Error('PNG 包含不受支持的数据块。');
  offset=end;
 }
 if(!ended||!idat.length)throw new Error('PNG 数据不完整。');
 const stride=width*(color===2?3:4)+1,expected=stride*height;let raw;
 try{raw=inflateSync(Buffer.concat(idat),{maxOutputLength:expected});}catch{throw new Error('PNG 图像无法解码，请重新生成画面。');}
 if(raw.length!==expected)throw new Error('PNG 图像长度不正确。');for(let y=0;y<height;y++)if(raw[y*stride]>4)throw new Error('PNG 图像滤镜无效。');
 return {width,height};
}
export function validateVideoInput(input){
 if(!input||![15,20,30].includes(input.duration))throw new Error('短片时长可选择 15、20 或 30 秒。');
 if(!Array.isArray(input.frames)||input.frames.length<1||input.frames.length>12)throw new Error('短片需要 1～12 页；较长的相册请先另存精简册。');
 if(input.duration/input.frames.length<2)throw new Error('当前页数需要更长时长，每页至少停留 2 秒。');
 const music=input.music??'none';if(!['none','gentle'].includes(music))throw new Error('请选择无音乐或拾页轻音。');
 let total=0;const frames=input.frames.map(frame=>{
  if(!frame||typeof frame.data!=='string'||frame.data.length>8_000_030||!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(frame.data))throw new Error('请使用本册生成的 PNG 画面。');
  const base64=frame.data.slice(22),bytes=Buffer.from(base64,'base64');if(bytes.toString('base64')!==base64)throw new Error('PNG 编码无效。');total+=bytes.length;if(total>48_000_000)throw new Error('画面合计超过 48 MB，请减少本册照片或页数。');
  const {width,height}=inspectPng(bytes);let photo;
  if(frame.photo!==undefined){const p=frame.photo;if(!p||['x','y','w','h'].some(k=>!Number.isFinite(p[k]))||p.x<0||p.y<0||p.w<16||p.h<16||p.x+p.w>width||p.y+p.h>height)throw new Error('照片动画范围无效。');photo={x:Math.round(p.x),y:Math.round(p.y),w:Math.floor(p.w),h:Math.floor(p.h)};}
  return {bytes,width,height,...(photo?{photo}:{})};
 });
 if(frames.some(f=>f.width!==frames[0].width||f.height!==frames[0].height))throw new Error('同一短片的画面尺寸需要一致。');
 return {duration:input.duration,frames,music};
}

import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {mkdir,writeFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const projectRoot=fileURLToPath(new URL('..',import.meta.url));
export function videoTools(){
 const portable=resolve(projectRoot,'.local/ffmpeg/ffmpeg-9.0.2-essentials_build/bin');
 return {ffmpeg:process.env.FFMPEG_PATH||(existsSync(resolve(portable,'ffmpeg.exe'))?resolve(portable,'ffmpeg.exe'):'ffmpeg'),ffprobe:process.env.FFPROBE_PATH||(existsSync(resolve(portable,'ffprobe.exe'))?resolve(portable,'ffprobe.exe'):'ffprobe')};
}
const abortError=()=>new DOMException('短片任务已取消。','AbortError');
function run(binary,args,{signal,cwd,onData,timeout=120000}={}){
 if(signal?.aborted)return Promise.reject(abortError());
 return new Promise((ok,fail)=>{
  const child=spawn(binary,args,{cwd,windowsHide:true,stdio:['ignore','pipe','pipe']});let output='',error='',timedOut=false;
  const cancel=()=>child.kill();signal?.addEventListener('abort',cancel,{once:true});const timer=setTimeout(()=>{timedOut=true;child.kill();},timeout);
  child.stdout.on('data',chunk=>{const text=chunk.toString();output=(output+text).slice(-100000);onData?.(text);});child.stderr.on('data',chunk=>{error=(error+chunk.toString()).slice(-2500);});
  const clear=()=>{clearTimeout(timer);signal?.removeEventListener('abort',cancel);};
  child.on('error',e=>{clear();fail(new Error(e.code==='ENOENT'?'短片引擎尚未安装，请配置 FFmpeg 与 ffprobe。':'短片引擎无法启动：'+e.message));});
  child.on('close',code=>{clear();if(signal?.aborted)fail(abortError());else if(timedOut)fail(new Error('短片生成超过两分钟，请减少页数后重试。'));else if(code!==0)fail(new Error('短片编码失败：'+error.slice(-1000)));else ok(output);});
 });
}
export async function checkVideoTools(){const tools=videoTools();try{await run(tools.ffmpeg,['-version'],{timeout:5000});await run(tools.ffprobe,['-version'],{timeout:5000});return {ready:true};}catch(e){return {ready:false,error:e.message};}}
export async function renderMemoryVideo(source,directory,{signal,onProgress=()=>{}}={}){
 if(signal?.aborted)throw abortError();const dir=resolve(directory);await mkdir(dir,{recursive:true});const tools=videoTools(),n=source.frames.length,transition=n>1?.3:0,clip=(source.duration+(n-1)*transition)/n;
 const args=['-hide_banner','-loglevel','error','-nostdin','-y','-filter_complex_threads','1'],filters=[];let progress='';
 for(let i=0;i<n;i++){
  if(signal?.aborted)throw abortError();const f=source.frames[i],name='frame-'+String(i).padStart(2,'0')+'.png';await writeFile(resolve(dir,name),f.bytes);args.push('-loop','1','-framerate','24','-protocol_whitelist','file,pipe','-i',name);
  const scale=720/f.width,scaledHeight=Math.round(f.height*scale/2)*2,top=(1280-scaledHeight)/2;
  const base=`[${i}:v]scale=720:${scaledHeight},pad=720:1280:0:${top}:color=0xf3f6ee,fps=24,trim=duration=${clip.toFixed(6)},setpts=PTS-STARTPTS,setsar=1,settb=AVTB,format=yuv420p`;
  if(f.photo){const p=f.photo,x=Math.floor(p.x*scale/2)*2,y=Math.floor((p.y*scale+top)/2)*2,w=Math.floor(p.w*scale/2)*2,h=Math.floor(p.h*scale/2)*2;
   filters.push(base+` ,split[base${i}][region${i}]`);
   filters.push(`[region${i}]crop=${w}:${h}:${x}:${y},zoompan=z='1+0.025*on/${Math.ceil(clip*24)}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=${w}x${h}:fps=24,settb=AVTB[photo${i}]`);
   filters.push(`[base${i}][photo${i}]overlay=${x}:${y}:shortest=1,settb=AVTB[v${i}]`);
  }else filters.push(base+`[v${i}]`);
 }
 let last='v0';for(let i=1;i<n;i++){const out='mix'+i;filters.push(`[${last}][v${i}]xfade=transition=fade:duration=${transition}:offset=${(i*(clip-transition)).toFixed(6)}[${out}]`);last=out;}
 if(source.music==='gentle'){await writeFile(resolve(dir,'music.wav'),makeGentleAudio(source.duration));args.push('-i','music.wav');}
 const output=resolve(dir,'memory.mp4');args.push('-filter_complex',filters.join(';'),'-map',`[${last}]`,...(source.music==='gentle'?['-map',String(n)+':a','-c:a','aac','-b:a','96k']:['-an']),'-t',String(source.duration),'-r','24','-c:v','libx264','-preset','veryfast','-crf','21','-pix_fmt','yuv420p','-threads','2','-movflags','+faststart','-map_metadata','-1','-fs','40000000','-progress','pipe:1',output);
 await run(tools.ffmpeg,args,{cwd:dir,signal,onData:text=>{progress+=text;const lines=progress.split('\n');progress=lines.pop()||'';for(const line of lines){const m=/^out_time_us=(\d+)/.exec(line);if(m)onProgress(Math.min(99,Math.round(Number(m[1])/source.duration/10000)));}}});
 const metadata=JSON.parse(await run(tools.ffprobe,['-v','error','-show_entries','stream=codec_type,codec_name,width,height:format=duration','-of','json',output],{signal,timeout:10000}));
 const video=metadata.streams?.find(s=>s.codec_type==='video'),duration=Number(metadata.format?.duration);const size=(await stat(output)).size;
 const audio=metadata.streams?.filter(s=>s.codec_type==='audio')||[];if(source.music==='gentle'?(audio.length!==1||audio[0].codec_name!=='aac'):audio.length!==0)throw new Error('配乐没有按所选方式生成，请重试。');
 if(!video||video.width!==720||video.height!==1280||!Number.isFinite(duration)||Math.abs(duration-source.duration)>.12||size<1000||size>=40000000)throw new Error('短片未完整生成，请减少页数后重试。');
 onProgress(100);return {path:output,width:video.width,height:video.height,duration,bytes:size,music:source.music||'none'};
}
