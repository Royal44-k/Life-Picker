import {openDB,finish} from '../studio/database.ts';
import {validateStory} from '../studio/backup.ts';
import type {Story} from '../studio/model.ts';
import type {JournalEntry} from '../journal/model.ts';
export async function createInspiredStory(value:Story):Promise<void>{
 const story=validateStory(value);if(!story.inspiration)throw new Error('缺少本次选材依据，请重新生成。');
 const db=await openDB(),tx=db.transaction(['stories','journals'],'readwrite'),stories=tx.objectStore('stories');let reason='',remaining=story.inspiration.records.length+1;
 const ready=()=>{if(--remaining===0)stories.add({...story,revision:1});};
 stories.get(story.id).onsuccess=e=>{if((e.target as IDBRequest).result){reason='这篇草稿已经保存，请到工作台查看。';tx.abort();}else ready();};
 for(const ref of story.inspiration.records)tx.objectStore('journals').get(ref.id).onsuccess=e=>{const row=(e.target as IDBRequest).result as JournalEntry|undefined;if(!row||row.trashedAt||row.revision!==ref.revision){reason='所选记录已更新或移除，草稿保留；请重新读取记录并生成。';tx.abort();}else ready();};
 try{await finish(db,tx,()=>undefined);}catch(e){throw new Error(reason||(e as Error).message||'草稿尚未保存，文字仍保留。');}
}
