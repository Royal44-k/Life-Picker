import { useEffect, useRef, useState } from 'react';
import { Sparkles, Copy, ArrowUpRight, LoaderCircle, Check, Undo2 } from 'lucide-react';
import { Modal } from './Modal.tsx';

type Status={deepseek:boolean;ollama:boolean;deepseekModel:string;ollamaModel:string};
export function AiPanel({source,onApply,onClose,notify,initialTone="真诚自然",initialTopic=""}:{initialTone?:string;initialTopic?:string;source:string;onApply:(text:string)=>void;onClose:()=>void;notify:(text:string)=>void}) {
  const [mode,setMode]=useState<'generate'|'polish'>(source.trim()?'polish':'generate');
  const [provider,setProvider]=useState('manual');
  const [topic,setTopic]=useState(initialTopic);
  const [tone,setTone]=useState(initialTone);
  const [length,setLength]=useState('500');
  const [symbols,setSymbols]=useState('适量 emoji 和颜文字');
  const [code,setCode]=useState(()=>{try{return sessionStorage.getItem('shiye:ai-code')||'';}catch{return '';}});
  const [result,setResult]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const [manualPrompt,setManualPrompt]=useState('');
  const [status,setStatus]=useState<Status|null>(null);const [statusFailed,setStatusFailed]=useState(false);
  const abort=useRef<AbortController|null>(null);
  useEffect(()=>{fetch('/api/status').then(r=>{if(!r.ok)throw Error();return r.json();}).then(setStatus).catch(()=>setStatusFailed(true));return()=>abort.current?.abort();},[]);
  const instruction=`请${mode==='polish'?'润色以下文案，保留原有事实、观点和数字':'围绕以下主题创作中文图文文案'}。语气：${tone}；目标约 ${length} 字；符号风格：${symbols}。使用基础 Markdown：一个 # 标题，若干 ## 小节、短段落、列表；每页之间可使用单独一行 ---。适合手机阅读，不要编造亲身经历、数据或来源，不保证传播效果。只输出文案正文。\n\n${mode==='polish'?source:topic}${mode==='polish'&&topic?`\n额外要求：${topic}`:''}`;
  const copyPrompt=async()=>{try{await navigator.clipboard.writeText(instruction);notify('提示词已复制，去聊天工具粘贴即可');}catch{setManualPrompt(instruction);notify('自动复制不可用，请长按「完整提示词」文本框全选复制');}};
  const generate=async()=>{
    setError('');if(mode==='generate'&&!topic.trim()){setError('先写下你想表达的主题。');return;}
    if(mode==='polish'&&!source.trim()){setError('编辑器里还没有文案，请先输入或切换「从主题生成」。');return;}
    if(!code.trim()){setError('请输入电脑启动窗口显示的 8 位连接码。');return;}
    setBusy(true);abort.current=new AbortController();
    try{
      const res=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json','X-Shiye-Code':code},body:JSON.stringify({provider,mode,source:mode==='polish'?source:'',topic,tone,length:Number(length),symbols}),signal:abort.current.signal});
      const data=await res.json();if(!res.ok)throw new Error(data.error||'生成失败，请重试。');
      setResult(data.text);try{sessionStorage.setItem('shiye:ai-code',code);}catch{/* private browsing */}
      notify('文案已生成，请检查内容后再放入排版');
    }catch(e){if(e instanceof Error&&e.name==='AbortError')setError('已取消等待，可稍后重试。');else setError(e instanceof Error?e.message:'网络连接中断。');}
    finally{setBusy(false);abort.current=null;}
  };
  return <Modal title="AI 文案助手" onClose={()=>{if(!result.trim()||window.confirm('结果尚未应用到排版，确定关闭并放弃这段结果吗？'))onClose();}} wide>
    <p className="modal-intro">想法到文案，再到一组好看的图。结果由你确认后应用。</p>
    <div className="segmented"><button className={mode==='polish'?'selected':''} onClick={()=>setMode('polish')}>润色已有文案</button><button className={mode==='generate'?'selected':''} onClick={()=>setMode('generate')}>从主题生成</button></div>
    <label className="field-label">{mode==='generate'?'这次想写什么？':'补充要求（可选）'}<textarea aria-label={mode==='generate'?'这次想写什么？':'补充要求（可选）'} rows={3} value={topic} maxLength={2000} onChange={e=>setTopic(e.target.value)} placeholder={mode==='generate'?'例如：给刚入职的女生写一篇通勤包整理指南，实用、轻松，有颜文字。':'例如：开头更有吸引力，保留我的表达习惯。'}/></label>
    <div className="form-grid"><label className="field-label">文案语气<select aria-label="文案语气" value={tone} onChange={e=>setTone(e.target.value)}>{['真诚自然','专业清晰','活泼俏皮','温柔治愈','简洁有力'].map(x=><option key={x}>{x}</option>)}</select></label><label className="field-label">目标长度<select value={length} onChange={e=>setLength(e.target.value)}><option value="300">约 300 字</option><option value="500">约 500 字</option><option value="800">约 800 字</option></select></label></div>
    <label className="field-label">符号与颜文字<select value={symbols} onChange={e=>setSymbols(e.target.value)}>{['不使用装饰符号','少量 emoji','适量 emoji 和颜文字','丰富符号与颜文字，如 ✦ (๑•̀ㅂ•́)و✧'].map(x=><option key={x}>{x}</option>)}</select></label>
    <label className="field-label">使用方式<select value={provider} onChange={e=>setProvider(e.target.value)}><option value="manual">免费手动 · 复制提示词到聊天工具</option><option value="deepseek">DeepSeek API · 按量收费</option><option value="ollama">Ollama 本地模型 · 无 API 费用</option></select></label>
    {provider==='manual'?<div className="ai-note"><p>复制提示词到你常用的免费聊天工具，生成后粘贴到下方。免费额度以服务商为准。</p><button className="secondary" onClick={copyPrompt}><Copy size={16}/>复制完整提示词</button> <a href="https://chat.deepseek.com/" target="_blank" rel="noreferrer">打开 DeepSeek <ArrowUpRight size={13}/></a></div>:<>
      <div className="ai-note">{provider==='deepseek'?'文案将发送给 DeepSeek。API Key 仅在电脑的 .env 文件中配置，手机不用填密钥。':'文案发送给这台电脑的本地 Ollama 服务，需先安装并下载模型；速度取决于电脑配置。'}<br/>{statusFailed?'本地 AI 服务未连接，请用「启动拾页.cmd」启动。':status&&!(provider==='deepseek'?status.deepseek:status.ollama)?'尚未配置：打开项目的「配置AI.cmd」，按引导操作。':status?`当前模型：${provider==='deepseek'?status.deepseekModel:status.ollamaModel}`:'正在检查连接…'}<a href="/guide.html#ai" target="_blank" rel="noreferrer">查看配置步骤</a></div>
      <label className="field-label">电脑窗口中的 8 位连接码<input value={code} inputMode="numeric" maxLength={8} onChange={e=>setCode(e.target.value)} placeholder="每次重新启动会变化" autoComplete="off"/></label>
      {busy?<button className="secondary" onClick={()=>abort.current?.abort()}><LoaderCircle size={16} className="spin"/>生成中 · 点击取消</button>:<button className="primary full" onClick={generate} disabled={!status||(provider==='deepseek'?!status.deepseek:!status.ollama)}><Sparkles size={17}/>{mode==='polish'?'开始润色':'生成文案'}</button>}
    </>}
    {error&&<p className="error-message" role="alert">{error}</p>}
    {manualPrompt&&<label className="field-label">完整提示词（长按全选复制）<textarea aria-label="完整提示词" rows={4} value={manualPrompt} readOnly/></label>}
    <label className="field-label">{provider==='manual'?'将生成的文案粘贴到这里':'生成结果（可编辑）'}<textarea aria-label="AI 文案结果" rows={7} value={result} onChange={e=>setResult(e.target.value)} placeholder="支持 emoji、颜文字和基础 Markdown。"/></label>
    <div className="modal-actions"><span className="muted"><Undo2 size={14}/>应用前会保留原稿</span><button className="primary" disabled={!result.trim()||busy||result.length>20000} onClick={()=>onApply(result)}><Check size={17}/>应用到排版</button></div>
  </Modal>;
}
