import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
export function Modal({title,children,onClose,wide=false}:{title:string;children:ReactNode;onClose:()=>void;wide?:boolean}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const el=ref.current;el?.showModal();return()=>el?.close();},[]);
  return <dialog ref={ref} className={`modal ${wide?'modal-wide':''}`} onCancel={e=>{e.preventDefault();onClose();}}>
    <div className="modal-head"><h2>{title}</h2><button className="icon-button" aria-label="关闭弹窗" onClick={onClose}><X size={20}/></button></div>
    {children}
  </dialog>;
}
