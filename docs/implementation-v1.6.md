# 拾页 v1.6：可靠编辑 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement task-by-task. Continue inline under the user's approved order; one final independent review.

**Goal:** 补齐作品历史恢复、来源局部更新、AI 设置一致性，交付可单独验收的第一组增量。
**Architecture:** 沿用 IndexedDB v2，在 meta 中保存有界历史，避免破坏旧版数据库兼容；更新计划以内容块和明确用户选择为依据；AI 设置在请求、校验和输出应用三处一致。
**Tech Stack:** React / TypeScript / Canvas / IndexedDB / Node。
**Spec:** docs/shiye-next-design.md §§3.2–3.6、7、9；2026-10-09 完整方案审查及用户确认的执行顺序。

## Global Constraints
- 保留 v1.5.0 标签、源包、用户素材；公网部署暂缓。
- 每篇原文 20,000 字符、页面最多 60；照片只存引用，不复制二进制进历史。
- 恢复前保存当前状态；冲突、缺图或存储失败不得覆盖当前作品。
- 旧备份可导入；作品 ZIP 保存所选版本及照片，历史列表留本机并如实说明。
- AI 不擅自付费重试，原稿保留；真实手机和真实来源验收单列。

## Review Focus
- 高频输入不得把历史变成最近几十个字符；按两分钟合并普通编辑，结构操作与手动保留独立归档。
- 照片仅被历史引用时不可永久删除；显式清除历史后才可释放引用。
- 来源全部改写、重排和重复段落不能误配；不确定时由用户明确选择。
- 保留手写页和锁定页不能虚标为新原文；过期来源引用必须去除或标明保留旧表达。
- AI 请求期间设置变化、非法设置、模型忽略设置时，不允许覆盖或错误应用。

### Task 1: 持久历史与恢复
**Files:** src/studio/history.ts, database.ts, HistoryPanel.tsx, Studio.tsx; tests/story-history-storage.mjs, story-history-browser.mjs.
**Interfaces:** listStoryHistory(id), checkpointStory(id, expected), restoreStoryHistory(id, entryId, expected), clearStoryHistory(id, expected). saveStory(story, expected, checkpoint=false) atomically saves current + history in meta.
- [x] Write/run storage tests: old revision survives refresh; restoration keeps current as recovery point; stale restore refuses; missing image/failed transaction leave both unchanged; 30-entry bound; typing coalesces; history photo blocks permanent deletion. Expected initially FAIL because APIs absent.
- [x] Implement bounded validated history, transaction integration, image usage protection; add history dialog with preview, manual checkpoint, restore and explicit clear.
- [x] Run storage/browser tests and npm test. Expected PASS; commit Task 1.

### Task 2: 来源局部更新
**Files:** src/studio/source-update.ts, SourceUpdatePanel.tsx, model.ts, backup.ts, planner.ts, Studio.tsx; tests/source-update.test.ts, source-update-browser.mjs.
**Interfaces:** buildSourceUpdate(story, measure) -> plan with base fingerprint and rows; applySourceUpdate(story, plan, choices) -> Story. compiledSource?: string tracks confirmed original, compatible with old stories.
- [x] Write/run tests: unchanged edited pages survive; changed/deleted/inserted paragraphs require resolution; locked pages kept; ambiguous old sources require review; stale plan rejected; no duplicated unchanged content; backup round-trip. Expected FAIL before implementation.
- [x] Implement source-index comparison and per-page choices, preserve immutable photo/layout identities; affected groups display old/new text and include/keep/remove decision with locked retention.
- [x] Add dialog before rebuilding existing story; keep first generation simple. Run focused browser + unit + npm test. Expected PASS; commit Task 2.

### Task 3: AI 设置一致性
**Files:** server/storyboard.mjs, src/studio/StoryboardAI.tsx, src/studio/storyboard-settings.ts; tests/storyboard.test.mjs, storyboard-settings.test.ts, studio-ai-settings-browser.mjs.
**Interfaces:** settings includes cover/toc/ending/target; request fingerprint includes source + options/settings/pages. Server validates options, passes explicit guidance and rejects prohibited roles; missing enabled cover/ending reported as invalid rather than silently discarding source content.
- [x] Write/run tests for no cover/no TOC/no ending, requested ending, invalid enums, settings sent from browser, stale suggestion invalidation. Expected FAIL.
- [x] Implement consistent defaults for legacy API callers, structured guidance and server enforcement; client verifies revision and rejects old results. No secret exposure or automatic repeat calls.
- [x] Run server, browser and full unit suite; build, relevant storage/UI regression; commit Task 3.

### Task 4: 验收与保留
**Files:** docs/release-v1.6.md, docs/shiye-final-scope.md, public/guide-v1.6.html, version labels and cache build.
- [ ] Run full appropriate regression, production build and mobile viewport walkthrough; final independent review; fix important findings with regression tests.
- [ ] Record actual remaining gaps accurately; retain source archive and tag v1.6.0 only on verified state; integrate local runnable release without altering secrets or private content.
- [ ] Continue next plan: purpose-aware pagination and layout diagnostics, then external templates/sources, then companion explanations and memory narrative. Real XHS sign-in and iPhone hardware checks require user participation; never label these verified without evidence.
