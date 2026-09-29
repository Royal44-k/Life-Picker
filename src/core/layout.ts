import type { CardOptions, CardLayout, MeasureText } from './types.ts';
import { parseMarkdown, documentTitle } from './markdown.ts';

export const LIMITS = { chars: 20_000, pages: 60, drafts: 20, files: 10, bytes: 80_000 } as const;
export const DEFAULT_OPTIONS: CardOptions = { theme: 'lavender', ratio: 'portrait', fontScale: 1, author: '@拾页笔记', series: '把想法，变成作品', accent: '' };
export const HEIGHTS = { portrait: 1440, square: 1080, story: 1920 } as const;
const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'grapheme' });

export function wrapText(text: string, maxWidth: number, size: number, measure: MeasureText, weight = 400, kind: 'heading' | 'paragraph' | 'list' | 'quote' | 'code' | 'break' = 'paragraph'): string[] {
  const lines: string[] = [];
  for (const part of text.split('\n')) {
    let line = '';
    for (const {segment} of segmenter.segment(part)) {
      if (line && measure(line + segment, size, weight, kind) > maxWidth) {
        // Leave a little width reserve in layout; avoid CJK closing punctuation at line start.
        if (/^[，。！？、；：）》」』】]/u.test(segment) && measure(line + segment, size, weight, kind) <= maxWidth + size) {
          lines.push(line + segment); line = ''; continue;
        }
        lines.push(line); line = segment;
      } else { line += segment; }
    }
    if (line || !part) lines.push(line);
  }
  return lines;
}

export function layoutDocument(source: string, options: CardOptions, measure: MeasureText): CardLayout[] {
  if (source.length > LIMITS.chars) throw new Error('每篇最多 20,000 个字符，请分为多篇。');
  const blocks = parseMarkdown(source);
  if (!blocks.some(b => b.text.trim())) return [];
  const height = HEIGHTS[options.ratio];
  const pages: CardLayout[] = [];
  const title = documentTitle(source);
  let current: CardLayout = { lines: [], width: 1080, height, index: 0, total: 0, title };
  let y = 205;
  const next = () => {
    if (!current.lines.length) return;
    pages.push(current);
    if (pages.length > LIMITS.pages) throw new Error('超过 60 页了，请减少内容或调小字号后再导出。');
    current = { lines: [], width: 1080, height, index: pages.length, total: 0, title };
    y = 205;
  };
  for (const block of blocks) {
    if (block.kind === 'break') { next(); continue; }
    const isH1 = block.kind === 'heading' && block.level === 1;
    const base = isH1 ? 78 : block.kind === 'heading' ? 53 : block.kind === 'code' ? 32 : 40;
    const size = Math.round(base * options.fontScale);
    const lineHeight = Math.ceil(size * (block.kind === 'heading' ? 1.45 : 1.78));
    const weight = block.kind === 'heading' || block.emphasis ? 700 : 400;
    const indent = block.kind === 'list' || block.kind === 'quote' ? 46 : block.kind === 'code' ? 22 : 0;
    const x = 88 + indent;
    const lines = wrapText(block.text, 1080 - x - 88 - size, size, measure, weight, block.kind);
    // Keep a short heading with at least one body line whenever possible.
    if (block.kind === 'heading' && current.lines.length && y + lines.length * lineHeight + 90 > height - 140) next();
    lines.forEach((text, i) => {
      if (y + lineHeight > height - 140) next();
      current.lines.push({text, x, y, size, lineHeight, kind:block.kind, weight, marker: i === 0 ? block.marker : undefined, emphasis:block.emphasis});
      y += lineHeight;
    });
    y += block.kind === 'heading' ? 26 : 30;
  }
  if (current.lines.length) pages.push(current);
  if (pages.length > LIMITS.pages) throw new Error('超过 60 页了，请减少内容或调小字号后再导出。');
  return pages.map((page, index) => ({...page, index, total: pages.length}));
}
