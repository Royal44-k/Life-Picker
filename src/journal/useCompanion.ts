import {useCallback,useEffect,useRef,useState} from 'react';
import {syncCompanion} from './companion-store.ts';
import type {CompanionProfile} from './companion-profile.ts';
export function useCompanion(signal:string|number=0,watchFocus=true){
 const [profile,setProfile]=useState<CompanionProfile|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 const ticket=useRef(0);
 const refresh=useCallback(async()=>{
  const request=++ticket.current;setLoading(true);
  try{const next=await syncCompanion();if(request===ticket.current){setProfile(next);setError('');}return next;}
  catch(e){if(request===ticket.current)setError((e as Error).message);return null;}
  finally{if(request===ticket.current)setLoading(false);}
 },[]);
 useEffect(()=>{void refresh();return()=>{ticket.current++;};},[refresh,signal]);
 useEffect(()=>{if(!watchFocus)return;const focus=()=>{void refresh();};window.addEventListener('focus',focus);return()=>window.removeEventListener('focus',focus);},[refresh,watchFocus]);
 return {profile,error,loading,refresh,setProfile};
}
