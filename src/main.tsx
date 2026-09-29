import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import Studio from './studio/Studio.tsx';
import Journal from './journal/Journal.tsx';
import Memories from './journal/Memories.tsx';
import './styles.css';
createRoot(document.getElementById('root')!).render(<StrictMode>{new URLSearchParams(location.search).has('classic') ? <App/> : new URLSearchParams(location.search).get('view')==='journal' ? <Journal/> : new URLSearchParams(location.search).get('view')==='memories' ? <Memories/> : <Studio/>}</StrictMode>);
if (import.meta.env.PROD && 'serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
