import type { Draft, CardOptions } from './types.ts';
import { LIMITS } from './layout.ts';

export const STORAGE_KEY = 'shiye:drafts:v1';
export const BRAND_KEY = 'shiye:brand:v1';
export const ACTIVE_KEY = 'shiye:active:v1';
export function validateSource(source: string): string {
  if (source.length > LIMITS.chars) throw new Error('每篇最多 20,000 个字符，请拆分后导入。');
  return source;
}
export function isOptions(value: unknown): value is CardOptions {
  if (!value || typeof value !== 'object') return false;
  const v = value as CardOptions;
  return ['lavender','editorial','forest','midnight','gaia','white'].includes(v.theme) && ['portrait','square','story'].includes(v.ratio)
    && typeof v.fontScale === 'number' && v.fontScale >= .85 && v.fontScale <= 1.2
    && typeof v.author === 'string' && v.author.length <= 32 && typeof v.series === 'string' && v.series.length <= 40
    && typeof v.accent === 'string' && (v.accent === '' || /^#[\da-f]{6}$/i.test(v.accent));
}
export function decodeDrafts(raw: string | null): Draft[] {
  try {
    const data = JSON.parse(raw || 'null');
    if (data?.version !== 1 || !Array.isArray(data.drafts)) return [];
    return data.drafts.filter((d: Draft) => typeof d?.id === 'string' && typeof d?.source === 'string' && d.source.length <= LIMITS.chars && Number.isFinite(d.updatedAt) && isOptions(d.options)).slice(0,LIMITS.drafts);
  } catch { return []; }
}
export function loadDrafts(): Draft[] { try { return decodeDrafts(localStorage.getItem(STORAGE_KEY)); } catch { return []; } }
export function persistDrafts(drafts: Draft[], activeId: string, expected: string | null): string {
  if(localStorage.getItem(STORAGE_KEY)!==expected)throw new Error('其他窗口更新了草稿。当前改动尚未保存，请先备份原文，再刷新页面。');
  const next=JSON.stringify({version:1,drafts});
  localStorage.setItem(STORAGE_KEY, next);
  localStorage.setItem(ACTIVE_KEY,activeId);
  return next;
}
export function makeId(): string { return globalThis.crypto?.randomUUID?.() || `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
