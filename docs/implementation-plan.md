# 拾页 MVP Implementation Plan

**Goal:** 从 Markdown 到手机可用的批量图文导出，提供可检查的本地实现和商业实验方案。
**Architecture:** React 控制编辑器与草稿；纯 TypeScript 解析和分页；同一 Canvas 模型用于预览与导出；客户端本地存储和 ZIP。按用户新增要求，用 Node 本地服务连接 DeepSeek/Ollama。
**Tech Stack:** React、TypeScript、Vite、Canvas 2D、fflate、Lucide、Node test、Playwright 浏览器验证。
**Spec:** [product-spec.md](./product-spec.md)
**Execution:** 本会话直接实现并验证；空工作区无现有 Git 分支。保留本地交付，不创建外部项目或发布。

## Global Constraints
20,000 字符/篇、60 页/篇、20 草稿、10 文件/次、80 KB/文件；预览导出同模型；原文不得静默截断；排版与草稿在本地处理，AI 请求明确告知供应商数据去向。

## Review Focus
中文标点与 emoji；无空格长字符串；超长标题和代码；损坏/超额本地数据；移动浏览器下载与分享不支持时的可用回退。

## Tasks
- [x] 1. 排版引擎与测试：`src/core/markdown.ts`、`layout.ts`、`renderer.ts`、`types.ts`、`tests/core.test.ts`。先写内容守恒、分页和边界测试，观察失败，再实现。接口 `parseMarkdown(source): Block[]`、`layoutDocument(source, options, measure): CardLayout[]`、`drawCard(canvas, card, options)`。
- [x] 2. 工作台：`src/App.tsx`、`src/components/*`、`src/styles.css`。响应式编辑/样式/预览、主题字号比例品牌、页导航、错误与空态；`src/core/storage.ts` 实现校验与持久化并测试。界面依赖 Task 1 的模型。
- [x] 3. 完整导出：`src/core/export.ts`，顺序 PNG、单篇 ZIP、多篇 ZIP、系统分享能力检测、单图可长按回退；文件导入和草稿管理。依赖 Task 1 模型与 Task 2 草稿。
- [x] 4. PWA 与交付：manifest、生产离线缓存、图标、README；构建与浏览器实际操作/下载断言、移动尺寸截图、独立最终代码检查；写 `docs/verification.md` 和样例导出。

## Verification commands
`npm test` → 所有内容守恒、分页、输入边界和存储测试通过。
`npm run build` → TypeScript 与 Vite 生产构建通过。
`npm run test:e2e` → 浏览器导入编辑、草稿恢复、样式、PNG/ZIP 验证与手机视口通过。

## Progress / rulings
- 设计取舍：本地优先 PWA 作为首版假设；不会将桌面浏览器测试称为手机真机验证。
- 产品设计 index 已检查，当前任务为完整产品工作流实现，使用 frontend-design 完成界面，不进入图像提案/克隆工作流。
- 按已授权目标持续实施；本地可逆步骤不增加额外阶段审批。

- Task 5: AI 润色/主题生成、DeepSeek/Ollama/手动模式和颜文字配置完成；真实 DeepSeek HTTP 链路通过。
- Final: 17 核心/接口测试、12 浏览器检查、生产构建及离线检查通过；独立审查修复完成。见 docs/verification.md。
- 个人试用重点：iPhone 13；用户已确认可通过局域网打开。真机保存到照片、商业实验不伪称完成。

