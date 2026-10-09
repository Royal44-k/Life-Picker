export type SourceRights={usage:'unknown'|'reference-only'|'reusable';license:'unknown'|'CC0-1.0'|'MIT'|'own'|'custom';licenseUrl:string|null;attribution:string;changes:string;evidence:string;checkedAt:number|null};
export type SourceDraft={
 kind:'reference'|'asset';sourceId:string;originalUrl:string;canonicalUrl?:string;title:string;
 author:{name:string;url:string|null};publishedAt:string|null;summary:string;analysis:string;tags:string[];
 metrics:{name:'likes'|'favorites'|'comments'|'views';raw:string;value:number|null;precision:'exact'|'approximate'|'unknown';observedAt:number}[];
 rights:SourceRights;asset:null|{url:string;type:string;sha256:string|null;bytes:number|null};
};
export type SourceRecord=SourceDraft&{version:1;id:string;revision:number;canonicalUrl:string;collectedAt:number;createdAt:number;updatedAt:number;review:{state:'pending'|'approved'|'rejected';note:string;at:number|null};trashedAt:number|null};
export type SourceStatus={ready:boolean;mode:'local-computer';requiresPairing:boolean;maxRecords:number;error?:string;canRecover?:boolean};
export type SourceBackup={format:'shiye-sources';version:1;payload:string;sha256:string};
export type SourceForm={originalUrl:string;title:string;author:string;authorUrl:string;publishedAt:string;summary:string;analysis:string;tags:string;usage:SourceRights['usage'];license:SourceRights['license'];licenseUrl:string;attribution:string;changes:string;evidence:string};
export function toSourceForm(row?:SourceRecord):SourceForm{
 return {originalUrl:row?.originalUrl||'',title:row?.title||'',author:row?.author.name||'',authorUrl:row?.author.url||'',publishedAt:row?.publishedAt?.slice(0,10)||'',summary:row?.summary||'',analysis:row?.analysis||'',tags:row?.tags.join('，')||'',usage:row?.rights.usage||'reference-only',license:row?.rights.license||'unknown',licenseUrl:row?.rights.licenseUrl||'',attribution:row?.rights.attribution||'',changes:row?.rights.changes||'',evidence:row?.rights.evidence||''};
}
export function fromSourceForm(form:SourceForm,row?:SourceRecord|null):SourceDraft{
 return {kind:row?.kind||'reference',sourceId:row?.sourceId||'manual',originalUrl:form.originalUrl,title:form.title,author:{name:form.author,url:form.authorUrl||null},publishedAt:form.publishedAt===row?.publishedAt?.slice(0,10)?row.publishedAt:form.publishedAt||null,summary:form.summary,analysis:form.analysis,tags:[...new Set(form.tags.split(/[,，]/).map(t=>t.trim()).filter(Boolean))],metrics:row?.metrics||[],rights:{usage:form.usage,license:form.license,licenseUrl:form.licenseUrl||null,attribution:form.attribution,changes:form.changes,evidence:form.evidence,checkedAt:row?.rights.checkedAt??null},asset:row?.asset||null};
}

export type SourceCollectionRun={
 id:string;reason:'manual'|'automatic';state:'running'|'succeeded'|'partial'|'failed'|'interrupted';startedAt:number;finishedAt:number|null;
 added:number;updated:number;duplicates:number;skipped:number;failed:number;error:string;
 items:{id:string;title:string;outcome:'added'|'updated'|'duplicate'|'skipped'|'failed';error:string}[];
};
export type SourceCollectionStatus={ready:false;error:string}|{
 ready:true;enabled:boolean;running:boolean;latest:SourceCollectionRun|null;history:SourceCollectionRun[];
 lastScheduledDay:string|null;lastSuccessAt:number|null;nextRunAt:number|null;timezone:string;time:string;mode:'local-computer';error:string|null;
 sources:{id:string;sourceId:string;title:string}[];personalXhs:{state:string;message:string};
};

export type PersonalXhsRun={id:string;reason:'manual'|'automatic';state:string;startedAt:number;finishedAt:number|null;added:number;duplicates:number;items:{id:string;title:string}[]};
export type PersonalXhsStatus={ready:boolean;installed:boolean;state:string;message:string;running:boolean;enabled:boolean;verified:boolean;mode:'home'|'search';keyword:string;recent:boolean;lastSuccessAt:number|null;nextRunAt:number|null;latest:PersonalXhsRun|null;history:PersonalXhsRun[];timezone:string;time:string};
