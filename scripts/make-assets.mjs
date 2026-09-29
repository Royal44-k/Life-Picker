import { chromium } from 'playwright';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Layers } from 'lucide-react';
import { mkdir } from 'node:fs/promises';
await mkdir('public',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
  const page=await browser.newPage();
  for(const size of [192,512]) {
    await page.setViewportSize({width:size,height:size});
    const icon=renderToStaticMarkup(createElement(Layers,{size:Math.round(size*.57),color:'#ffffff',strokeWidth:1.4}));
    await page.setContent(`<html><body style="margin:0;display:grid;place-items:center;background:#7155d9;width:100vw;height:100vh">${icon}</body></html>`);
    await page.screenshot({path:`public/icon-${size}.png`});
  }
} finally {await browser.close();}
