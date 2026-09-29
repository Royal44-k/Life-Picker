import type { BlockKind, CardLayout, CardOptions, MeasureText } from './types.ts';
import { getTheme } from './themes.ts';

const sans = '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';
const serif = '"Songti SC", "SimSun", "Noto Serif CJK SC", serif';
export function font(size: number, weight: number, kind: BlockKind, options: CardOptions): string {
  const family = kind === 'code' ? 'Consolas, Menlo, monospace' : getTheme(options.theme).serif ? serif : sans;
  return `${weight} ${size}px ${family}`;
}
export function createMeasure(options: CardOptions): MeasureText {
  const ctx = document.createElement('canvas').getContext('2d')!;
  return (text, size, weight = 400, kind = 'paragraph') => {
    ctx.font = font(size, weight, kind, options);
    return ctx.measureText(text).width;
  };
}
function fitText(ctx: CanvasRenderingContext2D, text: string, width: number) {
  if (ctx.measureText(text).width <= width) return text;
  const chars = Array.from(text);
  while (chars.length && ctx.measureText(chars.join('') + '…').width > width) chars.pop();
  return chars.join('') + '…';
}
export function drawCard(canvas: HTMLCanvasElement, card: CardLayout, options: CardOptions, pixelWidth = 1080): void {
  canvas.width = pixelWidth; canvas.height = Math.round(card.height * pixelWidth / card.width);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(pixelWidth / card.width,pixelWidth / card.width);
  const theme = getTheme(options.theme);
  const accent = options.accent || theme.accent;
  ctx.fillStyle = theme.paper; ctx.fillRect(0,0,card.width,card.height);
  ctx.textBaseline = 'top';
  ctx.fillStyle = accent; ctx.fillRect(88,83,26,26);
  ctx.font = `500 25px ${sans}`;
  ctx.fillStyle = theme.muted;
  ctx.fillText(fitText(ctx, options.series || '我的图文笔记', 670), 132, 82);
  ctx.textAlign = 'right'; ctx.fillText(String(card.index + 1).padStart(2,'0'), 992, 82); ctx.textAlign = 'left';
  ctx.strokeStyle = theme.wash; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(88,149); ctx.lineTo(992,149); ctx.stroke();
  for (const line of card.lines) {
    if (line.kind === 'quote' || line.kind === 'code') {
      ctx.fillStyle = theme.wash; ctx.fillRect(80,line.y - 3,920,line.lineHeight + 5);
      if (line.kind === 'quote') { ctx.fillStyle=accent;ctx.fillRect(80,line.y - 3,5,line.lineHeight + 5); }
    }
    ctx.font = font(line.size,line.weight,line.kind,options);
    ctx.fillStyle = line.kind === 'heading' || line.emphasis ? accent : theme.ink;
    if (line.marker) { ctx.font = font(30,500,'list',options); ctx.fillStyle=accent;ctx.fillText(line.marker,88,line.y + 12); }
    ctx.font = font(line.size,line.weight,line.kind,options);
    ctx.fillStyle = line.kind === 'heading' || line.emphasis ? accent : theme.ink;
    ctx.fillText(line.text, line.x, line.y + (line.lineHeight - line.size) * .2);
  }
  const footerY = card.height - 86;
  ctx.strokeStyle = theme.wash;ctx.beginPath();ctx.moveTo(88,footerY - 32);ctx.lineTo(992,footerY - 32);ctx.stroke();
  ctx.font = `500 25px ${sans}`; ctx.fillStyle=theme.muted;
  ctx.fillText(fitText(ctx,options.author || '拾页',680),88,footerY);
  ctx.textAlign='right';ctx.fillText(`${String(card.index+1).padStart(2,'0')} / ${String(card.total).padStart(2,'0')}`,992,footerY);ctx.textAlign='left';
}
