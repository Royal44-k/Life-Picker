export class SourceApiError extends Error{
 status:number;
 constructor(message:string,status:number){super(message);this.status=status;}
}
export async function sourceRequest<T>(path:string,code='',init:RequestInit={},timeoutMs=20_000):Promise<T>{
 const controller=new AbortController(),external=init.signal;let timedOut=false;
 const abort=()=>controller.abort();if(external?.aborted)abort();else external?.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(()=>{timedOut=true;controller.abort();},timeoutMs);
 try{
  const headers=new Headers(init.headers);if(code)headers.set('X-Shiye-Code',code);if(init.body)headers.set('Content-Type','application/json');
  const response=await fetch('/api/sources/'+path,{...init,headers,signal:controller.signal,cache:'no-store'}),value=await response.json();
  if(!response.ok)throw new SourceApiError(typeof value?.error==='string'?value.error:'来源操作失败，请重试。',response.status);
  return value as T;
 }catch(error){
  if(timedOut)throw new Error('连接电脑来源库超时。编辑内容仍保留；请先刷新列表确认是否已保存，再决定重试。');
  if(!external?.aborted&&error instanceof TypeError)throw new Error('暂时连接不到电脑来源库。编辑内容仍保留，请检查 Wi-Fi 与电脑服务。');
  if(error instanceof SyntaxError)throw new Error('来源服务返回格式异常，编辑内容仍保留，请检查电脑服务后重试。');
  throw error;
 }finally{clearTimeout(timer);external?.removeEventListener('abort',abort);}
}
