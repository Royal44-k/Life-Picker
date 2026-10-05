import type {InspirationOrigin} from './inspiration-model.ts';
import type {SourceCredit} from './credit.ts';
import type {MediaAsset} from '../studio/model.ts';
import './published.css';
export function SourceCreditDetails({credit:c}:{credit:SourceCredit}){return <details className="material-credit"><summary>插画出处 · {c.title} · {c.license}</summary><p>作者：{c.author||'未知'} · <a href={c.url} target="_blank" rel="noreferrer">原始出处 ↗</a></p><p><a href={c.licenseUrl} target="_blank" rel="noreferrer">查看许可 {c.license} ↗</a> · {new Date(c.checkedAt).toLocaleDateString('zh-CN')} 核对</p><p>{c.changes}</p>{c.attribution&&<pre>{c.attribution}</pre>}<p>保留的是套用时的来源快照；此后来源库的修改不会改写这张本机图片。</p></details>;}
export function StoryMaterialCredits({assets}:{assets:MediaAsset[]}){const credited=assets.filter(a=>a.sourceCredit);return credited.length?<details className="material-credit"><summary>本作品的素材出处</summary>{credited.map(a=><SourceCreditDetails key={a.id} credit={a.sourceCredit!}/>)}</details>:null;}

export function StoryInspirationCredit({origin:o}:{origin?:InspirationOrigin}){return o?<details className="material-credit"><summary>本作品的创作依据</summary><p>结构参考：<a href={o.source.url} target="_blank" rel="noreferrer">{o.source.title} ↗</a> · {o.source.author||'作者未知'}</p><p>选材：{o.records.map(r=>r.date+' 的记录（修订 '+r.revision+'）').join('、')}。原始记录保留。</p><p>{new Date(o.generatedAt).toLocaleString('zh-CN')} · {o.model} 初稿。作品后续可手动修改，请以当前确认文字为准。</p></details>:null;}
