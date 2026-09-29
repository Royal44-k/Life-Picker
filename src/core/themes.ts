import type { ThemeId } from './types.ts';
export interface Theme { id: ThemeId; name: string; description: string; paper: string; ink: string; muted: string; accent: string; wash: string; serif: boolean }
export const THEMES: Theme[] = [
  {id:'lavender',name:'紫序',description:'轻盈 · 知识分享',paper:'#F4F0FC',ink:'#332B49',muted:'#91859E',accent:'#7351C9',wash:'#E7DDF7',serif:false},
  {id:'editorial',name:'纸间',description:'留白 · 深度表达',paper:'#FBF9F3',ink:'#342F2B',muted:'#978C7B',accent:'#A25F3A',wash:'#EFE6D6',serif:true},
  {id:'forest',name:'青野',description:'自然 · 日常灵感',paper:'#EDF3EE',ink:'#293E36',muted:'#7E9585',accent:'#427762',wash:'#D8E6DC',serif:false},
  {id:'midnight',name:'夜航',description:'沉静 · 观点笔记',paper:'#262B42',ink:'#F2F1FA',muted:'#A9ACC2',accent:'#C8BAF4',wash:'#353A54',serif:false},
];
export const getTheme = (id: ThemeId) => THEMES.find(t => t.id === id) || THEMES[0];
