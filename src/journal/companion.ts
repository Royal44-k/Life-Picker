import type {JournalEntry} from './model.ts';
export const LOCAL_PROMPTS=['今天有没有一个想留下的瞬间？','当时，你先注意到了哪个细节？','如果讲给朋友听，你会从哪句话开始？','这次经历，让你改变了哪一个小想法？','照片以外，还有哪种声音或感受值得记下？'];
export function saveReward(entry:JournalEntry|null){if(!entry?.revision||!entry.text.trim()&&!entry.assetIds.length)return null;const quiet=/难过|失去|去世|崩溃|焦虑|低落|分手|难受|哭|痛苦|疲惫|告别/.test(entry.text);return {at:Date.now(),quiet,message:quiet?'这一页，我轻轻收好了。':'又留住了一点属于你的细节。'};}
