import {stripLinkCredentials} from '../src/sources/links.mjs';
import {randomUUID} from 'node:crypto';
const kinds=['reference','asset'],uses=['unknown','reference-only','reusable'],licenses=['unknown','CC0-1.0','MIT','own','custom'];
const states=['pending','approved','rejected'],imageTypes=['image/svg+xml','image/png','image/jpeg','image/webp'];
const idPattern=/^[\w:-]{1,100}$/;
const text=(value,max,label,required=false)=>{if(typeof value!=='string'||value.length>max||required&&!value.trim())throw new Error(label+'格式不正确或超过限制。');return value.trim();};
const time=(value,label,nullable=false)=>{if(nullable&&value==null)return null;if(!Number.isSafeInteger(value)||value<0)throw new Error(label+'无效。');return value;};
function link(value,nullable=false){if(nullable&&(value==null||value===''))return null;if(typeof value!=='string'||value.length>2048)throw new Error('请提供有效的公开来源链接。');let url;try{url=new URL(value);}catch{throw new Error('请提供完整的 http 或 https 来源链接。');}if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw new Error('来源链接不支持此协议或内含登录口令。');stripLinkCredentials(url);return url.toString();}
export function canonicalSourceUrl(value){const url=new URL(link(value));url.hash='';for(const key of [...url.searchParams.keys()])if(/^utm_/i.test(key)||['spm','share_from_user_hidden','xsec_source','app_platform','app_version','xsec_token'].includes(key.toLowerCase()))url.searchParams.delete(key);if(['xiaohongshu.com','www.xiaohongshu.com'].includes(url.hostname)){url.hostname='www.xiaohongshu.com';url.protocol='https:';url.pathname=url.pathname.replace(/^\/discovery\/item\//,'/explore/');}url.searchParams.sort();return url.toString();}
function published(value){if(value==null||value==='')return null;if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)||!Number.isFinite(Date.parse(value)))throw new Error('发布日期无效，不确定时请留空。');if(new Date(value.slice(0,10)).toISOString().slice(0,10)!==value.slice(0,10))throw new Error('发布日期无效。');return value;}
export function parseSourceDraft(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||!kinds.includes(input.kind))throw new Error('来源类型无效。');
 const sourceId=text(input.sourceId??'manual',50,'来源标识',true);if(!/^[a-z0-9-]+$/.test(sourceId))throw new Error('来源标识无效。');
 if(input.author!=null&&(typeof input.author!=='object'||Array.isArray(input.author)))throw new Error('作者信息无效。');if(input.rights!=null&&(typeof input.rights!=='object'||Array.isArray(input.rights)))throw new Error('许可信息无效。');
 const originalUrl=link(input.originalUrl),author=input.author??{},rights=input.rights??{};
 const tags=input.tags??[];if(!Array.isArray(tags)||tags.length>12)throw new Error('标签最多 12 个。');const cleanTags=[...new Set(tags.map(t=>text(t,24,'标签',true)))];
 const metrics=input.metrics??[];if(!Array.isArray(metrics)||metrics.length>4)throw new Error('互动数据过多。');const seen=new Set();
 const cleanMetrics=metrics.map(m=>{if(!m||!['likes','favorites','comments','views'].includes(m.name)||seen.has(m.name)||!['exact','approximate','unknown'].includes(m.precision))throw new Error('互动数据格式无效。');seen.add(m.name);if(m.precision==='unknown'?m.value!==null:!Number.isSafeInteger(m.value)||m.value<0)throw new Error('互动数值与精度不一致。');return {name:m.name,raw:text(m.raw,40,'互动原文',true),value:m.value,precision:m.precision,observedAt:time(m.observedAt,'互动核验时间')};});
 const usage=rights.usage??'unknown',license=rights.license??'unknown';if(!uses.includes(usage)||!licenses.includes(license))throw new Error('来源可用范围或许可类型无效。');
 const cleanRights={usage,license,licenseUrl:link(rights.licenseUrl,true),attribution:text(rights.attribution??'',3000,'署名声明'),changes:text(rights.changes??'',1000,'修改说明'),evidence:text(rights.evidence??'',2000,'许可核对说明'),checkedAt:time(rights.checkedAt,'许可核查时间',true)};
 let asset=null;if(input.asset!=null){const a=input.asset;if(!a||!imageTypes.includes(a.type)||a.sha256!=null&&!/^[a-f0-9]{64}$/.test(a.sha256)||a.bytes!=null&&(!Number.isSafeInteger(a.bytes)||a.bytes<1||a.bytes>8_000_000))throw new Error('素材信息无效。');asset={url:link(a.url),type:a.type,sha256:a.sha256??null,bytes:a.bytes??null};}if(input.kind==='reference'&&asset)throw new Error('参考笔记不能附带素材下载定义。');
 return {kind:input.kind,sourceId,originalUrl,canonicalUrl:canonicalSourceUrl(originalUrl),title:text(input.title,120,'标题',true),author:{name:text(author.name??'',100,'作者'),url:link(author.url,true)},publishedAt:published(input.publishedAt),summary:text(input.summary??'',1600,'自写概括'),analysis:text(input.analysis??'',4000,'结构分析'),tags:cleanTags,metrics:cleanMetrics,rights:cleanRights,asset};
}
function approvalEvidence(row){
 if(row.trashedAt!==null)throw new Error('请先从回收站恢复，再审核。');
 if(!row.rights.checkedAt&&row.rights.checkedAt!==0||row.rights.usage==='unknown')throw new Error('请核对来源的可用范围。');
 if(row.kind==='reference'&&!row.summary&&!row.analysis)throw new Error('请写下自己的概括或结构分析后再通过。');
 if(row.kind==='asset'&&row.rights.usage!=='reusable')throw new Error('素材需要明确可复用的许可。');
 if(row.rights.usage==='reusable'){
  if(row.rights.license==='unknown'||!row.rights.licenseUrl||!row.rights.evidence)throw new Error('请补齐可复用许可的原始链接和核对依据。');
  if(row.rights.license==='MIT'&&!row.rights.attribution)throw new Error('MIT 素材需要保留版权及许可声明。');
 }
 if(row.kind==='asset'&&(!row.asset?.sha256||!row.asset.bytes))throw new Error('素材尚未核验文件和校验值，不能作为可用素材通过。');
}
export function createCandidate(input,{id=randomUUID(),now=Date.now()}={}){
 return validateCandidate({version:1,id,revision:1,...parseSourceDraft(input),collectedAt:now,createdAt:now,updatedAt:now,review:{state:'pending',note:'',at:null},trashedAt:null});
}
export function validateCandidate(value){
 if(!value||value.version!==1||typeof value.id!=='string'||!idPattern.test(value.id)||!Number.isSafeInteger(value.revision)||value.revision<1)throw new Error('来源记录或修订无效。');
 const data=parseSourceDraft(value);if(data.canonicalUrl!==canonicalSourceUrl(value.canonicalUrl))throw new Error('来源规范链接不一致。');
 const review=value.review;if(!review||!states.includes(review.state))throw new Error('审核状态无效。');
 const row={version:1,id:value.id,revision:value.revision,...data,collectedAt:time(value.collectedAt,'采集时间'),createdAt:time(value.createdAt,'创建时间'),updatedAt:time(value.updatedAt,'更新时间'),review:{state:review.state,note:text(review.note??'',1000,'审核说明'),at:time(review.at,'审核时间',true)},trashedAt:time(value.trashedAt,'回收时间',true)};
 if(row.review.state!=='pending'&&row.review.at===null)throw new Error('缺少审核时间。');if(row.review.state==='rejected'&&!row.review.note)throw new Error('请填写不通过的原因。');
 if(row.review.state==='approved')approvalEvidence({...row,trashedAt:null});return row;
}
export function editCandidate(previous,input,{now=Date.now()}={}){const old=validateCandidate(previous);if(old.trashedAt!==null)throw new Error('请先从回收站恢复再编辑。');return validateCandidate({...old,...parseSourceDraft(input),revision:old.revision+1,updatedAt:now,review:{state:'pending',note:'内容已修改，请重新核对。',at:null}});}
export function reviewCandidate(previous,{action,note='',acknowledged=false},{now=Date.now()}={}){
 const old=validateCandidate(previous);if(old.trashedAt!==null)throw new Error('请先从回收站恢复再审核。');if(!['approve','reject','reopen'].includes(action))throw new Error('审核操作无效。');if(action==='approve'&&acknowledged!==true)throw new Error('请确认已核对出处、内容与可用范围。');if(action==='reject'&&!note.trim())throw new Error('请填写不通过的原因。');
 const row={...old,revision:old.revision+1,updatedAt:now,rights:action==='approve'?{...old.rights,checkedAt:now}:old.rights,review:{state:action==='approve'?'approved':action==='reject'?'rejected':'pending',note,at:action==='reopen'?null:now}};if(action==='approve')approvalEvidence(row);return validateCandidate(row);
}
export function setCandidateTrashed(previous,trashed,{now=Date.now()}={}){if(typeof trashed!=='boolean')throw new Error('回收操作无效。');const old=validateCandidate(previous);return validateCandidate({...old,revision:old.revision+1,updatedAt:now,trashedAt:trashed?now:null});}
export function sourceIdentity(row){return row.kind+':'+canonicalSourceUrl(row.originalUrl);}
export function publicCandidate(value){const row=validateCandidate(value);if(row.trashedAt!==null||row.review.state!=='approved')return null;const {id,revision,kind,sourceId,canonicalUrl,title,author,publishedAt,collectedAt,updatedAt,summary,analysis,tags,metrics,rights,asset}=row;return {id,revision,kind,sourceId,canonicalUrl,title,author,publishedAt,collectedAt,updatedAt,summary,analysis,tags,metrics,rights,asset};}
