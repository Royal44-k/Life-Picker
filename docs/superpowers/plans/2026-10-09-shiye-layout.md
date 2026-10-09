# 拾页 v1.7：用途与可检查排版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans inline task-by-task; one independent final review. Existing user approval covers continued implementation, no additional confirmation round.

**Goal:** 使目标页数实际参与安全分页，并按用途推荐结构、提供逐页检查和拆篇出口。
**Architecture:** 保留确定性 Canvas 和原文位置；有界动态规划比较真实可容纳的断点，模板先声明容量约束再逐级回退，检查读取实际排版结果。拆篇创建新作品，原稿保留。
**Tech Stack:** React / TypeScript / Canvas / IndexedDB / Node, no new runtime dependency.
**Spec:** docs/shiye-next-design.md §§3.2–3.6, 7, 9；2026-10-09 审查执行顺序。

## Global Constraints
- 20,000 字符、60 页；6 / 9 是软目标，短文不凑页、超长不删文。显式分页与锁定优先。
- 本文与照片不复制上传；AI 主动触发且先预览，原稿保留；公网部署暂停。
- 正文字号下限 36px（1080 导出），3 种比例均实测，预览与导出同源。
- 旧作品缺省用途视为知识分享，旧 ZIP 仍可读；已编辑页面不因用途切换无提示被替换。
- v1.6 原端口继续可用，待增量通过验收后再更新。

## Review Focus
- 修改目标不能越过 ---，代码内分隔符与字素不可破坏；绑定标题不落成空页。
- 模板回退不能复制/遗漏正文或照片，最终目录按实排续页更新。
- 同一次设置变更的旧 AI / 更新建议不可应用，新增用途也要进入请求和校验。
- 检查定位实际页；缺图与原文未确认仍阻止导出；诊断不能伪称事实或爆款评分。
- 拆篇事务失败、跨窗口冲突或重复点击不得产生半套作品；保留原作与图源。

### Task 1: 目标分页与创作用途
**Files:** src/studio/pagination.ts, planner.ts, purpose.ts, model.ts, backup.ts, Studio.tsx, StoryboardAI.tsx, server/storyboard.mjs; tests/purpose-pagination.test.ts, storyboard.test.mjs, purpose-browser.mjs.
**Interfaces:** paginateSource(source, options, measure?, initialCode?, preferences?:{target:number}) -> ContentPage[]; StorySettings.purpose?: 'knowledge'|'tutorial'|'life'|'product'; purposeAdvice(page,purpose) -> {template?,reason}. Existing callers remain valid.
- [x] Add tests: 8 short sections under target6 versus target9 yield different safe counts; actual characters conserved; hard breaks prevail; 100-word note not padded; long code/emoji, three ratios deterministic. Expected RED.
- [x] Flatten semantic units while retaining region boundaries; cache candidate measurements, max24 units/edge and max60 page states. Minimize existing whitespace/section costs plus quadratic excess over remaining body-page budget; auto budget9 less auxiliary pages. Include actual TOC when enabled, recompute at most once if auto threshold changes.
- [x] Add four purpose options with clear guidance; recommendations only infer steps from explicitly ordered items, timeline from supplied dates, knowledge uses plain prose/checklist, product highlights existing numeric claims without inventing evidence. New plans can use safe suitable layouts; existing hand-edited pages use explicit template application. Validate purpose in backups and AI request/echo/prompt; unset fields retain old behavior.
- [x] Run new unit/API/browser tests, npm test and build. Expected PASS. Commit.

### Task 2: 模板约束与逐页诊断
**Files:** src/studio/template-contracts.ts, diagnostics.ts, LayoutChecks.tsx, scene.ts, templates.ts, template-layout.ts, Studio.tsx, studio.css; tests/layout-diagnostics.test.ts, layout-checks-browser.mjs.
**Interfaces:** templateContract(id) -> supported roles, photo count, min/max font, geometry/capacity, fallback; inspectLayout(story,scenes,assets) -> issues {kind,pageId,sceneIndex,message,action}; Scene optional layout adjustment metadata.
- [x] Test overflowing decorative prose chooses same-role simpler layout before continuation; modest overflow adjusts spacing/font no lower36; long text still continuations; photo preserved; no duplicate text; diagram labels isolated from body-size warnings. Expected RED.
- [x] Declare 12 template capabilities consumed by layout; for prose try requested layout, same-role plain/flexible layout, compact spacing, bounded font adjustment, finally continuation. Keep original data unchanged, explain applied fallback. For semantic diagrams reject unsupported structure to text rather than invent relationships.
- [x] Add inspection panel: density, body font at minimum, missing asset, source mismatch, unconfirmed AI, continuation, target excess; each issue opens page or source/AI action. Offer explicit keep full (auto target), AI refine preview, split into works; recommendations show source-based reasons. Expected focused tests PASS.
- [x] Run full unit/studio/storage and build; commit.

### Task 3: 长文拆篇与交付
**Files:** src/studio/split-works.ts, SplitWorksPanel.tsx, database.ts, Studio.tsx; tests/split-works.test.ts, split-works-storage.mjs, layout-pwa.mjs; release docs and guide.
**Interfaces:** splitWorkPlan(story,maxPages,measure) -> drafts and preview; saveSplitWorks(originalId,expectedRevision,drafts) atomic check + insert.
- [x] Test splits at confirmed page boundaries, respects continuation groups where possible, originals and photo references unchanged, unique IDs/TOC remap, transaction failure creates none, CAS refuses outdated original, no accidental duplicate action. Expected RED.
- [x] Preview titles and actual page counts; 6/9 choice; no content rewriting, create independent works linked to source work and optional current series. Original remains; mixed source/AI copy unchanged. Explain single oversized page before persistence; reject >10 outputs in one action.
- [ ] Run all unit, appropriate storage/browser, build and production offline export, independent whole-branch review, fix important findings with RED→GREEN tests. Expected PASS.
- [ ] Record real limits, preserve tag/archive, update same local origin. Continue next source/template expansion and companion narrative plan. Real iPhone/AI quality remain separate.

## Plan rulings
Existing complete design is approved and user explicitly requests ordered execution. This plan narrows one subsystem for review and delivery; it does not defer the remaining goal. Deterministic recommendations prefer evidence and user selection over automatic semantic assertions.
