import {Modal} from '../components/Modal.tsx';
import type {LayoutIssue} from './diagnostics.ts';
export function LayoutChecks({issues,onClose,onPage,onSource,onReviewed,onAuto,onAI,error}:{error?:string;issues:LayoutIssue[];onClose:()=>void;onPage:(id:string,index?:number)=>void;onSource:()=>void;onReviewed:()=>void;onAuto:()=>void;onAI:()=>void}){
 return <Modal title="排版检查" onClose={onClose} wide>
  {error&&<p className="next-error" role="alert">{error}</p>}
  <p className="next-hint">根据当前图片尺寸和实际排版检查可读性、素材与来源。请同时预览作品，确认内容符合你的表达。</p>
  {!issues.length&&<p className="next-notice">暂未发现上述排版问题。事实与手机上的阅读感受仍需要你确认。</p>}
  <div className="next-layout-checks">{issues.map((issue,i)=><article key={issue.kind+':'+i} className={issue.severity==='error'?'next-error':'next-notice'}>
   <strong>{issue.sceneIndex!==undefined?'第 '+(issue.sceneIndex+1)+' 张图片':'整篇作品'}</strong><p>{issue.message}</p>
   {issue.action==='page'&&issue.pageId&&<button className="next-secondary" onClick={()=>onPage(issue.pageId!,issue.sceneIndex)}>检查对应分镜</button>}
   {issue.action==='source'&&<button className="next-secondary" onClick={onSource}>回到原文核对</button>}
   {issue.action==='review'&&<button className="next-secondary" onClick={onReviewed}>我已核对 AI 改写与来源</button>}
   {issue.action==='target'&&<div className="next-check-actions"><button className="next-secondary" onClick={onAuto}>保留全部 · 改为自动篇幅</button><button className="next-secondary" onClick={onAI}>预览 AI 精简建议</button></div>}
  </article>)}</div>
 </Modal>;
}
