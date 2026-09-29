export class ApiError extends Error{status:number;constructor(message:string,status:number){super(message);this.status=status;}}
/** Every control request has a deadline, including a stalled response body. */
export async function videoRequest<T>(path:string,init:RequestInit={},timeoutMs=20_000):Promise<T>{
 const controller=new AbortController(),external=init.signal;let timedOut=false;
 const abort=()=>controller.abort();if(external?.aborted)abort();else external?.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(()=>{timedOut=true;controller.abort();},timeoutMs);
 try{const response=await fetch(path,{...init,signal:controller.signal}),value=await response.json();if(!response.ok)throw new ApiError(value.error||'短片服务暂时不可用，请重试。',response.status);return value as T;}
 catch(e){if(timedOut)throw new Error('连接电脑短片服务超时，请检查网络后重试；任务状态尚未确认。');if(!external?.aborted&&e instanceof TypeError)throw new Error('暂时连接不到电脑短片服务，原相册仍可编辑和下载图文。');if(e instanceof SyntaxError)throw new Error('短片服务返回格式异常，请重新连接后再检查任务。');throw e;}
 finally{clearTimeout(timer);external?.removeEventListener('abort',abort);}
}
