export interface SourceCredit {
 version:1;recordId:string;revision:number;title:string;url:string;author:string;authorUrl:string|null;
 collectedAt:number;checkedAt:number;license:'CC0-1.0'|'MIT'|'own'|'custom';licenseUrl:string;
 attribution:string;changes:string;evidence:string;originalHash:string;
}
const text=(value:unknown,max:number,required=false)=>typeof value==='string'&&value.length<=max&&(!required||!!value.trim());
export function safeSourceLink(value:unknown):value is string{
 if(typeof value!=='string'||value.length>2048)return false;
 try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password&&!/\b(xsec_token|access_token|refresh_token|auth_token|authorization|bearer|api_key)=/i.test(u.search+u.hash);}catch{return false;}
}
export function validateSourceCredit(value:unknown):SourceCredit{
 const c=value as SourceCredit;
 if(!c||c.version!==1||!text(c.recordId,100,true)||!/^\w[\w:-]*$/.test(c.recordId)||!Number.isSafeInteger(c.revision)||c.revision<1||!text(c.title,120,true)||!safeSourceLink(c.url)||!text(c.author,100)||c.authorUrl!==null&&!safeSourceLink(c.authorUrl)||!Number.isSafeInteger(c.collectedAt)||c.collectedAt<0||!Number.isSafeInteger(c.checkedAt)||c.checkedAt<0||!['CC0-1.0','MIT','own','custom'].includes(c.license)||!safeSourceLink(c.licenseUrl)||!text(c.attribution,3000)||!text(c.changes,1000)||!text(c.evidence,2000,true)||!text(c.originalHash,64)||!/^[a-f0-9]{64}$/.test(c.originalHash))throw new Error('素材来源声明无效，请核对备份中的出处与许可。');
 if(c.license==='MIT'&&!c.attribution.trim())throw new Error('素材来源缺少 MIT 完整声明。');
 return {version:1,recordId:c.recordId,revision:c.revision,title:c.title,url:c.url,author:c.author,authorUrl:c.authorUrl,collectedAt:c.collectedAt,checkedAt:c.checkedAt,license:c.license,licenseUrl:c.licenseUrl,attribution:c.attribution,changes:c.changes,evidence:c.evidence,originalHash:c.originalHash};
}
