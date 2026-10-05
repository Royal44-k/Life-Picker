import type {SourceForm,SourceRecord} from './types.ts';
const date=(n:number)=>new Date(n).toLocaleString('zh-CN');
const metrics={likes:'点赞',favorites:'收藏',comments:'评论',views:'浏览'};
export function SourceFacts({row}:{row:SourceRecord}){
 return <div className="source-facts">
  <p>发布时间：{row.publishedAt?row.publishedAt.slice(0,10):'未知'}</p><p>收录时间：{date(row.collectedAt)}</p>
  <p>作者：{row.author.name||'未知'} · {row.kind==='asset'?'设计素材':'参考链接'}</p>
  {row.metrics.length?row.metrics.map(m=><p key={m.name}>{metrics[m.name]}：{m.raw}（{m.precision==='exact'?'原始数值':m.precision==='approximate'?'约数':'数值未知'}）<br/><small>{date(m.observedAt)} 观察</small></p>):<p>互动数据：未知，未作热度排名</p>}
  <a href={row.originalUrl} target="_blank" rel="noopener noreferrer">打开原始来源 ↗</a>
  {row.rights.licenseUrl&&<a href={row.rights.licenseUrl} target="_blank" rel="noopener noreferrer">查看许可原文 ↗</a>}
  {row.asset&&<p>素材文件：{row.asset.bytes?Math.ceil(row.asset.bytes/1024)+' KB':'尚未核验'} · {row.asset.sha256?'已有文件校验记录':'尚无文件校验记录'}</p>}
  {row.review.note&&<p>审核说明：{row.review.note}</p>}
  {row.rights.checkedAt!==null&&<p>许可核对：{date(row.rights.checkedAt)}</p>}
 </div>;
}
export function SourceFields({form,onChange,disabled,kind}:{form:SourceForm;onChange:(form:SourceForm)=>void;disabled:boolean;kind:'reference'|'asset'}){
 const set=<K extends keyof SourceForm>(key:K,value:SourceForm[K])=>onChange({...form,[key]:value});
 return <fieldset className="source-fields" disabled={disabled}>
  <label>原始链接<input type="url" autoCapitalize="none" autoCorrect="off" required maxLength={2048} value={form.originalUrl} onChange={e=>set('originalUrl',e.target.value)} placeholder="https://…"/></label>
  <label>标题<input required maxLength={120} value={form.title} onChange={e=>set('title',e.target.value)} placeholder="这条参考给你的启发"/></label>
  <div className="source-pair"><label>作者<input maxLength={100} value={form.author} onChange={e=>set('author',e.target.value)} placeholder="不知道可以留空"/></label><label>发布日期<input type="date" value={form.publishedAt} onChange={e=>set('publishedAt',e.target.value)}/></label></div>
  <label>自己的概括<textarea aria-label="自己的概括" rows={3} maxLength={1600} value={form.summary} onChange={e=>set('summary',e.target.value)} placeholder="用自己的话概括，不必复制整篇笔记。"/></label>
  <label>结构分析<textarea aria-label="结构分析" rows={4} maxLength={4000} value={form.analysis} onChange={e=>set('analysis',e.target.value)} placeholder="例如：用一个具体问题开头，讲述亲身经历，最后给出可执行的建议。"/></label>
  <label>标签<input maxLength={320} value={form.tags} onChange={e=>set('tags',e.target.value)} placeholder="用逗号分隔，最多 12 个"/></label>
  <label>使用范围<select value={form.usage} onChange={e=>set('usage',e.target.value as SourceForm['usage'])}><option value="reference-only">仅参考链接与自己的分析</option><option value="reusable">有许可，可复用素材</option><option value="unknown">尚未确认</option></select></label>
  <p className="source-help">{kind==='asset'?'素材通过审核前，需要许可依据与文件核验记录。':'“仅参考”用于保存出处与写作思路，不代表取得原文或图片的再发布许可。'}</p>
  <details className="source-license" open={form.usage==='reusable'||undefined}><summary>作者链接与许可依据</summary>
   <label>作者主页<input type="url" value={form.authorUrl} maxLength={2048} onChange={e=>set('authorUrl',e.target.value)}/></label>
   <label>许可类型<select value={form.license} onChange={e=>set('license',e.target.value as SourceForm['license'])}><option value="unknown">未知</option><option value="CC0-1.0">CC0 1.0</option><option value="MIT">MIT</option><option value="own">本人原创</option><option value="custom">其他明确许可</option></select></label>
   <label>许可原文链接<input type="url" maxLength={2048} value={form.licenseUrl} onChange={e=>set('licenseUrl',e.target.value)}/></label>
   <label>许可核对依据<textarea aria-label="许可核对依据" rows={3} maxLength={2000} value={form.evidence} onChange={e=>set('evidence',e.target.value)} placeholder="记录许可条款适用对象及核对结果。"/></label>
   <label>署名与许可声明<textarea aria-label="署名与许可声明" rows={3} maxLength={3000} value={form.attribution} onChange={e=>set('attribution',e.target.value)}/></label>
   <label>素材修改说明<textarea aria-label="素材修改说明" rows={2} maxLength={1000} value={form.changes} onChange={e=>set('changes',e.target.value)}/></label>
  </details>
 </fieldset>;
}
