import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { networkInterfaces } from 'node:os';
import { randomInt } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createAiHandler } from './ai.mjs';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
if(existsSync(resolve(root,'.env')))process.loadEnvFile(resolve(root,'.env'));
const port=Number(process.env.PORT||5173);const production=process.argv.includes('--prod');
const pairCode=String(randomInt(10000000,100000000));
const config={deepseekKey:process.env.DEEPSEEK_API_KEY||'',deepseekModel:process.env.DEEPSEEK_MODEL||'deepseek-flash',ollamaModel:process.env.OLLAMA_MODEL||''};
const api=createAiHandler(config,pairCode);
const localIps=Object.values(networkInterfaces()).flat().filter(x=>x?.family==='IPv4'&&!x.internal).map(x=>x.address);
const hosts=new Set(['localhost','127.0.0.1',...localIps]);
const vite=production?null:await(await import('vite')).createServer({root,server:{middlewareMode:true,host:'0.0.0.0',hmr:false,watch:{ignored:['**/artifacts/**','**/docs/**','**/tests/**','**/.env*']}},appType:'spa'});
const dist=resolve(root,'dist');
if(production&&!existsSync(resolve(dist,'index.html'))){console.error('请先运行 npm run build 生成应用。');process.exit(1);}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
  const hostname=(req.headers.host||'').split(':')[0];
  if(!hosts.has(hostname)){res.writeHead(403);res.end('Host not allowed');return;}
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');
  if(req.url?.startsWith('/api/')){await api(req,res);return;}
  if(vite){vite.middlewares(req,res);return;}
  try{
    const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    let file=resolve(dist,`.${path==='/'?'/index.html':path}`);
    if(!file.startsWith(dist+sep)){res.writeHead(403);res.end();return;}
    if(!existsSync(file)){res.writeHead(404);res.end('Not found');return;}
    res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');
    res.setHeader('Cache-Control',file.includes(`${sep}assets${sep}`)?'public, max-age=31536000, immutable':'no-cache');res.end(readFileSync(file));
  }catch{res.writeHead(400);res.end('Bad request');}
});
server.listen(port,'0.0.0.0',()=>{
  console.log(`\n拾页已启动 · 保持此窗口运行\n电脑地址：http://localhost:${port}\n`);
  for(const ip of localIps)console.log(`iPhone 同一 Wi-Fi 打开：http://${ip}:${port}`);
  console.log(`\nAI 连接码：${pairCode}\nDeepSeek：${config.deepseekKey?'已配置':'尚未配置'}；Ollama：${config.ollamaModel||'尚未配置'}\n停止运行：Ctrl+C\n`);
});
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`端口 ${port} 正在使用。若拾页已开着，请直接访问；否则关闭旧窗口后重试。`:e.message);process.exit(1);});
