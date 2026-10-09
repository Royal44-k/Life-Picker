import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {XhsError} from './xhs-transport.mjs';

const HOME='https://www.xiaohongshu.com/explore',hex=/^[a-f0-9]{24}$/i;
const cut=(x,n)=>Array.from(typeof x==='string'?x.trim():'').reduce((s,c)=>s.length+c.length<=n?s+c:s,'');
// Only rendered DOM is read. No network response, cookie or application-state access.
export function visibleXhsPage(){
 const shown=e=>!!e&&!!e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
 const text=e=>shown(e)?e.innerText?.trim()||'':'';
 const links=[...document.querySelectorAll('a')].filter(shown);
 const nav=links.some(a=>text(a)==='我'&&/^\/user\/profile\/[a-f0-9]{24}/i.test(new URL(a.href).pathname));
 const ui=[...document.querySelectorAll('button,[role="dialog"],[class*="captcha"],[class*="verify"],[class*="empty"],[class*="error"],[class*="login"]')].filter(shown).map(text).filter(t=>t.length<1500).join('\n');
 const cards=[...document.querySelectorAll('section.note-item')].filter(shown).slice(0,24).map(s=>{
  const a=s.querySelector('a.title'),author=s.querySelector('a.author'),id=a?new URL(a.href).pathname.match(/\/(?:explore|search_result)\/([a-f0-9]{24})/i)?.[1]:'';
  return {id:id||'',title:text(a),author:text(author).split('\n')[0],userId:author?new URL(author.href).pathname.match(/\/user\/profile\/([a-f0-9]{24})/i)?.[1]||'':'',likes:text(s.querySelector('.like-wrapper .count'))};
 }).filter(c=>c.title);
 return {loggedIn:nav,login:/(扫码登录|手机号登录|登录后推荐|登录小红书)/.test(ui),challenge:/(安全验证|拖动滑块|完成验证|验证码校验|captcha)/i.test(ui),restricted:/(访问频繁|访问受限|操作频繁|账号异常|暂时无法访问)/.test(ui),empty:/(暂无相关|没有找到相关|未找到相关)/.test(ui),cards};
}
function guarded(view){
 if(!view||typeof view.loggedIn!=='boolean'||!Array.isArray(view.cards))throw new XhsError();
 if(view.challenge)throw new XhsError('challenged');if(view.restricted)throw new XhsError('restricted');
 if(!view.loggedIn&&!view.login)throw new XhsError();return view;
}
export function parseVisibleXhs(view){
 guarded(view);if(!view.loggedIn)throw new XhsError('needs_login');
 const seen=new Set(),feeds=[];
 for(const c of view.cards){
  if(!c.title)continue;if(!hex.test(c.id)||typeof c.title!=='string')throw new XhsError();
  if(seen.has(c.id))continue;seen.add(c.id);
  feeds.push({id:c.id,modelType:'note',noteCard:{displayTitle:cut(c.title,120),user:{nickname:cut(c.author,100),...(hex.test(c.userId)?{userId:c.userId}:{})},interactInfo:{likedCount:cut(c.likes,40)}}});
  if(feeds.length===6)break;
 }
 if(!feeds.length&&!view.empty)throw new XhsError();return {feeds};
}
export function createXhsWebSession({profile,launch}){
 const custom=!!launch;
 const open=launch|| (async folder=>{const {chromium}=await import('playwright');return chromium.launchPersistentContext(folder,{channel:'msedge',headless:false,viewport:{width:1180,height:820},timeout:30000});});
 let context=null,launching=null,closing=Promise.resolve(),epoch=0,busy=false;
 async function stop(){
  epoch++;const owned=context;context=null;
  closing=closing.then(async()=>{if(owned)await owned.close().catch(()=>{});if(launching)await launching.catch(()=>{});});await closing;
 }
 async function ensure(signal){
  const generation=epoch;await closing;signal?.throwIfAborted();if(generation!==epoch)throw new DOMException('已停止','AbortError');
  if(context)return context;
  launching=(async()=>{const created=await open(resolve(profile));if(signal?.aborted||generation!==epoch){await created.close().catch(()=>{});throw new DOMException('已停止','AbortError');}context=created;created.on('close',()=>{if(context===created)context=null;});return created;})();
  try{return await launching;}finally{launching=null;}
 }
 async function request(op,input={},signal){
  if(!['status','qrcode','feeds','search'].includes(op))throw Error('不支持此只读操作。');
  if(op==='search'&&(typeof input.keyword!=='string'||!input.keyword.trim()||input.keyword.length>80||input.recent!==undefined&&typeof input.recent!=='boolean'))throw Error('关键词格式无效。');
  if(busy)throw Error('个人来源正在处理，请稍后再试。');signal?.throwIfAborted();busy=true;
  const controller=new AbortController(),abort=()=>{controller.abort();void stop();};
  signal?.addEventListener('abort',abort,{once:true});const timer=setTimeout(abort,100000);
  const check=()=>{signal?.throwIfAborted();controller.signal.throwIfAborted();};
  try{
   const c=await ensure(controller.signal);check();const page=c.pages().find(p=>!p.isClosed())||await c.newPage();
   if(['status','qrcode'].includes(op)||!page.url||new URL(page.url()).pathname!=='/explore')await page.goto(HOME,{waitUntil:'commit',timeout:45000});check();
   await page.waitForFunction(()=>[...document.querySelectorAll('a')].some(a=>a.getClientRects().length&&a.innerText?.trim()==='我')||[...document.querySelectorAll('[class*="login"],[class*="captcha"]')].some(e=>e.getClientRects().length&&/扫码登录|手机号登录|登录小红书|安全验证|拖动滑块/.test(e.innerText||'')),{},{timeout:15000});check();
   const view=guarded(await page.evaluate(visibleXhsPage));check();
   if(op==='qrcode'){await page.bringToFront();return view.loggedIn?{is_logged_in:true}:{is_logged_in:false,browserLogin:true};}
   if(op==='status')return {is_logged_in:view.loggedIn};
   if(!view.loggedIn)throw new XhsError('needs_login');
   if(op==='search'){const result=await readXhsSearch(page,input,controller.signal);check();return result;}
   await page.waitForFunction(()=>!!document.querySelector('section.note-item a.title')||!!document.querySelector('[class*="empty"],[class*="captcha"]'),{},{timeout:18000});check();
   const result=parseVisibleXhs(await page.evaluate(visibleXhsPage));check();return result;
  }catch(e){if(signal?.aborted||controller.signal.aborted)throw new DOMException('个人来源已取消或超时。','AbortError');if(e instanceof XhsError)throw e;if(/user data directory|ProcessSingleton|profile.*(in use|locked)/i.test(String(e?.message)))throw new XhsError('profile_busy');throw new XhsError();}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);busy=false;}
 }
 return {runtime:{kind:'visible-browser',installed:async()=>custom||['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].some(existsSync),stop},transport:{request}};
}

export async function readXhsSearch(page,input,signal){
 const check=()=>signal?.throwIfAborted();check();
 await page.locator('section.note-item a.title').first().waitFor({timeout:18000});check();
 const initial=guarded(await page.evaluate(visibleXhsPage));if(!initial.loggedIn)throw new XhsError('needs_login');
 const box=page.getByRole('textbox');if(await box.count()!==1)throw new XhsError();
 await box.fill(input.keyword.trim());await box.press('Enter');check();
 const filter=page.getByText('筛选',{exact:true});await filter.waitFor({timeout:18000});check();
 if(input.recent){
  await filter.hover();
  for(const [group,label]of [['排序依据','最新'],['笔记类型','图文'],['发布时间','一周内']]){
   check();await filter.hover();
   const row=page.locator('.filter-panel .filters').filter({has:page.getByText(group,{exact:true})});
   const target=row.getByText(label,{exact:true}).and(page.locator(':not([aria-hidden="true"], [aria-hidden="true"] *)'));
   // Observe only our own DOM observer. A selected tag alone is not proof the old results refreshed.
   const watch=await page.evaluateHandle(()=>{
    const state={changed:false,at:0,observer:null};
    const touches=node=>node.nodeType===1&&(node.matches('section.note-item')||node.closest('section.note-item')||node.querySelector('section.note-item'));
    state.observer=new MutationObserver(records=>{if(records.some(r=>touches(r.target)||[...r.addedNodes,...r.removedNodes].some(touches))){state.changed=true;state.at=Date.now();}});
    state.observer.observe(document.body,{childList:true,subtree:true,characterData:true});return state;
   });
   try{
    await target.click({timeout:8000});
    await page.waitForFunction(({group,label})=>[...document.querySelectorAll('.filter-panel .filters')].some(e=>e.querySelector(':scope > span')?.textContent===group&&[...e.querySelectorAll('.tags.active')].some(t=>!t.closest('[aria-hidden="true"]')&&t.textContent.trim()===label)),{group,label},{timeout:8000});check();
    await page.waitForFunction(state=>state.changed&&Date.now()-state.at>500&&!!document.querySelector('section.note-item a.title'),watch,{timeout:18000});check();
   }finally{await watch.evaluate(s=>s.observer.disconnect()).catch(()=>{});await watch.dispose().catch(()=>{});}
  }
  const selected=await page.evaluate(()=>[...document.querySelectorAll('.filter-panel .filters')].flatMap(e=>[...e.querySelectorAll('.tags.active')].filter(t=>!t.closest('[aria-hidden="true"]')).map(t=>t.textContent.trim())));
  if(!['最新','图文','一周内'].every(x=>selected.includes(x)))throw new XhsError();
 }else{
  await page.locator('section.note-item a.title').first().waitFor({timeout:18000});check();
 }
 const result=await page.evaluate(visibleXhsPage);check();
 // Search has a different navigation. Authentication was checked above; an explicit login wall still wins.
 return parseVisibleXhs({...result,loggedIn:!result.login});
}
