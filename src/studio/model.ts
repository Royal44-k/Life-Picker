import type {InspirationOrigin} from '../sources/inspiration-model.ts';
import type {SourceCredit} from '../sources/credit.ts';
import type {TemplateId} from './templates.ts';
import type { CardOptions, CardLine } from '../core/types.ts';
export type Diagram = 'none'|'pyramid'|'steps'|'compare'|'timeline'|'checklist';
export type Role = 'cover'|'toc'|'body'|'diagram'|'ending';
export interface StorySettings { target:0|6|9; cover:boolean; ending:'none'|'question'|'follow'|'collect'; toc?:'auto'|'yes'|'no' }
export interface TocEntry {label:string;targetPageId:string;occurrence?:number}
export interface StoryPage { template?:TemplateId; tocEntries?:TocEntry[]; sourceVersion?:string; sourceRanges?:{blockId:string;start:number;end:number}[]; codeContinuation?:boolean; id:string; role:Role; source:string; sourceIds:string[]; locked:boolean; diagram:Diagram; assetId?:string; fit:'cover'|'contain'; focusX:number; focusY:number; layout:'plain'|'quote'|'photo'; }
export interface Story { inspiration?:InspirationOrigin; version:2; id:string; revision:number; source:string; sourceHash:string; title:string; options:CardOptions; settings:StorySettings; pages:StoryPage[]; warnings:string[]; updatedAt:number; }
export interface Shape { kind:'rect'|'polygon'|'line'; x:number; y:number; w:number; h:number; color:'accent'|'wash'|'ink'; points?:number[][]; }
export type SceneLine=CardLine & {headingAnchor?:{label:string;level:number}};
export interface Scene { textFrame?:{x:number;width:number}; id:string; pageId?:string; lines:SceneLine[]; shapes:Shape[]; width:number; height:number; index:number; total:number; role:Role; warnings:string[]; assetId?:string; photo?:{x:number;y:number;w:number;h:number;fit:'cover'|'contain';focusX:number;focusY:number}; }
export interface MediaAsset { sourceCredit?:SourceCredit; trashedAt?:number; id:string; name:string; type:string; width:number; height:number; bytes:number; blob:Blob; createdAt:number; }
export const DEFAULT_SETTINGS:StorySettings={target:0,cover:true,ending:'none',toc:'auto'};
export const ROLE_NAMES:Record<Role,string>={cover:'封面',toc:'目录',body:'观点',diagram:'图解',ending:'封底'};
export const DIAGRAM_NAMES:Record<Diagram,string>={none:'文字卡',pyramid:'层级金字塔',steps:'步骤流',compare:'对比卡',timeline:'时间线',checklist:'行动清单'};
