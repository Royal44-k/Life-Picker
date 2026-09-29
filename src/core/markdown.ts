import type { Block } from './types.ts';

// A deliberately small, inert Markdown dialect. Unknown syntax stays visible.
export function plainInline(value: string): string {
  return value.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '[图片：$1] $2')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/\*\*([^*]+)\*\*/g, '$1').replace(/__([^_]+)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1');
}

export function parseMarkdown(source: string): Block[] {
  const result: Block[] = [];
  let paragraph: string[] = [];
  let inCode = false;
  let code: string[] = [];
  const flush = () => {
    if (paragraph.length) {
      const raw = paragraph.join('\n');
      result.push({ kind: 'paragraph', text: plainInline(raw), emphasis: /^\s*\*\*[^*]+\*\*\s*$/.test(raw) });
      paragraph = [];
    }
  };
  for (const rawLine of source.replace(/\r\n?/g, '\n').split('\n')) {
    if (/^\s*```/.test(rawLine)) {
      flush();
      if (inCode) { result.push({ kind: 'code', text: code.join('\n') }); code = []; }
      inCode = !inCode;
      continue;
    }
    if (inCode) { code.push(rawLine); continue; }
    const line = rawLine.trim();
    if (!line) { flush(); continue; }
    if (/^(---+|\*\*\*+|___+)$/.test(line)) { flush(); result.push({ kind: 'break', text: '' }); continue; }
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) { flush(); result.push({ kind: 'heading', level: heading[1].length, text: plainInline(heading[2]) }); continue; }
    const list = /^([-*+] |\d+[.)] )(.+)$/.exec(line);
    if (list) { flush(); result.push({ kind: 'list', marker: /^\d/.test(list[1]) ? list[1].trim() : '•', text: plainInline(list[2]) }); continue; }
    if (/^>\s?/.test(line)) { flush(); result.push({ kind: 'quote', text: plainInline(line.replace(/^>\s?/, '')) }); continue; }
    paragraph.push(line);
  }
  flush();
  if (inCode && code.length) result.push({ kind: 'code', text: code.join('\n') });
  return result;
}

export function documentTitle(source: string): string {
  return parseMarkdown(source).find(b => b.text.trim())?.text.split('\n')[0].slice(0, 100) || '未命名图文';
}
