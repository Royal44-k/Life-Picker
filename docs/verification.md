# 拾页个人试用版 · 验证记录

日期：2026-09-28。运行环境：Windows / Node 24.20.0 / React / Vite；正式本地服务端口 5173。没有公开部署或收费系统。

## 已有证据

| 项目 | 结果 | 证据 |
|---|---|---|
| 核心 / AI 接口测试 | 17 项通过 | `npm test`；`tests/core.test.ts`、`tests/ai.test.mjs` |
| TypeScript 和生产构建 | 通过 | `npm run build`，含生产离线缓存清单 |
| 实际浏览器流程 | 12 项检查通过，0 JS 异常 | `npm run test:e2e`；`artifacts/browser-results.json` |
| 桌面预览几何 | 卡片在标题下、翻页按钮在卡片下 | `tests/browser.mjs` 中实际 boundingBox 断言 |
| 单图 PNG | PNG 文件，1080 × 1440 | `artifacts/sample-card.png`，已打开检查 emoji/颜文字 |
| 单篇 ZIP | 2 张图片，与测试稿页数一致 | `artifacts/sample-cards.zip` |
| 多篇 ZIP | 3 篇 / 4 张图片 | `artifacts/batch.zip` |
| iPhone 尺寸布局 | 390 × 844，内容/样式/预览及导出弹窗可操作，无页面横向溢出 | `artifacts/iphone13-preview.png`、`iphone13-export.png`；Chromium 模拟，不是真机 Safari |
| 用户真机连接 | 用户确认 iPhone 13 Safari 可以看到拾页 | 本会话用户反馈“能看到拾页” |
| DeepSeek 真实生成 | 成功两次：模型适配器直连 343 字，本地 HTTP 完整链路 357 字 | `artifacts/live-ai-result.json`、`live-ai-http-result.json`；实际官方服务响应，非模拟；只发送合成测试主题 |
| 免费本地 Ollama | 协议适配测试通过 | 固定 localhost 地址且不发送 DeepSeek Key；未安装/下载模型，未真实推理 |
| PWA 离线 | 桌面可信 localhost 上离线编辑、刷新、PNG 导出成功 | `npm run test:pwa`；`artifacts/pwa-results.json` |
| 私有文件隔离 | `.env`、server 源文件不由正式服务静态发布 | PWA 测试中的 HTTP 404 断言 |

## 检查中修复的问题

- Vite 在 Windows 监视正在下载的 PNG 触发 EBUSY：开发服务忽略 artifacts/tests/docs，用户试用使用正式静态服务。
- 高页数全尺寸缩略图占用过多 Canvas 内存：预览降到 720px、缩略图 120px，导出保持 1080px；同一排版坐标模型。
- 第 60 页后遇分隔符误报超限：边界测试覆盖 60 接受 / 61 拒绝。
- 非数字连接码的 UTF-8 字节长度导致比较异常：先限定 8 位数字，测试畸形输入返回 401。
- 复制权限失败覆盖 AI 结果：改为单独提示词框，先观察回归测试失败后修复通过。
- 弹窗内侧边缘误触丢结果：取消背景点击关闭，已有结果关闭时提示确认。
- 多标签页整份草稿互相覆盖：写入前检查已读存储版本；冲突时阻止覆盖，并指引备份再刷新。
- 调整桌面紧凑布局时 flex 高度折叠：增加真实几何断言并修复为不压缩的自动高度。
- DeepSeek 网络连接：正式 Node 启动采用 `--use-env-proxy`，使用环境代理设置；经过授权联网后完整 HTTP 生成链路成功。

独立代码审查指出的三项数据丢失问题已修复，复审没有发现修复范围内的重要回归。

## 尚待验证的部分

1. iPhone 13 真机长按图片存入“照片”、从照片选图发布、具体 iOS 版本下的系统分享菜单。页面访问已由用户确认，不能将其等同于这些操作已通过。
2. 当前局域网 HTTP 不支持手机完整离线 PWA。桌面 localhost 的成功不代表 iPhone HTTP 离线成功；HTTPS 正式部署尚未执行。
3. Ollama 的实际模型质量/速度、较旧 Safari、60 页长文在真机上的内存与性能。
4. 商业价值尚未验证。需求筛选、对照实验、留存与价格假设已写入 product-spec.md，没有虚构付费或留存数据。

## 当前交付

- 可运行源代码、已构建 dist、启停脚本、AI 配置模板、应用内和独立操作指南。
- 当前手机链接：`http://192.168.5.25:5173`，依赖电脑在线且与手机同一 Wi-Fi。IP 随网络可能变化。
- AI 连接码随服务重启变化，以电脑启动日志为准；不在文档保存 API Key。
- `启动拾页.cmd` 可在下次重启。当前环境继承的 API Key 不保证在用户双击启动时也存在；若提示未配置，用自己的 Key 配置 `.env`。
