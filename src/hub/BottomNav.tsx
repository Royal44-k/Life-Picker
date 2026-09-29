import {useEffect,useState} from 'react';
import {House,LayoutTemplate,PenLine,UserRound} from 'lucide-react';
export type MainView='home'|'templates'|'studio'|'mine';
const items=[{id:'home',name:'首页',href:'/',Icon:House},{id:'templates',name:'模板',href:'/?view=templates',Icon:LayoutTemplate},{id:'studio',name:'创作',href:'/?view=studio',Icon:PenLine},{id:'mine',name:'我的',href:'/?view=mine',Icon:UserRound}] as const;
export function BottomNav({active,onNavigate,disabled=false}:{active:MainView;onNavigate?:(href:string)=>void|Promise<void>;disabled?:boolean}){
 const [keyboard,setKeyboard]=useState(false),[leaving,setLeaving]=useState(false);
 useEffect(()=>{const update=()=>setKeyboard(!!window.visualViewport&&innerHeight-window.visualViewport.height>150);update();window.visualViewport?.addEventListener('resize',update);return()=>window.visualViewport?.removeEventListener('resize',update);},[]);
 return <nav className="main-nav" aria-label="主要入口" hidden={keyboard}>{items.map(({id,name,href,Icon})=><a key={id} href={href} aria-current={id===active?'page':undefined} aria-disabled={disabled||leaving} onClick={e=>{if(disabled||leaving){e.preventDefault();return;}if(onNavigate){e.preventDefault();setLeaving(true);void Promise.resolve(onNavigate(href)).finally(()=>setLeaving(false));}}}><Icon size={21}/><span>{name}</span></a>)}</nav>;
}
