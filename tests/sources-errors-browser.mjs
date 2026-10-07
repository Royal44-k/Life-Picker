import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp,rm,readFile,writeFile,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join,sep} from 'node:path';
import {createSourceStore,recoverSourceStore} from '../server/source-store.mjs';
import {createSourceHandler} from '../server/source-api.mjs';
const parent=resolve(tmpdir()),root=await mkdtemp(join(parent,'shiye-source-errors-'));
const store=await createSourceStore({root});
const row=await store.create({kind:'reference',originalUrl:'https://example.com/detail',title:'保留这条真实来源',summary:'自己的理解',rights:{usage:'reference-only'}});
await store.review(row.id,1,{action:'approve',acknowledged:true});const backup=await store.backup();
let handler=createSourceHandler(store,'12345678');
const server=createServer((req,res)=>void handler(req,res));await new Promise(r=>server.listen(0,'127.0.0.1',r));const api='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'msedge',headless:true});
async function page(){
 const page=await browser.newPage({viewport:{width:390,height:844}});page.setDefaultTimeout(6000);
 await page.route('**/api/sources/**',async route=>{const url=new URL(route.request().url()),headers={...route.request().headers(),origin:api};delete headers.host;const response=await route.fetch({url:api+url.pathname,headers});await route.fulfill({response});});
 await page.goto((process.env.TEST_URL||'http://localhost:5173')+'/?view=sources');return page;
}
try{
 const first=await page();await first.getByLabel('电脑连接码').fill('12345678');await first.getByRole('button',{name:'连接来源库',exact:true}).click();
 await first.getByRole('button',{name:/已通过/}).click();await first.getByRole('button',{name:/查看来源：保留这条真实来源/}).click();
 await first.getByLabel('标题',{exact:true}).fill('换连接码也不能丢失的编辑内容');
 await first.getByLabel('电脑连接码').fill('00000000');await first.getByRole('button',{name:'连接来源库',exact:true}).click();
 await first.getByRole('alert').filter({hasText:'连接码不正确'}).waitFor();
 const download=first.waitForEvent('download');await first.getByRole('button',{name:'下载当前编辑内容',exact:true}).click();assert.match(await readFile(await(await download).path(),'utf8'),/换连接码也不能丢失的编辑内容/);
 await first.getByLabel('电脑连接码').fill('12345678');await first.getByRole('button',{name:'连接来源库',exact:true}).click();await first.getByLabel('标题',{exact:true}).waitFor();assert.equal(await first.getByLabel('标题',{exact:true}).inputValue(),'换连接码也不能丢失的编辑内容');
 await first.unrouteAll({behavior:'wait'});await first.context().close();
 const catalog=join(root,'catalog.json'),broken=(await readFile(catalog,'utf8')).replace('保留这条真实来源','损坏这条真实来源');await writeFile(catalog,broken);
 handler=createSourceHandler(null,'12345678',{recover:bundle=>recoverSourceStore({root,bundle})});
 const second=await page();await second.getByText(/可在下方选择来源备份进行修复/).waitFor();await second.getByLabel('电脑连接码').fill('12345678');
 const damaged={...backup,payload:backup.payload+'broken'};
 await second.getByLabel('恢复来源备份').setInputFiles({name:'damaged.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(damaged))});
 await second.getByRole('alert').filter({hasText:'不是有效的拾页来源备份'}).waitFor();assert.equal(await readFile(catalog,'utf8'),broken);
 await second.getByLabel('恢复来源备份').setInputFiles({name:'valid-shape-bad-checksum.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...backup,sha256:'0'.repeat(64)}))});
 await second.getByLabel('保留损坏原文件，并从这份备份修复来源库').check();await second.getByRole('button',{name:'保留原文件并修复',exact:true}).click();
 await second.getByRole('alert').filter({hasText:/损坏|校验/}).waitFor();assert.equal(await readFile(catalog,'utf8'),broken);
 await second.getByLabel('恢复来源备份').setInputFiles({name:'healthy-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
 await second.getByText(/healthy-backup.json/).waitFor();assert.equal(await second.getByRole('button',{name:'保留原文件并修复',exact:true}).isDisabled(),true);
 await second.getByLabel('保留损坏原文件，并从这份备份修复来源库').check();await second.getByRole('button',{name:'保留原文件并修复',exact:true}).click();
 await second.getByText(/已从备份修复，损坏原文件保留。新增 1 条/).waitFor();
 const recovered=await createSourceStore({root});assert.equal((await recovered.list()).length,1);assert.equal((await recovered.list())[0].review.state,'pending');assert.deepEqual(await recovered.published(),[]);
 const original=(await readdir(root)).find(n=>n.startsWith('catalog-before-recovery-'));assert.ok(original);assert.equal(await readFile(join(root,original),'utf8'),broken);
 await second.getByRole('button',{name:/查看来源：保留这条真实来源/}).waitFor();
 console.log('PASS changed connection code retains draft and visible error; damaged backup rejected; explicit repair preserves exact corrupt file and restores pending sources through real API.');
}finally{for(const context of browser.contexts())for(const page of context.pages())await page.unrouteAll({behavior:'wait'});await browser.close();await new Promise(r=>server.close(r));assert.ok(resolve(root).startsWith(parent+sep+'shiye-source-errors-'));await rm(root,{recursive:true,force:true});}
