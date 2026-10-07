import type {JournalEntry} from './model.ts';
export const LOCAL_PROMPTS=['今天有没有一个想留下的瞬间？','当时，你先注意到了哪个细节？','如果讲给朋友听，你会从哪句话开始？','这次经历，让你改变了哪一个小想法？','照片以外，还有哪种声音或感受值得记下？'];
export function saveReward(entry:JournalEntry|null){if(!entry?.revision||!entry.text.trim()&&!entry.assetIds.length)return null;const quiet=/难过|失去|去世|崩溃|焦虑|低落|分手|难受|哭|痛苦|疲惫|告别/.test(entry.text);return {at:Date.now(),quiet,message:quiet?'这一页，我轻轻收好了。':'又留住了一点属于你的细节。'};}

export function contextPrompts(entry:JournalEntry):string[]{
 if(/难过|失去|去世|崩溃|焦虑|低落|分手|难受|哭|痛苦|疲惫|告别/.test(entry.text))return ['想先记下一句心情，还是只留一张照片？','这一刻，有没有一个让你稍微安定的细节？','如果今天不想展开，要不要就先收到这里？'];
 if(entry.assetIds.length&&!entry.text.trim())return ['这张照片里，你最想记住哪个细节？','拍下它的那一刻，你心里想到了什么？','照片没有拍到的声音或感受，是什么？'];
 if(/学会|步骤|尝试|练习|完成/.test(entry.text))return ['这次尝试，最难或最意外的一步是什么？','如果讲给第一次尝试的人，你会先提醒什么？','下次再来一次，你想保留哪个做法？'];
 return ['这段经历里，有没有一句当时的原话？','你最想把这段经历讲给谁，为什么？','现在回头看，有哪个小想法发生了变化？'];
}
