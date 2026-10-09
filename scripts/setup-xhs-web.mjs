import{existsSync}from'node:fs';
const ready=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].some(existsSync);
console.log(ready?'已找到系统 Edge。启动拾页，在 我的 → 来源与审核 点击 打开电脑登录窗口。无需下载旧 MCP 辅助程序。':'未找到系统 Edge，请先正常安装 Microsoft Edge，再启动拾页。');if(!ready)process.exitCode=1;
