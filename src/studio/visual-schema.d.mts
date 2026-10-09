import type {ThemeId} from '../core/types.ts';import type {TemplateId} from './templates.ts';
export type VisualStyle={theme:ThemeId;accent:string;template:TemplateId|'plain';reason:string};
export const VISUAL_THEMES:readonly string[];export const VISUAL_TEMPLATES:readonly string[];
export function parseVisualStyle(value:unknown):VisualStyle;
export function validateVisualRole(template:string,role:string):void;
