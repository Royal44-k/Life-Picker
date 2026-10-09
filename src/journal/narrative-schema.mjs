export function parseNarrativeDraft(value,ids){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['opening','connections','closing'].includes(k))||typeof value.opening!=='string'||value.opening.length>4000||typeof value.closing!=='string'||value.closing.length>800)throw Error('串联文字格式无效：开场最多 4,000 字符，结尾最多 800 字符。');
 if(!Array.isArray(ids)||ids.length<1||ids.length>24||!Array.isArray(value.connections)||value.connections.length!==ids.length||value.connections.some((c,i)=>!c||typeof c!=='object'||Object.keys(c).some(k=>!['entryId','text'].includes(k))||c.entryId!==ids[i]||typeof c.text!=='string'||c.text.length>350))throw Error('串联文字与本册片段的顺序或对应关系无效；每段过渡最多 350 字符。');
 return {opening:value.opening,connections:value.connections.map(c=>({entryId:c.entryId,text:c.text})),closing:value.closing};
}
