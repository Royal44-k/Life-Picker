# 拾页 v1.10 外部来源连接 Implementation Plan
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans inline. One fresh whole-branch review at the end.
**Goal:** Connect real owner-authorized Xiaohongshu visible-web references and free open-design external APIs, keeping manual review before publication.
**Architecture:** Reuse existing source store, pairing, metadata mapper and schedules. Normal system Edge with a dedicated local profile replaces the blocked executable adapter. GitHub public REST supplies MIT theme candidates; code is never executed/imported as a layout automatically.
**Tech Stack:** Existing Node, React/TypeScript, Playwright system Edge, Canvas, IndexedDB.
**Spec:** docs/shiye-next-design.md §§6–7 plus current user request to connect external interfaces and request their login when necessary.

## Global Constraints
- Preserve v1.9 and private data. No disabled protection, leakless execution, stealth, proxy/fingerprint change, internal XHS API/signature extraction, login credential export, likes/comments/messages/posts.
- XHS reads at most6 current visible note cards. Search recent filter only claimed after observing selected UI; platform challenge/restriction stops without retry. Failed/ambiguous extraction is not an empty successful collection.
- Profile belongs only to Shiye; shared/private personal browser profiles never accessed. Login is performed by user; concurrent profile ownership gives actionable error.
- Open design discovery fixed GitHub HTTPS endpoints, at most6 results and bounded responses. Each candidate must have actually fetched MIT license; incomplete license stays unavailable. Downloaded code is never executed. Existing14 usable structures distinguished from candidate designs and7 decorative PNG assets.
- Existing source consent/review persists. No paid connector, public hosting or account creation.

## Review Focus
- Queued/cancelled browser launch cannot orphan a context or close an unrelated browser; signal and ownership gates.
- Visible UI schema changes/challenges do not silently become logged-in or zero records.
- Recency/metrics unknown values stay unknown; source times not inferred from collection time.
- GitHub URL/body/identity limits, rate limit/error states and partial results; license discovery not third-party font/photo authorization.
- Existing source editing dirty guards, late results, duplicate candidates and offline pages retain work.

### Task 1: Real external providers
**Files:** server/xhs-web.mjs, server/design-sources.mjs, tests/xhs-web.test.mjs, tests/design-sources.test.mjs; source-assets transient-connect handling only if reproduced.
**Interfaces:** createXhsWebSession({profile,launch}) -> {runtime:{installed,stop,kind},transport:{request(op,input,signal)}}; createDesignSources({root,getStore,fetcher}) -> status/discover/import.
- [x] Tests RED: visible login/challenge/card validation/cancel/one browser; GitHub fixed endpoint/limits/license failure/dedupe/cancel.
- [x] Implement bounded normal-browser adapter with current DOM evidence, no hidden response/cookie/token reads; strictly selected recent filter or explicit refusal.
- [x] Implement no-key GitHub theme discovery and pinned license proof per candidate; pending-only imports.
- [x] Focused/full tests, commit.

### Task 2: Existing application integration
**Files:** server/index.mjs, source-api.mjs, xhs-collection.mjs; src/sources/PersonalXhs.tsx, DesignSources.tsx, Sources.tsx, types.ts; tests/connectors-browser.mjs.
- [x] Tests RED browser-login response and provider routes pairing/origin; implement switch to normal Edge, preserve previous private runtime files without running them.
- [x] Login button opens owner browser, explains shared local session and pending-only metadata. Existing cancel/schedule runs reuse chosen session; window-opening behavior disclosed.
- [x] Add GitHub candidate discovery/import beside existing source collection, label unadapted designs honestly and expose upstream license/source links.
- [x] Mobile mocked login/cancel/stale/dirty/import/dedupe/error and existing source regression, full tests/build, commit.

### Task 3: Live owner workflow and delivery
- [x] User normal login once, preserve local profile. Check current visible feed and one recent keyword search; never send app-private records to source providers.
- [x] Run real fixed asset checks and GitHub discovery, inspect pending records and actual bytes. Failures exact and bounded, no repeated blind retries.
- [x] One fresh independent review and important fixes RED→GREEN; full tests/build and impacted browser/offline.
- [x] Preserve v1.9, release v1.10, merge locally, archive/hash; guide shows connected/remaining conditions and user actions accurately.
