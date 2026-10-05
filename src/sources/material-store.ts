import {openDB,finish} from '../studio/database.ts';
import {validateStory} from '../studio/backup.ts';
import type {Story,MediaAsset} from '../studio/model.ts';
import {validateSourceCredit} from './credit.ts';
export async function createMaterialStory(story:Story,asset:MediaAsset):Promise<void>{
 validateStory(story);validateSourceCredit(asset.sourceCredit);
 if(!story.pages.some(p=>p.assetId===asset.id)||story.pages.some(p=>p.assetId&&p.assetId!==asset.id)||asset.blob.size!==asset.bytes)throw new Error('作品与素材不一致，请重新核对。');
 const db=await openDB(),tx=db.transaction(['stories','assets'],'readwrite'),stories=tx.objectStore('stories'),assets=tx.objectStore('assets');let reason='',remaining=3;
 const ready=()=>{if(--remaining===0){stories.add({...story,revision:1});assets.add(asset);}};
 stories.get(story.id).onsuccess=e=>{if((e.target as IDBRequest).result){reason='这篇作品已保存，请到创作工作台查看。';tx.abort();}else ready();};
 assets.get(asset.id).onsuccess=e=>{if((e.target as IDBRequest).result){reason='这张素材已保存，请重新打开后创建。';tx.abort();}else ready();};
 assets.count().onsuccess=e=>{if((e.target as IDBRequest).result>=100){reason='本机照片已达 100 张，请先清理未使用的素材。文字仍保留。';tx.abort();}else ready();};
 try{await finish(db,tx,()=>undefined);}catch(error){throw new Error(reason||(error as Error).message||'保存中断，文字与预览仍保留。');}
}
