import { useEffect, useRef } from 'react';
import type { CardLayout, CardOptions } from '../core/types.ts';
import { drawCard } from '../core/renderer.ts';
export function CardPreview({card,options,thumbnail=false}:{card:CardLayout;options:CardOptions;thumbnail?:boolean}) {
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{if(ref.current)drawCard(ref.current,card,options,thumbnail?120:720);},[card,options,thumbnail]);
  return <canvas ref={ref} className={thumbnail?'card-canvas thumbnail-canvas':'card-canvas'} role="img" aria-label={`第 ${card.index+1} 页：${card.lines.map(l=>l.text).join(' ')}`} />;
}
