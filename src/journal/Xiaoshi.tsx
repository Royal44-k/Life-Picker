import {useEffect,useState} from 'react';
import {MessageCircle,Sparkles,X,Leaf} from 'lucide-react';
import {LOCAL_PROMPTS,contextPrompts} from './companion.ts';
import {APPEARANCES} from './companion-profile.ts';
import type {Appearance,CompanionProfile} from './companion-profile.ts';
import type {JournalEntry} from './model.ts';
import './companion.css';
export function PaperSpirit({mood='idle',small=false,appearance='leaf'}:{mood?:'idle'|'saved'|'quiet'|'thinking';small?:boolean;appearance?:Appearance}){
 const color=appearance==='sky'?'#a7cddd':appearance==='star'?'#c4b6df':'#a8c7a5';
 return <svg data-appearance={appearance} className={'paper-spirit '+(small?'small ':'')+'mood-'+mood} viewBox="0 0 144 160" role="img" aria-label="小拾，纸页精灵">
  <ellipse cx="72" cy="143" rx="36" ry="6" fill="#314633" opacity=".1"/>
  <g className="spirit-body"><path d="M39 22 Q27 22 27 37 L27 117 Q27 131 42 133 L104 129 Q117 128 117 113 L116 48 L91 22 Z" fill="#fff9e9" stroke="#bdbba6" strokeWidth="2"/>
   <path d="M91 22 L91 43 Q91 49 99 48 L116 48" fill="#e9eadb" stroke="#bdbba6" strokeWidth="2" strokeLinejoin="round"/>
   <path d="M43 20 L43 49 L51 43 L60 48 L60 21" fill={color} stroke={appearance==='sky'?'#7098a9':appearance==='star'?'#9986b8':'#799c78'} strokeWidth="1.5" strokeLinejoin="round"/>
   <g className="spirit-face"><ellipse cx="50" cy="81" rx="8" ry="5" fill="#efd1bb"/><ellipse cx="96" cy="81" rx="8" ry="5" fill="#efd1bb"/>
    {mood==='quiet'?<><path d="M55 72 Q60 76 64 72 M81 72 Q85 76 90 72" fill="none" stroke="#48554a" strokeWidth="3" strokeLinecap="round"/><path d="M69 87 Q74 88 78 86" fill="none" stroke="#777f6f" strokeWidth="2" strokeLinecap="round"/></>:<><g className="spirit-eyes"><ellipse cx="60" cy="72" rx="3.4" ry="5" fill="#48554a"/><ellipse cx="85" cy="72" rx="3.4" ry="5" fill="#48554a"/></g><path d="M67 86 Q73 93 80 85" fill="none" stroke="#6d7c65" strokeWidth="2.3" strokeLinecap="round"/></>}
   </g><path className="spirit-hand" d="M29 91 Q15 94 16 84" fill="none" stroke="#bdbba6" strokeWidth="5" strokeLinecap="round"/><path d="M115 91 Q127 96 130 87" fill="none" stroke="#bdbba6" strokeWidth="5" strokeLinecap="round"/>
   <path d="M50 133 L47 141 M95 132 L98 140" stroke="#8e9c81" strokeWidth="4" strokeLinecap="round"/>
   {appearance==='blossom'&&<g aria-hidden="true"><rect x="89" y="102" width="19" height="22" rx="2" fill="#fff0e7" stroke="#dcb69e" strokeDasharray="2 2"/><path d="M99 118v-8m0 5l-4-2m4 0l4-2" fill="none" stroke="#8daa78" strokeWidth="1.5"/><circle cx="98.5" cy="109" r="4" fill="#dfa9a2"/><circle cx="98.5" cy="109" r="1.5" fill="#f5db98"/></g>}
   {appearance==='star'&&<g aria-hidden="true" fill="#d8b978"><path d="M100 106l2 5 5 1-4 4 1 5-4-3-5 3 2-5-4-4 5-1z"/><path d="M51 29l1 3 3 1-3 1-1 3-1-3-3-1 3-1z"/></g>}
   {mood==='saved'&&<g className="spirit-keepsake"><rect x="62" y="101" width="23" height="18" rx="3" fill="#dbe9cc" stroke="#a1b590"/><path d="M67 107 L80 107 M67 112 L77 112" stroke="#93a980" strokeWidth="1.5"/></g>}
  </g>{mood==='saved'&&<g className="spirit-sparks" fill="#c7ac6f"><path d="M20 32l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/><path d="M126 60l2 4 4 2-4 2-2 4-2-4-4-2 4-2z"/></g>}
 </svg>;
}
export function Xiaoshi({reward,count,editing,onPrompt,onChat,entry,profile,profileError,onCreate,onMemory,onDress}:{entry?:JournalEntry|null;profile?:CompanionProfile|null;profileError?:string;onCreate?:()=>void;onMemory?:()=>void;onDress?:()=>void;editing:boolean;reward:{at:number;quiet:boolean;message:string}|null;count:number;onPrompt:(prompt:string)=>void;onChat:()=>void}){
 const [hidden,setHidden]=useState(()=>{try{return localStorage.getItem('shiye:xiaoshi:hidden')==='true';}catch{return false;}}),[open,setOpen]=useState(true),[keyboard,setKeyboard]=useState(false),[focused,setFocused]=useState(false),[mood,setMood]=useState<'idle'|'saved'|'quiet'>('idle');
 const prompts=entry?contextPrompts(entry):LOCAL_PROMPTS;
 const [promptIndex,setPromptIndex]=useState(()=>new Date().getDate()%LOCAL_PROMPTS.length);
 useEffect(()=>{if(editing)setOpen(false);},[editing]);
 useEffect(()=>{if(!reward){setMood('idle');return;}setMood(reward.quiet?'quiet':'saved');setOpen(true);const timer=setTimeout(()=>{setMood('idle');setOpen(false);},5500);return()=>clearTimeout(timer);},[reward?.at]);
 useEffect(()=>{const timer=setTimeout(()=>setOpen(false),7500);return()=>clearTimeout(timer);},[]);
 useEffect(()=>{const resize=()=>setKeyboard(!!visualViewport&&innerHeight-visualViewport.height>150);const focus=()=>{const active=document.activeElement?.matches('textarea,input:not([type=checkbox]):not([type=file]),select')||false;setFocused(active);if(active)setOpen(false);};visualViewport?.addEventListener('resize',resize);document.addEventListener('focusin',focus);document.addEventListener('focusout',focus);return()=>{visualViewport?.removeEventListener('resize',resize);document.removeEventListener('focusin',focus);document.removeEventListener('focusout',focus);};},[]);
 function hide(value:boolean){setHidden(value);try{localStorage.setItem('shiye:xiaoshi:hidden',String(value));}catch{}}
 if(keyboard)return null;
 if(hidden)return <button className="xiaoshi-recall" onClick={()=>{hide(false);setOpen(true);}}><Leaf size={14}/>唤回小拾</button>;
 return <aside className={'xiaoshi-widget '+(focused?'quiet-focus':'')} aria-label="小拾创作伙伴" data-mood={mood}>
  {open&&!focused&&<div className="xiaoshi-bubble"><button aria-label="收起小拾招呼" className="xiaoshi-collapse" onClick={()=>setOpen(false)}><X size={13}/></button><p role="status">{mood==='idle'?prompts[promptIndex%prompts.length]:reward?.message}</p><div className="xiaoshi-actions"><button onClick={()=>{onPrompt(prompts[promptIndex%prompts.length]);setPromptIndex(i=>(i+1)%prompts.length);setOpen(false);}}><Sparkles size={13}/>给点灵感</button><button onClick={onChat}><MessageCircle size={13}/>聊一聊</button></div><div className="xiaoshi-more">{onCreate&&entry&&<button disabled={!entry.text.trim()&&!entry.assetIds.length} onClick={onCreate}>整理这页</button>}{onMemory&&<button onClick={onMemory}>回看日常</button>}</div>{onDress&&<button className="xiaoshi-dress" onClick={onDress}>给小拾换枚书签 →</button>}{profileError&&<p className="xiaoshi-profile-error">纪念暂未更新，记录仍可使用；可到“小拾与成长”重试。</p>}<button className="xiaoshi-hide" onClick={()=>hide(true)}>让小拾安静休息</button></div>}
  <button className="xiaoshi-character" aria-label="和小拾打招呼" onClick={()=>setOpen(!open)}><PaperSpirit mood={mood} appearance={profile?.appearance||'leaf'}/><span>小拾 · {profile?APPEARANCES.find(a=>a.id===profile.appearance)?.name:count>=30?'星光书签':count>=10?'嫩芽书签':'纸页伙伴'}</span></button>
 </aside>;
}
