export type ThemeId = 'lavender' | 'editorial' | 'forest' | 'midnight' | 'gaia' | 'white';
export type Ratio = 'portrait' | 'square' | 'story';
export type BlockKind = 'heading' | 'paragraph' | 'list' | 'quote' | 'code' | 'break';
export interface Block { kind: BlockKind; text: string; level?: number; marker?: string; emphasis?: boolean }
export interface CardOptions { theme: ThemeId; ratio: Ratio; fontScale: number; author: string; series: string; accent: string }
export interface CardLine { text: string; x: number; y: number; size: number; lineHeight: number; kind: BlockKind; weight: number; marker?: string; emphasis?: boolean }
export interface CardLayout { lines: CardLine[]; width: number; height: number; index: number; total: number; title: string }
export interface Draft { id: string; source: string; updatedAt: number; options: CardOptions }
export type MeasureText = (text: string, size: number, weight?: number, kind?: BlockKind) => number;
