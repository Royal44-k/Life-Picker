import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,readFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join,resolve,sep} from 'node:path';import {createHash} from 'node:crypto';import {deflateSync} from 'node:zlib';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function crc(bytes){let n=0xffffffff;for(const b of bytes){n^=b;for(let i=0;i<8;i++)n=(n>>>1)^((n&1)?0xedb88320:0);}return (n^0xffffffff)>>>0;}
function chunk(type,body){const data=Buffer.concat([Buffer.from(type),body]),out=Buffer.alloc(body.length+12);out.writeUInt32BE(body.length);data.copy(out,4);out.writeUInt32BE(crc(data),out.length-4);return out;}
function png(){const header=Buffer.alloc(13);header.writeUInt32BE(1);header.writeUInt32BE(1,4);header[8]=8;header[9]=6;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(Buffer.from([0,240,240,220,255]))),chunk('IEND',Buffer.alloc(0))]);}
const bytes=png(),legal='CC0 1.0 legal text fixture',url='https://opendoodles.s3-us-west-1.amazonaws.com/test.png',page='https://www.opendoodles.com/',licensePage='https://www.opendoodles.com/about',legalUrl='https://creativecommons.org/publicdomain/zero/1.0/legalcode.txt';
const manifest=[{id:'doodles-test',sourceId:'open-doodles',title:'测试插画',url,pageUrl:page,licensePageUrl:licensePage,legalUrl,license:'CC0-1.0',licenseSha256:hash(legal),sha256:hash(bytes),bytes:bytes.length,width:1,height:1,author:'Pablo Stanley',tags:['手绘'],summary:'配合自己的内容使用'}];
function goodFetch(calls){return async(url,init)=>{calls.push(url);assert.equal(init.redirect,'error');if(url===legalUrl)return new Response(legal,{headers:{'Content-Type':'text/plain'}});if(url===page)return new Response('<a href="'+manifest[0].url+'">PNG</a>',{headers:{'Content-Type':'text/html'}});if(url===licensePage)return new Response('<a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0 license</a>',{headers:{'Content-Type':'text/html'}});return new Response(bytes,{headers:{'Content-Type':'image/png'}});};}
async function fixture(run){const parent=resolve(tmpdir()),root=await mkdtemp(join(parent,'shiye-public-assets-'));try{await run(root);}finally{assert.ok(resolve(root).startsWith(parent+sep+'shiye-public-assets-'));await rm(root,{recursive:true,force:true});}}
test('official publisher evidence and file are fetched, pinned, inspected and cached; candidate stays pending',()=>fixture(async root=>{
 const {createPublicAssetCache}=await import('../server/source-assets.mjs'),calls=[],cache=await createPublicAssetCache({root,manifest,fetchImpl:goodFetch(calls)});
 const result=await cache.acquire('doodles-test');assert.equal(result.draft.kind,'asset');assert.equal(result.draft.asset.sha256,hash(bytes));assert.equal(result.draft.rights.usage,'reusable');assert.equal(result.draft.rights.checkedAt,null);assert.ok(result.draft.rights.evidence.includes(hash(legal)));assert.equal(result.draft.review,undefined);
 assert.deepEqual(await cache.read(hash(bytes)),bytes);assert.equal(calls.filter(x=>x===url).length,1);
 const again=await cache.acquire('doodles-test');assert.equal(again.cached,true);assert.equal(calls.filter(x=>x===url).length,1);assert.equal(calls.filter(x=>x===licensePage).length,2);
 const proof=JSON.parse(await readFile(join(root,'proofs',hash(bytes)+'.json'),'utf8'));assert.equal(proof.legalText,legal);assert.equal(proof.originalUrl,url);assert.match(proof.publisherHtml,/CC0 license/);
}));
test('unknown URLs, redirects, mismatched bytes and missing publisher association are refused',()=>fixture(async root=>{
 const {createPublicAssetCache}=await import('../server/source-assets.mjs');
 await assert.rejects(()=>createPublicAssetCache({root,manifest:[{...manifest[0],url:'http://127.0.0.1/private'}]}),/来源|HTTPS|允许/);
 const cache=await createPublicAssetCache({root,manifest,fetchImpl:goodFetch([])});await assert.rejects(()=>cache.acquire('../../private'),/未知|清单/);await assert.rejects(()=>cache.read('../private'),/无效|清单/);
 const bad=await createPublicAssetCache({root:join(root,'bad'),manifest,fetchImpl:async(u,i)=>u===url?new Response(Buffer.from('not png'),{headers:{'Content-Type':'image/png'}}):goodFetch([])(u,i)});await assert.rejects(()=>bad.acquire('doodles-test'),/校验|变化|文件/);
 const unrelated=await createPublicAssetCache({root:join(root,'unrelated'),manifest,fetchImpl:async(u,i)=>u===page?new Response('<p>No assets here</p>',{headers:{'Content-Type':'text/html'}}):goodFetch([])(u,i)});await assert.rejects(()=>unrelated.acquire('doodles-test'),/官网|链接|对应/);
 const redirected=await createPublicAssetCache({root:join(root,'redirected'),manifest,fetchImpl:async()=>({redirected:true,ok:true,headers:new Headers()})});await assert.rejects(()=>redirected.acquire('doodles-test'),/重定向/);
}));
test('changed license and oversized downloads are review failures, not empty success',()=>fixture(async root=>{
 const {createPublicAssetCache}=await import('../server/source-assets.mjs');
 const changed=await createPublicAssetCache({root:join(root,'changed'),manifest,fetchImpl:async(u,i)=>u===legalUrl?new Response('changed license',{headers:{'Content-Type':'text/plain'}}):goodFetch([])(u,i)});await assert.rejects(()=>changed.acquire('doodles-test'),/许可.*变化|许可.*校验/);
 const large=await createPublicAssetCache({root:join(root,'large'),manifest,fetchImpl:async(u,i)=>u===url?new Response(bytes,{headers:{'Content-Type':'image/png','Content-Length':'9000000'}}):goodFetch([])(u,i)});await assert.rejects(()=>large.acquire('doodles-test'),/过大|超过/);
}));
test('PNG inspection rejects incorrect CRC, truncated and excessive image dimensions',async()=>{
 const {inspectPublicPng}=await import('../server/source-assets.mjs');assert.deepEqual(inspectPublicPng(bytes),{width:1,height:1});
 const corrupt=Buffer.from(bytes);corrupt[45]^=1;assert.throws(()=>inspectPublicPng(corrupt),/PNG|校验/);
 assert.throws(()=>inspectPublicPng(bytes.subarray(0,bytes.length-5)),/PNG|完整/);
 const huge=Buffer.from(bytes);huge.writeUInt32BE(10000,16);huge.writeUInt32BE(crc(huge.subarray(12,29)),29);assert.throws(()=>inspectPublicPng(huge),/尺寸|像素/);
});

test('one transient TCP connect retry keeps byte/license checks and never retries denial or TLS',()=>fixture(async root=>{const {createPublicAssetCache}=await import('../server/source-assets.mjs');let attempts=0;const cache=await createPublicAssetCache({root,manifest,fetchImpl:async(u,i)=>{if(u===url&&++attempts===1)throw Object.assign(new TypeError('fetch failed'),{cause:{code:'UND_ERR_CONNECT_TIMEOUT'}});return goodFetch([])(u,i);}});await cache.acquire('doodles-test');assert.equal(attempts,2);for(const kind of ['tls','denied']){let n=0;const other=await createPublicAssetCache({root:join(root,kind),manifest,fetchImpl:async(u,i)=>{if(u===url){n++;if(kind==='tls')throw Object.assign(new TypeError('fetch failed'),{cause:{code:'CERT_HAS_EXPIRED'}});return new Response('',{status:403});}return goodFetch([])(u,i);}});await assert.rejects(other.acquire('doodles-test'));assert.equal(n,1);}}));
