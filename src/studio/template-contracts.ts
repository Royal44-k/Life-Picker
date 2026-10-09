import type {Role} from './model.ts';
import type {TemplateId} from './templates.ts';
export interface TemplateContract {
 roles:Role[];photos:0|1;bodyFont:{min:number;max:number};fallback:'plain';
 geometry:(height:number,role:Role)=>{x:number;width:number;top:number;scale:number;large:boolean};
 capacity:(height:number,photo:boolean,role?:Role)=>number;
}
export function templateContract(id?:TemplateId):TemplateContract{
 const semantic=!!id&&['steps','checklist','compare','data','timeline','summary'].includes(id);
 const geometry=(height:number,role:Role)=>{
  let x=88,width=904,top=190,scale=1,large=role==='cover';
  if(id==='headline'){top=height*.27;large=true;width=850;}
  if(id==='quote'){x=168;width=740;top=height*.26;scale=1.12;large=false;}
  if(id==='reading'){x=142;width=796;top=238;large=false;}
  if(id==='essay'){x=155;width=770;top=212;large=false;}
  if(id==='memo'){x=146;width=790;top=206;large=false;}
  if(!id&&role==='cover')top=height*.29;
  return {x,width,top,scale,large};
 };
 return {
  roles:semantic?['body','diagram']:['cover','body','diagram','ending'],photos:semantic?0:1,
  bodyFont:{min:36,max:id==='data'?72:54},fallback:'plain',geometry,
  capacity:(height,photo,role='body')=>height-145-(photo?(id==='photo-magazine'?216:175+Math.min(470,Math.round(height*.31))+42):geometry(height,role).top)
 };
}
