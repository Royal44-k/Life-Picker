import {useEffect,useRef,useState} from 'react';
import type {Scene,MediaAsset} from './model.ts';
import type {CardOptions} from '../core/types.ts';
import {drawScene} from './render.ts';
export function ScenePreview({scene,options,small=false,resolveAsset}:{scene:Scene;options:CardOptions;small?:boolean;resolveAsset?:(id:string)=>Promise<MediaAsset|undefined>}){
 const ref=useRef<HTMLCanvasElement>(null);const [error,setError]=useState('');
 useEffect(()=>{let active=true;setError('');const target=document.createElement('canvas');
 void drawScene(target,scene,options,small?160:720,resolveAsset).then(()=>{if(active&&ref.current){const c=ref.current;c.width=target.width;c.height=target.height;c.getContext('2d')!.drawImage(target,0,0);}target.width=0;target.height=0;}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[scene,options,small,resolveAsset]);
 return <div className={'scene-preview '+(small?'scene-small':'')} style={{aspectRatio:'1080 / '+scene.height}}>{error?<div className="scene-error">{error}</div>:<canvas ref={ref} aria-label={'作品第 '+(scene.index+1)+' 页'}/>}</div>;
}
