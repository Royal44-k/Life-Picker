# 拾页 SHIYE

个人试用版：在 iPhone Safari 将文字 / Markdown 排成卡片，长按存图；支持多篇批量 PNG/ZIP、草稿、主题和 AI 文案。

## 不懂开发也可以开始

1. 在 Windows 打开 `D:\Codex-chat-II`，双击 **启动拾页.cmd**。
2. 保持窗口运行，iPhone 和电脑连同一个 Wi-Fi。
3. 在 iPhone Safari 输入窗口显示的手机地址。当前试用地址是 `http://192.168.5.25:5173`，换网后以窗口为准。
4. **内容 → 样式 → 预览 → 导出图片 → 长按图片 → 存储到照片**。
5. 详细步骤：[iPhone 操作指南](http://localhost:5173/guide.html)（手机将 localhost 换为电脑 IP），源文件在 [public/guide.html](public/guide.html)。

电脑预览：http://localhost:5173 。服务未启动时，链接不会打开。

## AI 文案

- **免费手动**：复制完整提示词到常用聊天工具，再粘贴生成结果；无需密钥。无法自动复制时显示独立提示词框，长按全选复制。
- **DeepSeek**：官方 API 按量收费。支持环境变量或电脑 `.env`；双击 **配置AI.cmd** 填写 `DEEPSEEK_API_KEY`，重启。手机只填启动窗口的 8 位连接码。原文发送给 DeepSeek，仅在点生成时请求。
- **Ollama**：本机模型无 API 费用，但需要用户安装、下载模型并承担本机资源成本。`.env` 的 `OLLAMA_MODEL` 填已安装的模型名。连接仅限 `127.0.0.1:11434`。
- 两种任务：原文润色、按主题生成；可选语气、300/500/800 字、emoji/颜文字密度。确认应用后生成新草稿，原稿不覆盖。
- DeepSeek 当前默认 `deepseek-flash`，来自 [官方价格与模型页](https://api-docs.deepseek.com/quick_start/pricing/)，核查日期 2026-09-28。可通过环境变量调整模型，不在 UI 中硬编码旧价格。

密钥不在前端、localStorage 或输出文件中。启动日志只报告配置状态。`.env` 被 Git 忽略。继承自当前进程的环境变量不一定在双击启动时存在：若重启显示未配置，再用配置脚本填写自己的密钥。

## 开发和验证

环境：Node.js 24+、npm、Windows；浏览器验证脚本使用已安装的 Microsoft Edge。

```powershell
npm ci
npm run dev
# 另一个终端
npm test
npm run build
npm start
npm run test:e2e
```

开发和正式启动默认端口均为 5173，不能同时占用。测试前保持其中一个服务运行。`TEST_URL` 可覆盖浏览器测试地址。`npm run assets` 只用于重新生成应用图标，需要 Edge；图标已经包含，无需日常运行。

`node --use-env-proxy scripts/live-ai-check.mjs` 是一次真实 DeepSeek 调用，会产生 API 用量；不是默认测试的一部分。普通测试使用明确的模拟服务响应。

## 当前实现边界

- 纯本地排版，无账号、支付、服务器草稿同步、自动发布；AI 请求另经 Node 本地代理。
- 标题、段落、列表、整段粗体、引用、代码、`---` 分页；行内强调去掉标记，复杂表格、图片和公式不做完整 Markdown 渲染。符号字形由设备字体决定。
- 单篇 20,000 字符 / 60 页；20 草稿；每次导入 10 文件、每个 80 KB。输出宽 1080，高为 1440 / 1080 / 1920。
- 手机、电脑、不同浏览器和不同域名各自保存草稿。重要内容用 Markdown 备份。多标签页保存冲突时阻止覆盖并提示备份/刷新。
- ZIP 保存到下载/“文件”，不会自动进相册。长按存图、Safari 分享菜单仍需真机验证；用户已确认 iPhone 13 可通过 LAN 打开。
- 当前 HTTP 局域网试用依赖电脑在线；只用于可信私有网络。没有开放公网端口。HTTPS 部署后才能在手机启用完整离线 PWA 和相应系统能力。
- 未进行收费、公开部署、真实用户留存或商业价值验证。实验与继续投入门槛见 [产品方案](docs/product-spec.md)。

## 目录

`src/core/`：解析、测量分页、Canvas 绘制、存储、导出；`src/components/`：预览、弹窗、AI；`server/`：私有本地服务与固定供应商代理；`tests/`：核心、AI、实际浏览器；`docs/`：需求、计划与验证；`artifacts/`：截图、导出文件、测试记录。
