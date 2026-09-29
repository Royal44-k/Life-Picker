import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowLeft, ArrowRight, BookOpen, Check, CheckCheck, ChevronDown, CircleHelp, FilePlus2, FileText, FolderOpen, Layers, List, LoaderCircle, Palette, Plus, Quote, Scissors, Settings2, ShieldCheck, Smartphone, Smile, Sparkles, Trash2, Type, Upload } from 'lucide-react';
import type { CardOptions, Draft } from './core/types.ts';
import { DEFAULT_OPTIONS, HEIGHTS, layoutDocument, LIMITS } from './core/layout.ts';
import { createMeasure } from './core/renderer.ts';
import { THEMES, getTheme } from './core/themes.ts';
import { ACTIVE_KEY, BRAND_KEY, STORAGE_KEY, isOptions, loadDrafts, makeId, persistDrafts, validateSource } from './core/storage.ts';
import { documentTitle } from './core/markdown.ts';
import { SAMPLE } from './core/sample.ts';
import { download, exportZip, makePng, safeName } from './core/export.ts';
import { CardPreview } from './components/CardPreview.tsx';
import { Modal } from './components/Modal.tsx';
import { AiPanel } from './components/AiPanel.tsx';

function initialState() {
  const drafts=loadDrafts();
  let active='';let stored:string|null=null;try{active=localStorage.getItem(ACTIVE_KEY)||'';stored=localStorage.getItem(STORAGE_KEY);}catch{/* unavailable storage */}
  if(drafts.length)return {drafts,id:drafts.find(d=>d.id===active)?.id||drafts[0].id,stored};
  const draft={id:makeId(),source:SAMPLE,options:DEFAULT_OPTIONS,updatedAt:Date.now()};return {drafts:[draft],id:draft.id,stored};
}
function brandOptions():CardOptions {try{const data=JSON.parse(localStorage.getItem(BRAND_KEY)||'null');return isOptions(data)?data:DEFAULT_OPTIONS;}catch{return DEFAULT_OPTIONS;}}

export default function App() {
  const [boot]=useState(initialState);const [drafts,setDrafts]=useState(boot.drafts);const [activeId,setActiveId]=useState(boot.id);
  const active=drafts.find(d=>d.id===activeId)||drafts[0];const {source,options}=active;
  const [tab,setTab]=useState('preview');const [page,setPage]=useState(0);const [modal,setModal]=useState<'drafts'|'export'|'help'|'ai'|null>(null);
  const [toast,setToast]=useState('');const [saveError,setSaveError]=useState('');const [busy,setBusy]=useState('');const [selected,setSelected]=useState<string[]>([]);
  const [symbolsOpen,setSymbolsOpen]=useState(false);const [imageUrl,setImageUrl]=useState('');const [imageBlob,setImageBlob]=useState<Blob|null>(null);const [imageIndex,setImageIndex]=useState(0);
  const [canShare,setCanShare]=useState(false);const [exportError,setExportError]=useState('');const [imageBusy,setImageBusy]=useState(false);
  const editor=useRef<HTMLTextAreaElement>(null);const fileInput=useRef<HTMLInputElement>(null);const imageRequest=useRef(0);
  const expectedStorage=useRef(boot.stored);
  const theme=getTheme(options.theme);
  const notify=(text:string)=>setToast(text);
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),4300);return()=>clearTimeout(timer);},[toast]);
  useEffect(()=>{try{expectedStorage.current=persistDrafts(drafts,activeId,expectedStorage.current);setSaveError('');}catch(e){setSaveError(e instanceof Error&&e.message.includes('其他窗口')?e.message:'本地存储已满或不可用，请先导出 Markdown 备份。');}},[drafts,activeId]);
  useEffect(()=>()=>{if(imageUrl)URL.revokeObjectURL(imageUrl);},[imageUrl]);
  const update=(change:Partial<Draft>)=>setDrafts(prev=>prev.map(d=>d.id===active.id?{...d,...change,updatedAt:Date.now()}:d));
  const setOptions=(change:Partial<CardOptions>)=>update({options:{...options,...change}});
  const layout=useMemo(()=>{try{return {cards:layoutDocument(source,options,createMeasure(options)),error:''};}catch(e){return {cards:[],error:e instanceof Error?e.message:'排版失败，请减少内容。'};}},[source,options]);
  const cards=layout.cards;const currentPage=Math.min(page,Math.max(0,cards.length-1));const current=cards[currentPage];
  const addDraft=(text='',opts=brandOptions())=>{
    if(drafts.length>=LIMITS.drafts){notify('草稿箱已满，请先备份并删除一些草稿。');return false;}
    const draft={id:makeId(),source:text,options:opts,updatedAt:Date.now()};setDrafts(prev=>[draft,...prev]);setActiveId(draft.id);setPage(0);return true;
  };
  const insert=(before:string,after='')=>{
    const el=editor.current;const start=el?.selectionStart??source.length;const end=el?.selectionEnd??start;
    const text=source.slice(0,start)+before+source.slice(start,end)+after+source.slice(end);
    try{validateSource(text);update({source:text});setTab('content');requestAnimationFrame(()=>{el?.focus();el?.setSelectionRange(start+before.length,end+before.length);});}catch(e){notify((e as Error).message);}
  };
  const importFiles=async(files:FileList|null)=>{
    if(!files?.length)return;
    try{
      if(files.length>LIMITS.files)throw new Error('每次最多导入 10 篇。');
      if(drafts.length+files.length>LIMITS.drafts)throw new Error('草稿数量将超过 20 篇，请先整理草稿箱。');
      const incoming:Draft[]=[];
      for(const file of Array.from(files)){
        if(!/\.(md|markdown|txt)$/i.test(file.name))throw new Error(`${file.name} 不是 Markdown 或 TXT 文件。`);
        if(file.size>LIMITS.bytes)throw new Error(`${file.name} 超过 80 KB。`);
        const text=validateSource((await file.text()).replace(/^\uFEFF/,''));
        if(!text.trim())throw new Error(`${file.name} 没有文字。`);
        incoming.push({id:makeId(),source:text,options:brandOptions(),updatedAt:Date.now()});
      }
      setDrafts(prev=>[...incoming,...prev]);setActiveId(incoming[0].id);setPage(0);setTab('preview');notify(`已导入 ${incoming.length} 篇，可在草稿箱批量导出`);
    }catch(e){notify((e as Error).message);}finally{if(fileInput.current)fileInput.current.value='';}
  };
  const zip=async(items:Draft[])=>{
    if(busy)return;setBusy('正在准备图片…');
    try{const blob=await exportZip(items,setBusy);download(blob,`${items.length>1?'拾页-批量图文':safeName(documentTitle(items[0].source))}.zip`);notify('ZIP 已生成，请在浏览器下载列表查看');}catch(e){notify((e as Error).message);}finally{setBusy('');}
  };
  const prepareImage=async(index:number)=>{
    if(!cards[index])return;const request=++imageRequest.current;setImageBusy(true);setExportError('');setImageBlob(null);setImageUrl('');setImageIndex(index);
    try{const blob=await makePng(cards[index],options);if(request!==imageRequest.current)return;setImageBlob(blob);setImageUrl(URL.createObjectURL(blob));
      const file=new File([blob],`拾页-${index+1}.png`,{type:'image/png'});setCanShare(Boolean(navigator.canShare?.({files:[file]})));
    }catch(e){setExportError((e as Error).message);}finally{if(request===imageRequest.current)setImageBusy(false);}
  };
  const openExport=()=>{setModal('export');void prepareImage(currentPage);};
  const share=async()=>{if(!imageBlob)return;try{await navigator.share({files:[new File([imageBlob],`${safeName(documentTitle(source))}-${imageIndex+1}.png`,{type:'image/png'})]});}catch(e){if((e as Error).name!=='AbortError')setExportError('系统分享不可用，请长按图片保存或下载 PNG。');}};
  const closeModal=()=>{setModal(null);imageRequest.current++;setImageBlob(null);setImageUrl('');setExportError('');};

  return <div className="app-shell">
    <header className="app-header"><a className="brand" href="#" onClick={e=>e.preventDefault()} aria-label="拾页工作台"><span className="brand-mark"><Layers size={25} strokeWidth={1.8}/></span><strong>拾页<span>SHIYE</span></strong></a><div className="header-divider"/><span className="workspace-name">图文工作台 <span className="beta-badge">BETA</span></span><nav className="header-actions"><button className="text-button" aria-label="使用指南" onClick={()=>setModal('help')}><CircleHelp size={17}/><span>使用指南</span></button><button className="secondary small" onClick={()=>{setSelected([]);setModal('drafts');}}><FolderOpen size={17}/>草稿箱 <span className="count-badge">{drafts.length}</span></button><span className="avatar">页</span></nav></header>
    <main className="studio">
      <div className="page-heading"><div><div className="eyebrow">给每一个好想法，一个好看的出口</div><h1>让好内容，<span>自成一页。</span></h1><p>写下你的想法，剩下的交给排版。</p></div><button className="new-project" onClick={()=>{if(addDraft()){setTab('content');notify('新建图文，开始写下你的想法');}}}><Plus size={18}/>新建图文</button></div>
      <div className="mobile-tabs" role="tablist" aria-label="工作台面板">{[['content','内容',FileText],['style','样式',Palette],['preview','预览',Layers]].map(([id,name,Icon])=><button key={String(id)} role="tab" aria-selected={tab===id} className={tab===id?'active':''} onClick={()=>setTab(String(id))}>{typeof Icon!=='string'&&<Icon size={17}/>}<span>{String(name)}</span></button>)}</div>
      <div className="workspace-grid">
        <section className={`panel editor-panel ${tab==='content'?'mobile-active':''}`} aria-label="内容编辑">
          <div className="panel-heading"><h2><FileText size={18}/>内容</h2><button className="text-button purple" onClick={()=>fileInput.current?.click()}><Upload size={15}/>导入</button></div>
          <input ref={fileInput} type="file" accept=".md,.markdown,.txt" multiple hidden onChange={e=>void importFiles(e.target.files)}/>
          <button className="ai-banner" onClick={()=>setModal('ai')}><span className="ai-icon"><Sparkles size={19}/></span><span><strong>让灵感，再向前一步</strong><small>AI 润色 / 从主题生成文案</small></span><ArrowRight size={17}/></button>
          <div className="editor-toolbar" aria-label="文本工具"><button title="添加标题" aria-label="添加标题" onClick={()=>insert('## ')}><Type size={18}/></button><button title="添加粗体" aria-label="添加粗体" onClick={()=>insert('**','**')}><b>B</b></button><button title="添加列表" aria-label="添加列表" onClick={()=>insert('\n- ')}><List size={18}/></button><button title="添加引用" aria-label="添加引用" onClick={()=>insert('\n> ')}><Quote size={17}/></button><span/><button title="插入分页" aria-label="插入分页" onClick={()=>insert('\n\n---\n\n')}><Scissors size={17}/></button><button title="插入符号" aria-label="插入符号" onClick={()=>setSymbolsOpen(!symbolsOpen)}><Smile size={18}/></button><span className="markdown-label">Markdown</span></div>
          {symbolsOpen&&<div className="symbol-picker">{['✨','✦','♡','☁️','🌿','(๑•̀ㅂ•́)و✧','(｡･ω･｡)ﾉ♡'].map(s=><button key={s} onClick={()=>{insert(s);setSymbolsOpen(false);}}>{s}</button>)}</div>}
          <textarea ref={editor} className="source-editor" aria-label="文案编辑器" spellCheck={false} value={source} onChange={e=>{try{validateSource(e.target.value);update({source:e.target.value});}catch(err){notify((err as Error).message);}}} placeholder={'# 一个值得分享的想法\n\n在这里粘贴文字，或用 AI 帮你写。\n\n用 --- 可以另起一页。'}/>
          <div className="editor-status"><span>{source.length.toLocaleString()} / 20,000 字符</span><span className={saveError?'status-error':'saved'}>{saveError?'保存异常':<><CheckCheck size={13}/>已存本机</>}</span></div>
          <button className="mobile-backup" disabled={!source.trim()} onClick={()=>download(new Blob([source],{type:'text/markdown;charset=utf-8'}),`${safeName(documentTitle(source))}.md`)}><ArrowDownToLine size={14}/>备份原文</button>
          <div className="editor-tip"><span><CircleHelp size={14}/>用 <code>---</code> 分页，换行保留你的节奏</span><button onClick={()=>{if(addDraft(SAMPLE,options))notify('示例已打开，原稿保留在草稿箱');}}>试试示例<ArrowUpRightSmall/></button></div>
        </section>
        <section className={`preview-panel ${tab==='preview'?'mobile-active':''}`} aria-label="图文预览">
          <div className="preview-topline"><h2>实时预览 <span className="live-dot"/></h2><span>{cards.length} 张卡片 <span className="subtle-divider">/</span> {options.ratio==='portrait'?'3:4':options.ratio==='square'?'1:1':'9:16'}</span></div>
          <div className="card-stage">{current?<div className="main-card" style={{maxWidth:options.ratio==='story'?278:340}}><CardPreview card={current} options={options}/></div>:<div className="empty-preview"><FilePlus2 size={40}/><h3>{layout.error?'需要调整内容':'好内容，从一句话开始'}</h3><p>{layout.error||'在内容面板写点什么，卡片就会出现在这里。'}</p><button className="secondary" onClick={()=>setTab('content')}>去写文案</button></div>}</div>
          {current&&<><div className="page-navigation"><button className="icon-button" disabled={currentPage===0} aria-label="上一页" onClick={()=>setPage(currentPage-1)}><ArrowLeft size={17}/></button><span>第 <b>{currentPage+1}</b> 页 <span>/ {cards.length}</span></span><button className="icon-button" disabled={currentPage===cards.length-1} aria-label="下一页" onClick={()=>setPage(currentPage+1)}><ArrowRight size={17}/></button></div><div className="filmstrip" aria-label="页面缩略图">{cards.map((card,i)=><button key={i} className={`thumbnail ${currentPage===i?'selected':''}`} aria-label={`查看第 ${i+1} 页`} aria-pressed={currentPage===i} onClick={()=>setPage(i)}><CardPreview card={card} options={options} thumbnail/><span>{String(i+1).padStart(2,'0')}{currentPage===i&&<Check size={10}/>}</span></button>)}</div></>}
          <div className="preview-caption"><ShieldCheck size={14}/>排版在本机完成，草稿自动保存</div>
        </section>
        <section className={`panel style-panel ${tab==='style'?'mobile-active':''}`} aria-label="排版设置">
          <div className="panel-heading"><h2><Settings2 size={18}/>排版样式</h2><span className="tiny-label">属于你的风格</span></div>
          <div className="settings-body"><div className="setting-title"><h3>选择一张好纸</h3><span>4 款精选</span></div><div className="theme-grid">{THEMES.map(t=><button key={t.id} className={`theme-option ${options.theme===t.id?'selected':''}`} onClick={()=>setOptions({theme:t.id,accent:''})} aria-label={`选择${t.name}主题`} aria-pressed={options.theme===t.id}><div className="theme-sample" style={{background:t.paper,color:t.ink}}><span style={{color:t.accent}}>Aa</span><i style={{background:t.wash}}/><i style={{background:t.wash}}/>{options.theme===t.id&&<span className="theme-check"><Check size={12}/></span>}</div><strong>{t.name}</strong><small>{t.description}</small></button>)}</div>
          <div className="setting-section"><label className="setting-title"><h3>画布比例</h3><span>高清 1080px</span></label><div className="ratio-options">{[['portrait','3:4','图文笔记'],['square','1:1','方形卡片'],['story','9:16','竖屏故事']].map(([id,label,hint])=><button key={id} className={options.ratio===id?'selected':''} onClick={()=>setOptions({ratio:id as CardOptions['ratio']})}><span className={`ratio-icon ${id}`}/><b>{label}</b><small>{hint}</small></button>)}</div></div>
          <div className="setting-section"><div className="setting-title"><label htmlFor="font-size">文字大小</label><span>{Math.round(options.fontScale*100)}%</span></div><div className="range-row"><Type size={14}/><input id="font-size" type="range" min="85" max="120" step="5" value={Math.round(options.fontScale*100)} onChange={e=>setOptions({fontScale:Number(e.target.value)/100})}/><Type size={20}/></div></div>
          <div className="setting-section"><div className="setting-title"><h3>强调色</h3><span>标题和重点</span></div><div className="swatches">{[theme.accent,'#527C66','#B16748','#456CB0','#985483'].map((color,i)=><button key={`${i}-${color}`} className={(options.accent||theme.accent)===color?'selected':''} style={{background:color}} aria-label={`强调色 ${color}`} onClick={()=>setOptions({accent:color===theme.accent?'':color})}>{(options.accent||theme.accent)===color&&<Check size={14}/>}</button>)}</div></div>
          <div className="setting-section brand-settings"><div className="setting-title"><h3>留下你的印记</h3><BookOpen size={15}/></div><label className="field-label">账号署名<input value={options.author} maxLength={32} onChange={e=>setOptions({author:e.target.value})} placeholder="例如 @我的笔记"/></label><label className="field-label">栏目名称<input value={options.series} maxLength={40} onChange={e=>setOptions({series:e.target.value})} placeholder="每张卡片顶部的文字"/></label><button className="brand-save" onClick={()=>{try{localStorage.setItem(BRAND_KEY,JSON.stringify(options));notify('品牌样式已记住，下次新建和导入会自动使用');}catch{notify('无法保存品牌样式，请检查浏览器存储。');}}}><CheckCheck size={14}/>记住这套品牌样式</button></div></div>
        </section>
      </div>
      {saveError&&<div className="error-message" role="alert">{saveError}</div>}
      <footer className="export-bar"><div className="export-summary"><span className="export-icon"><Layers size={20}/></span><div><strong>{cards.length?`${cards.length} 张卡片，准备好被看见`:'写下第一句，开始创作'}</strong><span>PNG 高清图片 · 1080 × {HEIGHTS[options.ratio]}</span></div></div><div className="export-actions"><button className="secondary desktop-only" disabled={!source.trim()} onClick={()=>download(new Blob([source],{type:'text/markdown;charset=utf-8'}),`${safeName(documentTitle(source))}.md`)}><FileText size={16}/>备份原文</button><button className="secondary zip-button" disabled={!cards.length||!!busy} onClick={()=>void zip([active])}><Layers size={16}/><span>打包 ZIP</span></button><button className="primary" disabled={!cards.length||!!busy} onClick={openExport}><ArrowDownToLine size={17}/><span>导出图片</span><span className="export-count">{cards.length}</span></button></div></footer>
      <div className="studio-footnote"><span>拾页 · 让表达更轻盈</span><span>本地优先 <i/> 无需登录</span></div>
    </main>
    {toast&&<div className="toast" role="status"><Check size={17}/>{toast}</div>}
    {busy&&<div className="busy-overlay" role="status"><LoaderCircle className="spin" size={24}/>{busy}</div>}
    {modal==='ai'&&<AiPanel source={source} onClose={closeModal} notify={notify} onApply={text=>{try{validateSource(text);if(addDraft(text,options)){closeModal();setTab('preview');notify('已应用新文案，原稿仍在草稿箱');}}catch(e){notify((e as Error).message);}}}/>} 
    {modal==='drafts'&&<Modal title="我的草稿箱" onClose={closeModal} wide><p className="modal-intro">共 {drafts.length} / 20 篇 · 仅保存在当前浏览器，重要内容请导出备份。</p><div className="draft-actions"><button className="secondary" onClick={()=>{setSelected(drafts.filter(d=>d.source.trim()).map(d=>d.id));}}>选择有内容的草稿</button><button className="primary" disabled={!selected.length||!!busy} onClick={()=>void zip(drafts.filter(d=>selected.includes(d.id)))}><Layers size={16}/>批量导出 {selected.length||''}</button></div><div className="draft-list">{drafts.map(d=><div className="draft-row" key={d.id}><input type="checkbox" aria-label={`选择草稿 ${documentTitle(d.source)}`} checked={selected.includes(d.id)} onChange={e=>setSelected(prev=>e.target.checked?[...prev,d.id]:prev.filter(id=>id!==d.id))}/><button className="draft-open" onClick={()=>{setActiveId(d.id);setPage(0);closeModal();}}><strong>{documentTitle(d.source)}</strong><small>{new Date(d.updatedAt).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})} · {d.source.length} 字符 {d.id===activeId?'· 正在编辑':''}</small></button><button className="icon-button" aria-label={`删除草稿 ${documentTitle(d.source)}`} disabled={drafts.length===1} onClick={()=>{if(window.confirm(`删除「${documentTitle(d.source)}」？此操作不可恢复，请先备份。`)){setDrafts(prev=>prev.filter(x=>x.id!==d.id));setSelected(prev=>prev.filter(id=>id!==d.id));if(activeId===d.id)setActiveId(drafts.find(x=>x.id!==d.id)!.id);}}}><Trash2 size={17}/></button></div>)}</div><p className="helper">可用「导入」一次打开多个 .md / .txt，再在这里选中并批量出图。</p></Modal>}
    {modal==='export'&&<Modal title="把作品，带到相册" onClose={closeModal}><p className="modal-intro"><Smartphone size={16}/> iPhone：长按下方图片，选择「存储到照片」（不同 iOS 的文字可能略有不同）。</p><div className="save-image-stage">{imageUrl?<img src={imageUrl} alt={`可保存的第 ${imageIndex+1} 页图片`} className="save-image"/>:<div className="image-loading"><LoaderCircle className="spin"/>正在生成高清图片</div>}</div><div className="page-navigation"><button className="secondary small" disabled={imageIndex===0||imageBusy} onClick={()=>void prepareImage(imageIndex-1)}><ArrowLeft size={15}/>上一张</button><span>{imageIndex+1} / {cards.length}</span><button className="secondary small" disabled={imageIndex===cards.length-1||imageBusy} onClick={()=>void prepareImage(imageIndex+1)}>下一张<ArrowRight size={15}/></button></div><div className="modal-actions"><button className="secondary" disabled={!imageBlob} onClick={()=>imageBlob&&download(imageBlob,`${safeName(documentTitle(source))}-${String(imageIndex+1).padStart(2,'0')}.png`)}><ArrowDownToLine size={16}/>下载此张 PNG</button>{canShare&&<button className="primary" disabled={!imageBlob} onClick={()=>void share()}>系统分享 / 保存</button>}</div>{exportError&&<p className="error-message" role="alert">{exportError}</p>}<p className="helper">整组备份可关闭这里后选择「打包 ZIP」。ZIP 会进入下载或“文件”，不会直接变成相册图片。</p></Modal>}
    {modal==='help'&&<Modal title="第一次用拾页" onClose={closeModal}><div className="guide-steps"><div><span>1</span><section><h3>把文字带进来</h3><p>在「内容」中粘贴文案，或者点「AI 文案助手」。也可以导入 .md 和 .txt 文件。</p></section></div><div><span>2</span><section><h3>选一种表达方式</h3><p>在「样式」选择主题、字号和比例。小红书图文可以先试 3:4，署名替换成你的账号。</p></section></div><div><span>3</span><section><h3>翻页检查，再保存</h3><p>在「预览」逐页看看。点「导出图片」，iPhone 长按图片存到照片，然后切到小红书手动发布。</p></section></div></div><div className="ai-note"><strong>电脑和 iPhone 第一次连接</strong><p>电脑启动拾页并保持运行；两台设备连接同一 Wi-Fi；在 iPhone 的 Safari 打开启动窗口显示的手机地址。</p><a href="/guide.html" target="_blank" rel="noreferrer">打开完整图文操作指南 →</a></div><p className="helper">支持标题、段落、列表、整段粗体、引用、代码和 --- 分页。行内粗体符号会去掉，复杂表格及图片保持文字形式。字体由当前设备提供。</p></Modal>}
  </div>;
}

function ArrowUpRightSmall(){return <ChevronDown size={12} style={{transform:'rotate(-135deg)'}}/>;}

