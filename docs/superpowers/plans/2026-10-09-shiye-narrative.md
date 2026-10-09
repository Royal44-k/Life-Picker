# 拾页 v1.9：创作引导与回忆叙事 Implementation Plan

> Use superpowers:executing-plans inline. Existing approved full design authorizes implementation; one final fresh-context review. Public deployment paused.

**Goal:** Complete remaining local software flow: Xiaoshi explains storyboard choices using current text, offers practical prompts, and helps compose a confirmed complete memory narrative used consistently by images/video.
**Spec:** docs/shiye-next-design.md §§3,4,5; docs/shiye-final-scope.md.
**Architecture:** React/TypeScript existing Canvas and IndexedDB. Keep journal facts/photos immutable in narrative operations. Optional strict JSON DeepSeek endpoint with same pairing/cancel/budget ledger. Legacy albums without narrative remain valid. No new cloud service, avatar engine, account or external publishing.

## Review Focus
- Guide statements are grounded in visible page text/role or explicit photo presence, not invented image analysis or assumed hierarchy.
- AI receives only the currently selected album snapshots explicitly disclosed; no hidden journals/photos/tags; no automatic calls.
- Narrative never rewrites/reorders/deletes source items or changes dates/photos. Stale and unreviewed text cannot export; explicit review can rebind to current items.
- Optional narrative survives backups/identity remapping, legacy albums stay compatible, dirty edits and failed writes stay recoverable.
- Images/public copy/video share confirmed narrative, including user-edited opening/transitions/closing.
- Live-model checks use public test material, ordinary metering and bounded requests; iPhone/account/system blocks reported honestly.

### Task 1: 小拾分镜指导
**Files:** src/studio/{page-guide,PageGuide,Studio}; tests/page-guide.test.ts; tests/page-guide-browser.mjs.
**Interfaces:** guideForPage(page,purpose) => reason/evidence/prompts/template; PaperSpirit adapts existing appearance. Explicit user answer appended only to selected unlocked current page, through existing save/history/undo.
- [ ] RED examples for cover/body/ending, ordered steps, numeric evidence, photos, code and empty input; implement bounded local explanations and 2 concrete follow-up questions.
- [ ] Show character, evidence and prompts in page editor, keep optional template action. Answer draft separate from original until explicit apply; preserve on save failure, confirm close with unsaved answer, prevent locks/stale/duplicate application.
- [ ] Mobile browser verifies no model call on opening, selected-only append, save/undo/reload, locked protection and cancel/unsaved draft. Full unit/build. Commit.

### Task 2: 回忆串联文字与编辑确认
**Files:** src/journal/{model,narrative,MemoryNarrative,Memories,backup}; server/{memory-narrative,ai,usage-api,usage-store}; tests/memory-narrative*. package scripts.
**Interfaces:** optional versioned narrative on MemoryAlbum; per-entry transition text plus closing, source basis fingerprint and human-reviewed status; opening stays compatible with existing intro. AI proposal includes opening/transitions/closing and request revision.
- [ ] RED validation for bounded content/schema, exact entry order/IDs, incompatible/old input, immutable dates/text/photos, old backups. Implement local editor and pure apply/export checks.
- [ ] RED server strict selected-snapshot input/no other records or photos, invalid output, cancellation, usage ledger. Optional one-shot DeepSeek with source-based prompt, no invented events/dates/feelings/citations.
- [ ] UI shows each current source beside editable transition, opening/ending, preview then explicit reviewed apply; save album through existing conflict-checked flow. Changes/removal/reorder invalidate review without silently losing draft text. Clear narrative is explicit and undoable.
- [ ] Update public-copy preview and shared memoryToStory for image/video; confirmation gate prevents old narrative use. Backup restore remaps IDs/photos and source basis only when old binding was valid; stale drafts stay stale. Mobile actual PNG, video shared-scene consistency, backup/restore and failed-save regression. Commit.

### Task 3: 验证、归档与本机交付
**Files:** version/package, public guide, docs/release/final-scope, tests/release artifacts.
- [ ] Full unit/build, impacted studio/journal/memory/usage/navigation/storage and production offline; exact shared narrative text survives PNG scenes/video frames. One final independent review; each important fix RED→GREEN plus full unit.
- [ ] Preserve v1.8 tag/archive, fast-forward authorized local branch and update same origin while retaining personal .env/data. Verify source ZIP against Git blobs.
- [ ] Up to three bounded live DeepSeek checks with public synthetic content (storyboard/style/narrative), through app metering; no direct provider bypass or repeated retries. Report actual results/cost entries and limits.
- [ ] Deliver Chinese iPhone steps and accurate final software scope. Public deployment still deferred; real account collection blocked by Windows225, iPhone hardware and two-week market trial are separate user/external acceptance, never fabricated.

## Rulings
Narrative is connective text beside original snapshots, not an automatic rewrite of journal records. It costs more readable pages but preserves personal evidence; short videos may need an explicitly smaller album, with original kept.
Existing approved architecture uses SVG/CSS Xiaoshi and local evidence rules; adding a paid avatar platform would not improve these concrete flows.


## Concrete narrative contract (implementation ruling)
- MemoryAlbum keeps optional intro for old backups and adds optional narrative {version:1,basis:string,connections:[{entryId,text}],closing:string,reviewed:boolean,origin:'manual'|'ai',model?:string}. Connections follow every item ID exactly, including empty strings; max 350 chars each, closing max 800. AI draft {opening,connections,closing}; opening max 800 for model generation, manual editor keeps old 4000-char intro compatibility.
- memoryBasis binds title and complete item snapshots, including dates/order/IDs/photos; narrativeVersion additionally binds opening/current narrative for pending edits. Editing source items reconciles connections by ID but invalidates review. It does not delete the draft.
- The local narrative dialog shows each selected original snapshot beside its transition, editable opening/closing, optional actual page previews, an explicit human-review checkbox, and applies to the album draft. Existing Save and confirm persists before export. No background model requests; whole-album selected text/date/photo counts disclosed, no image pixels/tags/unselected records sent.
- New /api/memory-narrative shares pairing, timeouts and usage accounting (feature memory). Model output must match exact item identity/order, no arbitrary code. Single request only; no retries or invented facts promised. Numeric/date fact certainty still requires user review.
- memoryToStory inserts transitions before the matching unchanged item and adds an optional closing section. Image/public-work/video all reuse this function and reject stale/unreviewed narrative. Legacy albums without narrative produce the existing result.
- Public-copy editor exposes transition/closing text and source changes invalidate its confirmation. Reconfirm after reviewing current content, or explicitly remove transitions/closing (opening stays separately editable). Private original album remains intact.
- Backup restore remaps connection entry IDs and refreshes basis only if the old basis was valid; an already stale draft remains unreviewed. All old packages remain supported. No database schema bump needed.

