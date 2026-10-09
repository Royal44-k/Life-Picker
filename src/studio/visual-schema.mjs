export const VISUAL_THEMES=['lavender','editorial','forest','midnight','gaia','white'];
export const VISUAL_TEMPLATES=['plain','headline','quote','reading','essay','checklist','steps','compare','data','timeline','photo-magazine','memo','summary','gaia','white'];
export function parseVisualStyle(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['theme','accent','template','reason'].includes(k))||!VISUAL_THEMES.includes(value.theme)||!VISUAL_TEMPLATES.includes(value.template)||typeof value.accent!=='string'||value.accent!==''&&!/^#[a-f0-9]{6}$/i.test(value.accent)||typeof value.reason!=='string'||!value.reason.trim()||value.reason.length>400)throw new Error('视觉建议格式或样式无效，原作品保留。');
 return {theme:value.theme,accent:value.accent,template:value.template,reason:value.reason.trim()};
}
export function validateVisualRole(template,role){if(!['body','diagram'].includes(role)&&['checklist','steps','compare','data','timeline','summary'].includes(template))throw Error('视觉建议中的结构不适用于当前页面。');}
