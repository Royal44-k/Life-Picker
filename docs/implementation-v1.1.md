# 拾页 v1.1 Implementation Plan

> 使用 superpowers:executing-plans 在当前会话按序实施；用户已明确授权执行，阶段间不重复询问。

**Goal:** 先归档 v1，再交付能在 iPhone 上操作的图片素材、智能分镜、单页编辑、图解与一致导出。
**Architecture:** 保留经典编辑器；新增作品模型、素材 IndexedDB、页面编排与 Canvas 场景。编排结果持久化，预览与导出消费同一份作品。独立 AI 分镜接口返回经过校验的页面建议。
**Tech Stack:** React / TypeScript / Vite / Canvas / Node / IndexedDB / fflate / Playwright。
**Spec:** [shiye-next-design.md](./shiye-next-design.md)

## Global Constraints
- 原文不静默删减；20,000 字符、最多 60 页；目标 6/9 页为软约束。
- 导出宽 1080，3:4、1:1、9:16；来源不被作品改写覆盖。
- 旧草稿读取并复制迁移，保留原存储；图片不放 localStorage。
- AI 密钥只在服务端；主动调用、不自动重试；不发送未选历史。
- 原有 AI、Markdown、导出与离线能力保持可用。

## Review Focus
- 多窗口或异步生成不能覆盖更新的作品。
- 缺图、损坏备份、配额失败不能显示保存或导出成功。
- 超长标题／图解标签／竖横混合图片不越界、不静默裁文。
- 单页编辑、锁定、排序的结果必须与 ZIP 一致。
- 新接口与现有接口使用同一来源、连接码、限流与取消校验。

## Tasks
1. [ ] v1 归档：白名单文件生成带 SHA256 的 ZIP；解包逐文件核对；建立本地 Git 基线与标签（工具允许时）；记录测试结果。
2. [ ] 作品引擎：`src/studio/model.ts`、`planner.ts`、`scene.ts`；先写内容守恒、分页目标、硬分页、长标题、图解边界测试，再实现。接口 `planStory(source, options, settings): Story`、`layoutStory(story, measure): Scene[]`；场景持有确切文字、形状和图片槽。
3. [ ] 素材与作品：`src/studio/database.ts`、`media.ts`、`backup.ts`；旧稿复制、事务保存、修订冲突、图片解码及缩放、ZIP 备份/校验恢复。浏览器测试真实 IndexedDB 和恢复。
4. [ ] 手机工作台：`src/studio/Studio.tsx`、`StoryEditor.tsx`、`ScenePreview.tsx`、`studio.css`；来源/分镜/样式/预览、上传图片、结构模板、图解、修改拆分合并排序锁定、独立经典工作台入口。
5. [ ] AI 编排：`server/storyboard.mjs` 与现有 handler 集成；先测试认证、错误引用、截断、取消和请求形状，再实现结构化建议预览/应用。
6. [ ] 一致导出：同一 Scene 绘制为 PNG、ZIP、可长按图片；对照页面编辑与导出；预算及缺失素材检查。
7. [ ] 验证交付：npm test、build、原有浏览器回归、新工作台移动浏览器和下载文件检查；独立审查；更新中文操作指南和变更记录。

每项按“失败测试 → 实现 → 通过 → 记录”推进。纯文档和配置不编写镜像测试。

## 后续顺序与外部条件
v1.2：随心记、小拾、素材复用、回忆图文及视频；v1.3：来源采集、审核与系列创作。独立于本阶段编排引擎，分别建立实施记录。公网部署需可用服务器/域名/账户，先准备可部署产物再处理最终发布；未取得实际环境不声称手机离开电脑后可用。

## Ledger
- 2026-09-29：用户确认按序执行。先完成 v1.1 可验收增量，再沿路线继续；保持同一项目目录以便已有启动脚本和手机入口继续使用。
- Ruling: 不额外创建工作树；当前目录尚未初始化 Git，先归档再在开发分支工作。风险由可校验的 v1 归档和后续提交回滚承担。
