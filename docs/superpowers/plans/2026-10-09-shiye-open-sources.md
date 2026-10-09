# 拾页 v1.8：开放模板与真实参考 Implementation Plan

> Use superpowers:executing-plans inline, one final independent review. Existing full-design approval authorizes execution.

**Goal:** Expand verified open assets and editable theme sets, connect personally authorized read-only XHS references, and offer constrained AI style previews.
**Spec:** docs/shiye-next-design.md §§6–9; docs/research-source-expansion-2026-10-09.md.
**Architecture:** Existing deterministic Canvas/IndexedDB and source review pipeline. Fixed-source MIT theme rules become local data, never remote code. Private Node sidecar, fixed binary digest and loopback bearer. Only allow login/status and list/search, no details/comment reading or mutations. Optional visual AI only returns validated existing IDs/colors, request identity guards stale application.
**Constraints:** Public hosting paused. Keep v1.7 live until all checks pass. No secrets in client, logs or backups. External references pending before publication. No claims of real account connectivity before user login. Preserve original text/photos and locked pages.

## Review Focus
- New palette/template data survives backups and retains every source character/photo across all ratios.
- Upstream author/license/modifications are present without bundling unreviewed fonts/runtime.
- XHS connection cannot become arbitrary URL/method/MCP proxy; tokens never leave private memory/files. Unknown counts/date remain unknown; no source auto-approval.
- Cancel/error/challenge stops subsequent operations. Initial manual success precedes optional daily schedule; offline/closed computer limitations explicit.
- Visual AI proposals cannot rewrite content, change locked pages, or apply after source/settings/photos changed.

### Task 1: 开放素材与可编辑主题组
**Files:** server/source-manifest.mjs; src/core/{types,themes,storage}.ts; src/studio/{templates,template-contracts,open-templates}.ts; src/hub/Hub.tsx; public/licenses; tests/open-templates.test.ts; tests/open-templates-browser.mjs.
**Interfaces:** openTemplateCollection metadata {id,theme,template,author,source,revision,licenseUrl,modifications}; registered themes gaia and white; all existing 12 structures remain valid.
- [x] Download fixed official PNG/source/LICENSE inputs; verify bytes/PNG/dimensions/SHA and record evidence. No unknown hash placeholders. Expected verified4PNGs and2licenses.
- [x] RED tests for new templates/palettes, provenance and 3-ratio exact content/photo/backup roundtrip; implement two locally adapted cover/body styles, preserving original12 identities and no external fonts.
- [x] Expose source/license and editable preview/create in template square; create leaves previous works intact. Expected browser actual PNG + refresh PASS, npm test and build PASS. Commit.

### Task 2: 个人小红书只读参考
**Files:** server/xhs-{transport,runtime,collection}.mjs; server/source-api.mjs,index.mjs; scripts/setup-xhs.mjs; src/sources/PersonalXhs.tsx; types/API; tests/xhs-*.test.mjs and xhs-browser.mjs.
**Interfaces:** Private runtime status/start/stop; adapter only GET login/status, GET login/qrcode, GET feeds/list, POST feeds/search. Service status, login, check, run, cancel, schedule. No arbitrary endpoint, port or token client input.
- [ ] RED contract tests for exact allowlist, safe metadata mapping, unknown metrics/date, auth/origin protection, truncation/malformed responses, pending-only dedupe and error/cancel transition. Strict limited collection of6references, no details or copied body/images.
- [ ] FixedWindowsv2.5.5 installer verifies publisher SHA; runtime verifies before spawn, private cookies+random bearer, loopback, hidden windows/no raw logs, bounds/cancel. State persisted atomically with integrity check; stop on session loss/challenge/unknownerror. Initial manual success before explicit daily09:00 opt-in; same single-flight job for both.
- [ ] UI user starts QR, manual status check, list/keyword preview of pending results, state/error/stop. Normal login needs user, hold actual connectivity claim until tested. Expected unit/API/browser fixtures PASS. Setup actual runtime readiness; ask user to scan only when concrete ready, continue independent work. Commit.

### Task 3: 可控视觉建议与交付
**Files:** server/visual-ai.mjs; server/ai.mjs; src/studio/VisualAI.tsx; Studio.tsx; tests/visual-ai*. Tests/release docs/guide.
**Interfaces:** constrained schema theme/template/accent/reason; never arbitrary code/text rewriting; source/options/pages fingerprint.
- [ ] RED schema, selected-content-only, unsupportedIDs/color, no-op and stale/locked safeguards. Add metered optional DeepSeek proposal and before/after preview. Explicit apply updates styles only; undo/history works. Expected focused tests and browser PASS.
- [ ] Full unit, impacted sources/studio/navigation/storage, build and production offline template/PNG. Independent final review, fix important findings RED→GREEN, preserve v1.7/tag/archive and update local origin.
- [ ] Record actual login/AI/device limitations and continue companion/storyboard explanations and full memory narrative. No final-goal completion claim here.

## Rulings
XHS details are intentionally not exposed: fixed upstream detail handler internally retries and prints token-bearing URLs. List/search metadata supplies bounded inspiration references without copying note bodies/comments; date remains unknown. General transport failure stops rather than retries.
Open layouts adapt Gaia and White theme rules to the existing renderer and local fonts; this is a credited adaptation, not a claim to import arbitrary web templates.
