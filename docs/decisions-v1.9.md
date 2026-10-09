# v1.6～v1.9 执行决定与验收记录

完整实施取舍、代价与验证记录，按实际执行顺序保留。历史阶段的待完成项以最后阶段及shiye-final-scope.md为准。无未处理Minor；外部条件仍单列。源码ZIP校验结果独立存于releases，避免归档包含自身摘要。

## implementation-v1.6

# SDD ledger — plan: docs/implementation-v1.6.md

Baseline: v1.5.0 / 2e23e9b; npm test 164/164 PASS (artifacts/baseline.log).
Ruling: Continue the existing approved design and execution order without another approval round — user's latest instruction explicitly requests ordered execution; implementation details remain within that scope.
Ruling: Native worktree creation failed before creating anything due to Git ownership; created ignored project-local worktree via git -c safe.directory. Original branch/runtime retained.
Pre-flight: Task 1 saveStory/checkpoint API consumed by Task 2 update actions and Task 3 AI application; optional checkpoint parameter preserves callers. meta history avoids DB schema upgrade and old runtime incompatibility.
Pre-flight: Task 2 optional compiledSource must be validated and backed up; Task 3 AI pages must not pretend manually retained source mappings are current.
Ruling: Keep last 30 checkpoints per work; ordinary saves within two minutes coalesce, structural/manual/restore actions archive separately. Cost: older checkpoints expire and are not automatically included in work ZIP; UI explains and permits backing up an individual historic version.

Task 1: in progress.
Task 1: complete (commits 2e23e9b..fe6c061, tests: npm.cmd test → ℹ duration_ms 4987.8474)
Task 2: complete (commits fe6c061..a9be721, tests: npm.cmd test → ℹ duration_ms 5132.8281)

Task 2: browser source-update flow PASS; full suite 171/171; explicit page breaks regression observed RED then GREEN. Preserved manual page order.
Ruling: source update groups pages connected by source blocks; overlapping/ambiguous blocks are reviewed together — avoids pretending a partial fragment maps uniquely; cost: some edits need group-level rather than individual-page confirmation.
Ruling: AI closing page uses existing deterministic question/collect/follow copy and supplied author after model role validation — prevents invented account/benefit CTAs; cost: closing copy is less varied but remains editable.
Verification: one legacy usage-api run failed before reaching the handler because Windows supplied a fetch-blocked ephemeral port (bad port). Isolated usage-api 5/5 and full suite 176/176 passed on re-run; no product code was changed to mask this fixture issue.
Task 3: complete (commits a9be721..8ee4084, tests: npm.cmd test → ℹ duration_ms 4968.1804)

Review: two Important findings verified RED then GREEN: author/series typing coalesces; interleaved continuation pages preserve global slots for unchanged/keep/append. Whole unit suite 179/179 PASS after fixes; production build PASS (65 cached assets).
Ruling: local integration on known base codex/local-final is covered by explicit ordered development and usable delivery authorization; no remote push or public deployment. Keep isolated worktree for next increment.
Verification: first E2E stopped at test-process ffprobe ENOENT; server rendered correctly. Supplied FFMPEG_PATH/FFPROBE_PATH to test process and rerun full E2E; no product workaround.
Verification: corrected full E2E PASS including real MP4 and all new flows; production PWA 10 scripts PASS including offline history/source/restore/PNG. Previous full storage 9 scripts PASS.
Integration: fast-forwarded codex/local-final to 0213bbb; main unit suite179/179 PASS; v1.6.0 tag/source ZIP278 files individually verified; SHA256 3abf59f25db613f6d588f5ddc5e2975603becf953b8d1aee132939b5b2192265. Main port5173 live production offline history/restore/PNG PASS. Original dist copied to artifacts/v1.5-live-dist-20261009. No secret or private data changes. Next subsystem plan docs/superpowers/plans/2026-10-09-shiye-layout.md.
Task 4: complete (commits 42f29e4..0213bbb, tests: npm.cmd test → ℹ duration_ms 5359.7235)


## 2026-10-09-shiye-layout

# SDD ledger — plan: docs/superpowers/plans/2026-10-09-shiye-layout.md

Ruling: Continue inline under existing approved full design; user requested ordered execution. No extra approval round.
Pre-flight: Task1 adds optional purpose and pagination budget; Task2 consumes pages/scenes and must not rewrite source data. Task3 consumes confirmed pages and diagnostics; split persistence must use atomic story revision checks.
Ruling: Keep v1.6 live at5173 while developing v1.7 in existing isolated worktree; no private config copied.
Ruling: purpose recommendations are explicit per-page actions even for new works — avoids changing the user-selected template or inferred semantics without review. AI purpose changes enter request identity and server validation. Costs one extra tap to apply a structure.
Task1 verification: new pagination assertions observed8vs6 RED then GREEN; purpose validation/recommendations/AI echo observedRED thenGREEN. Fullunit185/185 PASS, buildPASS, mobile purposebrowserPASS and screenshot inspected. Original 5173 v1.6 remains untouched.
Task 1: complete (commits 0213bbb..0418d9d, tests: npm.cmd test → ℹ duration_ms 5625.0034)
Ruling: migration fixture formerly assumed100shortheadings require100pages; target-aware pagination now safely fits them in17pages. Preserve compressible-case content check and use100explicitbreaks for genuine oversize refusal. Product migration path unchanged. Cost: deliberate updated expected behavior, not masking missing data.
Task2 verification: template overflow RED→GREEN; unit191/191, build,6studio browser scripts,9storage scripts allPASS. New checks browserPASS including actualPNG, persistedAI confirmation, same-page navigation and source guard; mobile screenshot inspected. One browser locator initially targeted hidden background warning; scoped to active dialog.
Ruling: split action is connected in Task3 alongside atomic persistence, avoiding a clickable incomplete workflow in Task2.
Task 2: complete (commits 0418d9d..22f84ec, tests: npm.cmd test → ℹ duration_ms 5876.6282)
Task3 Ruling: split confirmed pages as independent works, keep photos/crops/locks/order and optional series. Do not copy prior publication statistics. Generated whole-work TOC is omitted from short parts with explicit preview notice; handwritten guides remain. Re-index each part against its own exact text (code fence wrappers only when needed), keeping original untouched.
Task3 implementation: split pure tests RED→GREEN; realIndexedDB atomic/CAS/missingPhoto/doubleSubmit RED→GREEN; mobile preview/failure/retry/original/PNG PASS. Fullunit195/195 andbuild66assets PASS. New production offline purpose/checks/split/original/reload/download/guide PASS. Review and full final regression remain.

Final review: fresh reviewer checked 0213bbb..98e1d34; no actionable issues. Independent24/24 plus3-ratio boundary reproduction PASS. FullE2E and11productionPWA scripts PASS. No deferred minors.
Final: Ruling: external templates/XHS/companion/memory remain the next increment under the active goal; v1.7 is not final — costs delayed availability, no fabricated completion.
Final: Ruling: public hosting remains paused per user; local use needs computer and same network — costs availability outside Wi-Fi.
Final: Ruling: real AI quality and iPhone hardware not established by mocked/Edge tests; remain explicit final acceptance items — costs possible device-specific defects.
Final: Ruling: fullE2E/PWA reviewed by executor logs rather than rerun by reviewer; both completed with exit0 — avoids duplicate cost, independent reviewer covers logic instead.
Final: Ruling: locally integrate the verified increment under ongoing user authorization; retain branch/worktree for remaining goal and all prior archives — no new approval gate for reversible delivery.
Task 3: complete (commits 22f84ec..29305af, tests: npm.cmd test → ℹ duration_ms 6090.5505)


## 2026-10-09-shiye-open-sources

# SDD ledger — plan: docs/superpowers/plans/2026-10-09-shiye-open-sources.md

Ruling: approved full design covers these additions, continue inline without another approval round.
Pre-flight: Task1 registers templates/themes used by Task3 validated enums; Task2 independent source pending pipeline must not upload journals.
Ruling: no XHS detail endpoint because upstream retries/logs tokens; only title/link/author/counter metadata, date unknown — costs richer automatic summaries, user supplies their own observation.
Ruling: credited Gaia/White local adaptations keep fonts/runtime local — costs pixel identity with upstream slides, necessary for mobile Canvas.

Task1 verification: 4 PNG signatures/CRC/inflate/dimensions and SHA verified, white-background contact sheet inspected; fixed2MIT sources/licenses read. Open-theme tests observed missing-module RED then2/2GREEN, fullunit197/197 PASS, build68assets PASS, online/offline both theme browser exactpage2PNG PASS.
Ruling: Keep TEMPLATES as original12 and expose ALL_TEMPLATES for14available structures; old identities/examples stable — costs one extra registry name, avoids reclassifying original assets.
Ruling: new browser test named a nonexistent next-page button; changed to existing export page selector — product interaction unchanged.
Task 1: complete (commits 29305af..4c9da9c, tests: npm.cmd test → ℹ duration_ms 5497.6371)

Task2 verification so far: transport/runtime/API/collection initialRED→GREEN9tests; concurrent login/run conflict reproduced then fixedRED→GREEN. Fullunit206/206 before conflict addition,4source+6studio browser scripts PASS; mobileQRfixture/keyword/pending/schedule/challenge/unsavededitor/cancel PASS. Realbinary Node download timedout; system HTTPS fallback samepublisherURL succeeded, pinnedSHA verified. Actualruntime preflight in progress, no login yet.
Ruling: system HTTPS downloader is a bounded fallback to the same official asset, digest remains mandatory — avoids unreliable Node network path; no mirrors or verification bypass.

Ruling: actual fixed runtime preflight did not reach loopback readiness within150seconds despite correct executable digest; no account request/login succeeded. Source preparation is shipped as unverified, not connected. Research browser dependency separately and continue independent Task3 — costs real-source availability until preparation and user login complete.
Ruling: Windows child termination is awaited before a new runtime starts; prevents overlap after cancellation. Native installer fallback remains same fixed URL/digest and never prints private session output.
Task 2: complete (commits 4c9da9c..0a638c8, tests: npm.cmd test → ℹ duration_ms 5542.586)

Task3 verification: schema/application missing-module RED → 4 focused GREEN; all6usage routes record tokens, full unit212/212PASS and build69assets PASS. Mobile actual previews/apply/undo/reload/no-op/cancel/IDB-abort PASS. Browser cache test RED→GREEN; Windows225 safe classified RED→GREEN.
Ruling: add undo in style tab after observed missing entry — user can immediately undo a visual application — cost is another entry for existing action.
Ruling: browser ZIP acquired at exact fixed publisher URL,189954738bytes, SHA verified; preserve complete files in app-owned cache and set LOCALAPPDATA only for child — no global environment or browser fingerprint/proxy changes — cost is separate disk footprint.
Ruling: real loopback startup works, but status request hits Windows225 for leakless helper; stop and retain manual source flow, never disable protection — costs real login/collection availability on this computer until a trusted compatible upstream path exists.

Final: fixed pending-save unload protection — open-template-save-browser RED→GREEN; fixed cancelled dedupe read cannot start new write — xhs-collection fifth test RED→GREEN, suite213/213. One final review,0Critical/2Important fixed/0Minor. No re-review.
Final: Ruling: reviewer declined real login/live AI/iPhone hardware — external actual evidence remains separately required, not claimed by unit/browser tests — cost is incomplete real-environment acceptance until those conditions can be exercised.
Final: Ruling: old navigation fixture expected12 while 2newthemes yield14; xhs busy label now reflects already-prepared browser — synchronize test assumptions, product intent unchanged. E2E ffprobe/log env corrected and remaining suites continued, no hidden failed checks.
Final verification: full E2E all components passed across initial+remaining logs;9storage and11productionPWA PASS;4open-source browser workflows PASS; production build69assets PASS.
Task 3: complete (commits 0a638c8..ddb772d, tests: npm.cmd test → ℹ duration_ms 6921.0808)


## 2026-10-09-shiye-narrative

# SDD ledger — plan: docs/superpowers/plans/2026-10-09-shiye-narrative.md
Pre-flight: guide uses existing purposeAdvice and explicit local answers; narrative must keep optional old-album compatibility and bind before export/identity restore. v1.8 preserved at ddb772d, public deployment paused.
Ruling: use a separate guided-answer modal so opening another editor cannot discard an answer silently — costs one extra click, preserves clear confirmation and close guard.
Task1 verification: missing-module RED → 2/2 pure guide/append tests GREEN; mobile evidence/no-AI/explicit answer/dirty close/undo/lock/real IDB abort/retry/reload PASS; purpose browser and all6studio browsers PASS. Fullunit215/215 and build68assets PASS.
Ruling: one unit run hit fetch 'bad port' from an OS-assigned local test listener; no product change, rerun with freshly assigned ports yielded215/215 — initial failure preserved in artifacts, cost is test-port nondeterminism if it recurs.
Ruling: code/automatic-directory pages show guidance but cannot append from the answer dialog — avoids inserting prose inside an open code continuation or generated TOC, cost is manual editing outside the code block.
Task 1: complete (commits ddb772d..438d560, tests: npm.cmd test → ℹ duration_ms 6971.7046)

Task2 verification: new model/schema/provider modules observed missing-module RED then5focused GREEN; all7metered routes tested. Fullunit220/220, build67assets. Mobile complete narrative selected-only/no-auto-AI, review preview, actual IDB abort/retry, reload, exact page PNG and all video frame hashes, source reorder/reconfirm, clear/undo, backup, public copy isolation and cancellation PASS. Two old memory, three journal/chat and usage regression scripts PASS; production offline narrative edit/persistence/actual PNG ZIP/backup PASS.
Ruling: screenshot exposed missing independent scene-preview CSS on Memories; real canvas-width regression RED→GREEN and preview CSS scoped to memory page — cost is a small shared-style duplication until styles are extracted.
Ruling: narrative is additive and requires review again after source changes; public copy separately exposes transitions/closing — costs extra confirmation/pages but preserves original selected snapshots.
Task 2: complete (commits 438d560..62eef3d, tests: npm.cmd test → ℹ duration_ms 5437.8354)

Task3 verification: final68asset build PASS; full12productionPWA scripts PASS;2navigation/6studio/9storage/pageguide/narrative/4video browsers PASS, including real H264/AAC MP4. Earlier2memory/3journal/usage flows also PASS. Final independent review running, actual metered model check pending main integration.

Final review: fresh v19_narrative_review covered ddb772d..18eb57f;0Critical/0Important/0Minor. Independent14pure tests plus closed-modal late-result and wrong-revision browser checks PASS. No second review.
Final: Ruling: reviewer did not independently rerun entire MP4/PWA suites, judge live model/iPhone/XHS/market, or audit final integration/archive and post-review docs; executor evidence and external acceptance remain separately stated — costs narrower independent evidence, no implied device/commercial certification.
Final pre-integration:220/220 fullunit PASS; main remains exact v1.8 baseline, private config and prior archive receipts recorded without contents.

Live verification:3/3 actual app-metered DeepSeek calls returned200 and valid structure/settings/revisions.1063input/326output tokens; estimatedCNY0.004734; no unknown fees, no retry. Ruling: narrative poetic inference is not established autobiographical fact, and visual reason can contain parameter labels; retain human editing/review and explicitly limit quality claim — costs review effort, no fact guarantee. No extra live call.
Integration: main codex/local-final fast-forward to e006df0; main220/220 PASS; private.env and previousv18archive hashes unchanged; previousdist retained; main5173prodPID10244. Final source archive/published smoke pending.

Live smoke: original5173 production in new disposable browser PASS offline manual narrative/save/reload/PNG ZIP/backup; home and v1.9 guide HTTP200. User browser storage not opened or changed.
Final: Ruling: retain ignored worktree and verification artifacts as reproducible local evidence; only this execution's four plan scratch directories will be removed after exporting their full ledgers — costs extra disk space, avoids losing review/render evidence.
Task 3: complete (commits 62eef3d..4429b2d, tests: npm.cmd test → ℹ duration_ms 5505.1765)
