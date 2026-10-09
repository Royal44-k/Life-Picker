import {parseSourceDraft} from './source-model.mjs';
const messages={host_blocked:'Windows 拦截了个人来源的进程辅助程序（错误 225），本次已停止。可继续手动添加参考链接，不要关闭系统防护。',not_installed:'个人来源工具尚未安装，请在电脑完成准备。',needs_login:'需要本人正常扫码登录，当前没有采集笔记。',challenged:'页面要求安全验证，已停止。请在小红书正常处理后手动检查。',restricted:'页面提示访问限制，已停止自动采集。请稍后人工处理。',needs_attention:'个人来源响应异常，已停止。可以查看原网站，稍后手动检查。',stopped:'个人来源已停止，已有候选保留。'};
export class XhsError extends Error{constructor(state='needs_attention'){super(messages[state]||messages.needs_attention);this.name='XhsError';this.state=state;}}
const clip=(v,n)=>Array.from(typeof v==='string'?v.trim():'').reduce((s,c)=>s.length+c.length<=n?s+c:s,'');
export function mapXhsFeeds(data,now=Date.now()){
 if(!data||!Array.isArray(data.feeds)||data.feeds.length>200)throw new Error('个人来源列表格式无法解析。');
 const results=[],seen=new Set();for(const row of data.feeds){
  if(row?.modelType&&row.modelType!=='note')continue;
  if(!row||!/^([a-f0-9]{24})$/i.test(row.id)||!row.noteCard||typeof row.noteCard.displayTitle!=='string')throw new Error('个人来源卡片格式无法解析。');
  const title=clip(row.noteCard.displayTitle,120);if(!title)continue;if(seen.has(row.id))continue;seen.add(row.id);
  const c=row.noteCard,metrics=[];for(const [key,name]of [['likedCount','likes'],['collectedCount','favorites'],['commentCount','comments']]){
   const raw=typeof c.interactInfo?.[key]==='string'?c.interactInfo[key].trim():'';if(!raw)continue;if(raw.length>40)throw new Error('互动数据格式无法解析。');
   let value=null,precision='unknown';if(/^\d{1,15}$/.test(raw)){value=Number(raw);precision='exact';}else{const m=/^(\d+(?:\.\d+)?)\s*(万|w|W|千|k|K)$/.exec(raw);if(m){value=Math.round(Number(m[1])*(['万','w','W'].includes(m[2])?10000:1000));precision='approximate';}}
   if(value!==null&&!Number.isSafeInteger(value)){value=null;precision='unknown';}metrics.push({name,raw,value,precision,observedAt:now});
  }
  const uid=c.user?.userId;results.push(parseSourceDraft({kind:'reference',sourceId:'personal-xhs',originalUrl:'https://www.xiaohongshu.com/explore/'+row.id,title,author:{name:clip(c.user?.nickname,100),url:typeof uid==='string'&&/^[a-f0-9]{24}$/i.test(uid)?'https://www.xiaohongshu.com/user/profile/'+uid:null},publishedAt:null,summary:'',analysis:'',tags:['小红书','参考'],metrics,rights:{usage:'reference-only',license:'unknown',checkedAt:null},asset:null}));
  if(results.length===6)break;
 }return results;
}
export function createXhsTransport({endpoint,fetcher=fetch,timeoutMs=45000}){
 async function request(op,input={},signal){
  const spec={status:['GET','/api/v1/login/status'],qrcode:['GET','/api/v1/login/qrcode'],feeds:['GET','/api/v1/feeds/list'],search:['POST','/api/v1/feeds/search']}[op];
  if(!spec)throw new Error('不支持此只读操作。');let body;
  if(op==='search'){if(typeof input.keyword!=='string'||!input.keyword.trim()||input.keyword.length>80||input.recent!==undefined&&typeof input.recent!=='boolean')throw new Error('关键词格式无效，最多 80 字符。');body={keyword:input.keyword.trim(),...(input.recent?{filters:{sort_by:'最新',note_type:'图文',publish_time:'一周内'}}:{})};}
  const target=await endpoint(signal),url=new URL(target.url);if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||url.username||url.password||url.pathname!=='/'||url.search||url.hash||!target.token)throw new Error('个人来源只连接本机私有服务。');
  const abort=AbortSignal.any([AbortSignal.timeout(timeoutMs),...(signal?[signal]:[])]);
  try{const response=await fetcher(url.origin+spec[1],{method:spec[0],headers:{Authorization:'Bearer '+target.token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:abort});
   if(response.redirected)throw new XhsError();if(Number(response.headers.get('content-length'))>2000000)throw new XhsError();
   if(!response.body)throw new XhsError();const reader=response.body.getReader(),chunks=[];let size=0;try{while(true){abort.throwIfAborted();const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2000000)throw new XhsError();chunks.push(value);}}catch(e){await reader.cancel().catch(()=>{});throw e;}finally{reader.releaseLock();}
   let value;try{value=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new XhsError();}
   if(!response.ok||value.success!==true){if(value.details?.Op==='fork/exec'&&value.details?.Err===225)throw new XhsError('host_blocked');const raw=String(value.error||'')+' '+String(value.details||'');throw new XhsError(/验证码|安全验证|captcha|challenge/i.test(raw)?'challenged':/频繁|访问限制|被限制|restricted|rate.limit|blocked/i.test(raw)||response.status===429?'restricted':'needs_attention');}
   if(!value.data||typeof value.data!=='object')throw new XhsError();return value.data;
  }catch(e){if(signal?.aborted)throw new DOMException('个人来源已取消。','AbortError');if(e instanceof XhsError)throw e;throw new XhsError();}
 }
 return {request};
}
