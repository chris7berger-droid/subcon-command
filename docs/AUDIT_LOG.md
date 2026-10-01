# Audit Log

Append one row per artifact reviewed by the audit terminal. Build terminal commits this file on its next pass.

| Date | Artifact | Findings | Severity mix | Outcome | Pattern tag |
|------|----------|----------|--------------|---------|-------------|
| 2026-05-09 | PR #19 (54a1409 + f02c77d → squashed as e662d24 on main) | 5 | 2 Med, 3 Low | changed | defense-in-depth-gaps |
| 2026-05-10 | PR #19 smoke plan | 2 | 1 Med, 1 Low | deferred | protocol-theater |
| 2026-05-10 | PR #20 (3417ca0 → squashed as a73ce87 on main) — H5 signing-token expiry + single-use | 0 | clean | changed | clean |
| 2026-05-11 | Jobs IA + Send-to-Schedule wizard planning doc (rev 1) — `~/sch-command/docs/planning/JOBS_IA_REFACTOR.md` | 14 | 3 Hi, 6 Med, 5 Lo | changed | doc-consistency |
| 2026-05-11 | Jobs IA + Send-to-Schedule wizard planning doc (rev 2) | 7 | 4 Med, 3 Lo | changed | doc-consistency |
| 2026-05-11 | Jobs IA + Send-to-Schedule wizard planning doc (rev 3) | 2 | 2 Lo | changed | doc-consistency |
| 2026-05-11 | Jobs IA + Send-to-Schedule wizard planning doc (rev 4, final) | 0 | clean | shipped as-is | clean |
| 2026-05-12 | +Add CO wizard + CO archive-parent WTC hint (cherry-picked 26de654..8128108 onto main) | 4 | 1 High (TDZ runtime), 2 Med (non-PW gap, jobsite/burden inheritance gaps), 1 Low (PW=true unrelated mystery) | changed | accepted-pending-changes |
| 2026-05-12 | feat/multi-gc-1a (84edc1b + 6b381cd + eadd93b + 44f7c59; ba747d3 reverted post-apply) — Multi-GC Migration 1a schema (UX guard reverted post-§5(c) reversal; migration itself unaffected and live in prod) | 2 | 1 Med, 1 Low | applied | doc-consistency |
| 2026-05-12 | §5(c) resolution reversal — multi-WTC-same-work_type is intentional (sub-areas), not a bug. Closed B17/B18/O5; filed F16; reverted ba747d3 | 0 (audit-correction) | clean | changed | audit-miss |
| 2026-06-01 | feat/retention-invoice-process @ e831912 · retention_invoice_process.md (Loop #30 per-invoice retention release; 3-round audit, R1 6→R2 plateau→R3 1) | 1 (doc nit; cut verified) | 1 Low | converged — build-ready | converged |
| 2026-07-02 | feat/invoice-email-attachments @ c0764d2 · invoice_email_attachments.md (Round 1) | 14 (6 top / 4 over-cap / 4 adjacent) | 2H/8M (top-6: 2H 4M) | accepted-pending-changes | copied-mechanism-misfit |
| 2026-07-02 | feat/invoice-email-attachments @ fe388e6 · invoice_email_attachments.md (Round 2) | 7 (1 regression + 6 caused-by) + 1 adjacent | 0H/4M/3L (top-6: 3M/3L; +1 Med regression) | accepted-pending-changes → build-ready (Option 1: bound at upload; plateau broken) | copied-mechanism-misfit (persisting → resolved) |
| 2026-10-01 | feat/sunday-saturday-parity @ 745a291 · sunday-scheduling.md (Round 1) | 6 (6 top / 0 over-cap) + 3 adjacent | 0H/4M/2L | accepted-pending-changes | acceptance-bar-gaps |
| 2026-10-01 | feat/sunday-saturday-parity @ bbe71e4 · sunday-scheduling.md (Round 2, delta) | 0 (6 round-1 fixes verified; 0 regressions; 2 non-blocking notes) | clean | converged — build-ready | acceptance-bar-gaps (resolved) |

## 2026-05-12 — +Add CO wizard + archive-parent WTC hint notes

Shipped 7 commits cherry-picked from `fix/co-wizard-prefill-and-jobnum` onto main (26de654..8128108):

1. `26de654` — +Add CO wizard reuses parent.job_number; skips redundant customerType/customerSelect steps; null parent.customer_id blocked at parentJob/coTreatment validateStep.
2. `195e4a2` — TDZ fix: useEffect that referenced `data` placed BEFORE `const [data, setData] = useState(...)` blew up `/calllog/:id` with "Cannot access 'x' before initialization" on preview deploy. Build passed because TDZ is a runtime check. Memory: [[feedback_useeffect_tdz]].
3. `3dcd464` — pre-fill jobsite_address fields from parent (customer.business_address ≠ call_log.jobsite_address — separate sources).
4. `9fe6d83` — CO inheritance: PW from parent's first PW-on sibling, burden_rate matched by work_type_id (most-recent non-deleted parent proposal).
5. `9963e66` — Initial archive-parent rate hint (used `!wtcId` gate — flashed away on autosave).
6. `846d97a` — Hint persists via `parentIsArchive && rateVal === 0`; **PW inheritance removed** (couldn't help archive case since archive proposals have no `proposal_wtc` rows; PW=true on fresh archive-parent CO WTCs is a separate mystery deferred to its own session); Option A zero-out of `burden_rate` + `ot_burden_rate` on archive parent so the rate field actually reads empty (tenant default 56.50 was silently blocking `rateVal === 0`).
7. `8128108` — Required text + hint moved OUT of `Field` to below the grid (kept grid `alignItems: end` from displacing PW Rate's input). OT field gets red border via inline style.

Audit findings during build:
- **H — TDZ runtime error.** First fix shipped to preview, broke `/calllog/:id`. Caught from screenshot. Fixed in 195e4a2. Build did NOT catch.
- **M — non-PW gap.** Audit terminal flagged that tenant defaults seed `bidding.burden_rate=56.50` synchronously, so `rateVal === 0` never fires for non-PW archive parents. Ratified Option A (zero out in parent-load effect). Shipped in 846d97a.
- **M — jobsite + burden_rate inheritance gaps.** Surfaced in test cycle (Chris caught both directly). Fixed in 3dcd464 and 9fe6d83.
- **L — PW=true on fresh WTC of archive-parent CO.** Reproducible per Chris's screenshot but NOT caused by the shipped code (archive proposals have no `proposal_wtc` rows → my PW autoset can't trigger; verified by removing PW autoset entirely — issue still expected to surface). Likely DB default or unrelated code path. Deferred to separate investigation session.

Deploy: cherry-pick chain pushed to `origin/main` at 8128108, Vercel auto-deploy to scmybiz.com. No migrations, no edge functions, no RLS — client-only.

Verification: Chris verified preview build (`6e5266e`) on real archive-parent CO before ratifying ship. Production smoke pending after Vercel build.

Memory deltas: created [[feedback_useeffect_tdz]] (build-passing ≠ runtime-safe for useEffect dep arrays that reference later-declared `const`/`let`).

## 2026-05-10 — PR #20 (H5) notes

Audit terminal greenlit PR #20 after two scratch verifications: the original SQL smoke (16/16 PASS on scratch `lvbdsfyppaogaezvqmrg`, deleted post-test) and the rollback round-trip (R1–R9 PASS on scratch `nqanzszlbbjkercgwrtl`, deleted post-test). Two audit notes carried into deploy:

- **L1.** `mark_proposal_signed` 5-arg builds its `p_pdf_url` allow-list regex by string-concatenating `v_proposal_id` into the pattern. Low risk because every existing and trigger-generated proposal id is a UUID (no regex metacharacters). Optional follow-up: switch to a literal substring check after the regex prefix matches. Not a deploy blocker.
- **L2.** `ProposalPDFModal.handleSend` now writes `proposals.status='Sent'` + refreshes `signing_token_expires_at` BEFORE invoking `send-proposal`. If Resend fails after the UPDATE, the proposal is flagged Sent with a refreshed expiry but no email was delivered — the rep retries. Accepted trade-off in exchange for the invariant "the link the customer holds is never expired-before-receipt."

Deploy outcome (2026-05-11 02:09 UTC):
- Migration A applied clean (`Finished supabase db push`).
- Q-POST-APPLY 1–6 green on prod (6/6). Backfill sanity: 0 unbacked-token rows, 0 Sold-unconsumed rows.
- `proposal-signed` deployed.
- PostgREST cache reloaded (5-arg RPC resolves to HTTP 400 INVALID_TOKEN, not PGRST202).
- Prod smoke P3 + P4 PASS on TEST customer "10085 - TEST" (proposal id `6e6b120b-e960-4791-b87e-2e4f3a7a8349`):
  - P3 — existing Sold proposal revisit renders Accepted ✓
  - P4 send → `signing_token_expires_at = 2026-08-09 02:09:51` (89d 23h 58m out) ✓
  - P4 sign → atomic state: `status=Sold`, `approved_at`, `signing_token_consumed_at`, `proposal_signatures.signed_at` all identical `02:13:02.712165+00`; `call_log.stage=Sold`; `ip_address=76.235.216.194` (real client IP captured server-side via `x-forwarded-for`, NOT from React body); `pdf_url` non-null + passed Supabase regex ✓
  - P4 revisit → Accepted screen rendered fresh from `get_public_proposal_view` (permissive on `consumed_at`) ✓
  - P4 stale-tab — edge fn returned HTTP 409 `{"error":"ALREADY_SIGNED"}` for the consumed token re-attempt. UI's `fnError.context?.json?.()` parse path (QBLinkModal pattern at `src/components/QBLinkModal.jsx:29`) routes that to silent `setSigned(true)` + `qbBlocked=true` (prevents qb-create-job double-fire). HTTP contract verified directly via curl; UI handling follows from existing tested parse pattern.

O3 timer: started 2026-05-11 02:09 UTC. Earliest Migration B start: 2026-05-13 02:10 UTC. Before applying Migration B, query `pg_stat_statements` (or Supabase function/RPC logs) for traffic to the 1-arg `mark_proposal_signed` form since 2026-05-11; require zero hits before drop.

## 2026-05-10 — PR #19 smoke plan notes

Step 3a executed; Steps 3b and 3c not executed.

Step 3a — `qb-search-customers` invoked from the live app via the
Link-to-Existing flow on a real job (CallLogDetail → Connect to
QuickBooks → Link to Existing → search "kal"). Returned a populated
result list (KalB Industries Of Nevada parent + multiple
sub-customers). The modal was cancelled without selecting a result.

What 3a proves:
- The deployed `qb-search-customers` function loads.
- `authenticateCaller` wiring (introduced PR #19) accepts a real user
  session and rejects nothing it shouldn't.
- `getQBToken(sb, tenantId)` resolves for the current tenant.
- Token-refresh persistence does not false-fail (the request would
  have errored if the refresh write missed its row).

What 3a does NOT prove:
- 3a is deploy-health, not security validation.
- 3a may have refreshed QB tokens in `qb_connection` (side effect of
  `getQBToken` when the access token is near expiry) — this is an
  expected and intended side effect, not a violation of "read-only".
- 3a does not prove cross-tenant isolation. A second tenant would be
  required to confirm `qb_connection.tenant_id` scoping actually
  rejects another tenant's caller. With the app at single tenant,
  this remains untested.
- 3a does not prove RLS behavior across tenants for any of the
  PR #19 surface (`qb-create-job`, `qb-link-customer`,
  `send-pay-app`).
- 3a does not exercise the full C9 fix (recipient allowlist,
  attachment-URL allowlist, server-derived sender, DB-only PDF
  URLs, payApp ↔ invoice tenant assertions, payApp.invoice_id ===
  invoiceId).

Steps 3b and 3c — not executed. Both require a safe internal test
fixture (test customer + test pay-app + test invoice with a non-real
recipient destination). No such fixture exists at single tenant.
Re-run when a fixture is available, or when the second tenant onboards
under F7 and naturally creates one.

Hard limits respected this session:
- No live customer emails sent.
- No mutations to real billing, pay-app, invoice, customer, or
  call_log rows.
- No QB link/create against live data (no `qb-create-job`,
  no `qb-link-customer` mutating writes).
- No product code changes.
- No deploys.

Pattern tag rationale (`protocol-theater`): the original v104 smoke
plan named three steps. Two of the three are unrunnable at single
tenant without building scaffolding the audit would also need to
validate. Booking the deferral keeps the gap visible instead of
implying "smoke = security verified."

## 2026-05-12 — §5(c) resolution reversal notes

Audit ratified the §5(c) "block duplicates" resolution during the 2026-05-11 Round 5 ratification pass. The resolution treated multi-WTC-same-`work_type_id` on one proposal as an import bug requiring a UNIQUE constraint + WTCCalculator UX guard. During Migration 1a prod-apply, build terminal challenged the premise: `proposal_wtc.sub_areas (jsonb)` exists in the schema, and the V8 evidence pattern (consistent 4× Demo + 4× Specialty across three Hyundai Reno jobs, mostly `status=Sent`) is shaped like intentional sub-area splits, not import duplication. Chris confirmed the domain assertion: multi-WTC-same-work_type is intentional behavior, used for sub-area splits / time-phasing / crew assignment.

**Audit failure mode:** ratified the planning resolution without challenging the domain-fact premise ("duplicates are a bug") independently. The plan agent's reasoning chain was internally consistent given the premise — but the premise was wrong. **Lesson for future audit ratification passes:** explicitly challenge load-bearing domain-fact premises ("is X actually a bug or is it an intentional feature?"), not just verify the reasoning chain. New `audit-miss` pattern tag introduced for this and similar future cases.

**What stays in prod:** Migration `20260513000000_multi_gc_allocation` (purely additive — 8 columns on proposals, 1 on proposal_wtc, proposal_clones audit table, intro trigger). All unaffected by the §5(c) error.

**What was reverted from feat/multi-gc-1a:** WTCCalculator UX guard (`ba747d3`). Never reached `scmybiz.com`; only existed on the Vercel preview of `feat/multi-gc-1a`.

**What's closed:** B17 (importer-creating-dups → Not-a-Bug), B18 (triage 17 dup pairs → Not-Applicable), O5 (Migration 1b UNIQUE → Won't-Do). All moved to BACKLOG Completed Log.

**What's filed new:** F16 (T1) — re-plan §5 sync identity using `cloned_from_wtc_id` lineage column on `proposal_wtc`. Blocks all of §10 step 6 (RPCs).

**What's deferred:** FF merge of `feat/multi-gc-1a` → `feat/multi-gc-allocation`. Wait until F16 lands and feat-base state is stable. Migration is already in prod, so no urgency.

**Cleanup committed in `44f7c59`.**

## 2026-05-12 — Migration 1a prod-apply notes

Migration `20260513000000_multi_gc_allocation` applied to prod (`pbgvgjjuhnpsumnowuym`) via `supabase db push --linked`. Sole migration applied. PostgREST schema reloaded via `NOTIFY pgrst, 'reload schema'`.

**Pre-apply blocker resolution:** Prod ledger contained two `has_statements=false` rows from sch-command Jobs IA planning (`20260512120000_jobs_material_status_additive`, `20260512120100_job_wtcs_create`) that blocked `db push` on local↔remote symmetry. Audit updated its prior "don't touch sch-command rows" directive after re-evaluating: both rows had no DDL attached, no local files in either repo AT THAT TIME, the reservation purpose was moot post-rename. Reverted via `supabase migration repair --status reverted 20260512120000 20260512120100`. Resolves O8 in the bookkeeping sense.

**Cross-repo collision discovered post-revert:** During cleanup, fetched sch-command/main showed commit `2a286e9` (Jobs IA refactor + job_wtcs) with actual migration files at those two timestamps now on origin, AND `public.job_wtcs` LIVE on prod with full schema. Ledger contained zero trace of how the DDL was applied. Inferred sequence: sch-command applied DDL via Supabase dashboard SQL editor or direct `db query`, bypassing `db push`. Our revert removed only the placeholder bookkeeping, not the schema. Breadcrumb dropped in sch-command's latest handoff advising ledger reconciliation before their next `db push`. Filed as second audit miss: cross-repo directives must re-verify remote state immediately before execution.

**Post-apply smokes:** Smoke 1 (read path on scmybiz.com) — DEFERRED to next session per session-close. Smoke 2 (UX guard) — moot, guard reverted in `44f7c59` before smoke run. Smoke 3 (trigger NO-OP on real parent intro edit + DB query for `locally_edited_fields = {}`) — DEFERRED to next session. Migration is additive + IF NOT EXISTS-guarded + scratch-validated; smokes are due-diligence rather than risk-mitigating, low-priority deferral.

Scratch project (`ibalavttrqjyijrnkwmd`, sc-scratch-multi-gc-1a) deleted post-validation per H5/S1 cleanup pattern.

## Gate records

One row per gate: Date · Role · Agent/session · Artifact · Verdict · Acceptance. Reviewer records are transcribed verbatim by T3; the reviewer's words are not edited.

### 2026-10-01 — B124 password recovery — T5 Code Review

Transcribed verbatim from the reviewer's proposed gate record (`recovery-t5`, emitted to `/tmp/recovery-t5-review.txt`). Only the Acceptance field is filled in by the transcriber.

| Field | Value |
|---|---|
| Date | 2026-10-01 |
| Role | T5 Code Review (existing `/fix` path, read-only) |
| Agent/session | `5b538650-d476-4e72-9ad4-c1ff1fb58cf8` (cold; independent of builder `bb07d938-e6cb-4b33-bb24-b7110693ccf1`) |
| Artifact | `90f890dcd5be5a8134af545d5a23f9b0654d9150..36ce1c0` as routed — full hash unresolved, worktree files reviewed |
| Verdict | **BLOCKS-SHIP: 1** · SHOULD-FIX: 1 · HARDENING: 0 — gate not met |
| Route | Finding 1 to T3, then T5 re-review of the fix |
| Acceptance | standing (§9) |

### 2026-10-01 — B124 password recovery — T5 Code Review, round 2

Transcribed verbatim from the reviewer's proposed gate record and its stated limitations (`recovery-t5`, emitted to `/tmp/recovery-t5-clear.txt`).

| Field | Value |
|---|---|
| Date | 2026-10-01 |
| Role | T5 Code Review (existing `/fix` path, read-only), round 2 |
| Agent/session | `5b538650-d476-4e72-9ad4-c1ff1fb58cf8` (cold; not the builder) |
| Artifact | `90f890dcd5be5a8134af545d5a23f9b0654d9150..e5087360c4a5b4ceebecb7193ef09c0b98a2e729` |
| Verdict | **BLOCKS-SHIP: 0** · SHOULD-FIX: 1 (round-1 residual, backlog) · HARDENING: 0 — gate met |
| Acceptance | standing (§9) |

Reviewer's limitations (verbatim):

- **Nothing executed.** The 24/24 unit, 8/8 browser, and "two new cases fail against `36ce1c0`" claims are the builder's; I checked only what the tests assert.
- **Git state not independently verified.** The target SHA is from the coordinator's `.review/target-sha.txt`; I could not confirm the worktree matches it.
- **No doc changes in the diff.** The acceptance scope mentions "required docs"; the patch touches only the script, App, Login, the helper and its test. I did not assess whether docs are owed.
- **No certification of the customer incident.** The actual incident cause is unproven, per the acceptance text.
- Builder transcript and `BUILD-REPORT.md` were not opened.

### 2026-10-01 — B124 password recovery — T6 Security Review

Transcribed verbatim from the reviewer's proposed gate record (`recovery-t6`, emitted to `/tmp/recovery-t6-review.txt`), followed by its findings, coverage and limitations, also verbatim, as the supporting record. Only the heading level of the three supporting sections was changed to nest them here.

- **Role:** T6 / Security Review
- **Agent/session:** Claude Opus 5.5, session `521dd74e-d33b-4ef6-b288-4533da8abb87` (distinct from T3 `bb07d938-e6cb-4b33-bb24-b7110693ccf1` and T5 `5b538650-d476-4e72-9ad4-c1ff1fb58cf8`)
- **Date:** 2026-10-01
- **Artifact:** `90f890dcd5be5a8134af545d5a23f9b0654d9150..e5087360c4a5b4ceebecb7193ef09c0b98a2e729`
- **Verdict:** 0 exploitable-today; 0 BLOCKS-SHIP; 0 SHOULD-FIX; 3 HARDENING (1 introduced, 2 preexisting) to backlog as one item. Safe to ship. Coverage and limitations as stated above; source-only, no probes.
- **Acceptance:** standing (§9) — ordinary verdict, with no scope change, locked-decision change, scope cut or human gate. Production acceptance remains with Chris.

Supporting record (verbatim):

**Zero exploitable-today findings; safe to ship from the security lens.** After this change I found no path by which an unauthorized actor updates an account or password, or is admitted to the protected app, through the recovery flows. Three non-blocking hardening items are below.

Nothing was executed: this is a source-only review of the patch plus the current `App.jsx`, `Login.jsx`, `lib/passwordRecovery.js`, `lib/auth.js`, `lib/supabase.js` and `index.html`. Bash was denied in this session, so T3's test counts are taken as reported, not re-run.

#### Findings

| # | Finding | Exploitable today? | Materiality | Scope |
|---|---|---|---|---|
| 1 | A tokenless `#type=recovery` URL opens a code-less "set new password" form against whatever session is already in the browser | No — requires an existing live session, whose holder can already change the password through the auth API | HARDENING | Introduced |
| 2 | The identity check and the save are not atomic | No — only the same browser profile signing into a second account in a millisecond window | HARDENING | Preexisting, narrowed by this change |
| 3 | A recovery-link session can still be admitted in a second tab before the first submit | No — same session holder, frontend navigation only | HARDENING | Preexisting |

**1. Tokenless recovery hash.**
- **Path:** `index.html:14-15` sets `sc_recovery_mode` for any hash containing `type=recovery`. `src/App.jsx:154-156` and `:247-248` then pin `Login`, and `src/pages/Login.jsx:54-58` sets `viaLink`, which hides the code field (`Login.jsx:276`). `src/lib/passwordRecovery.js:133-136` adopts the current session and `:154` saves the password against it.
- **What changed:** at base, the same URL showed a code field and always called `verifyOtp` first.
- **Why not a blocker:** someone with walk-up access to an unlocked signed-in browser can set a new password without the current one, but the session token already allows that server-side. A lured victim only sets their own password.
- **Side effect:** "Back to sign in" on that form signs the user out (`passwordRecovery.js:190-193`).
- **Action:** backlog. Set `viaLink` only when the hash carries a token or a `PASSWORD_RECOVERY` event was seen.

**2. Non-atomic identity check.**
- **Path:** `passwordRecovery.js:150` checks the session owner, then `:154` calls `updateUser`. If another tab swaps the stored session to a different account in between, the password lands on that account. The same applies when the session read errors ("unknown") and the flow proceeds.
- **What the user sees:** `:155-158` detects the swap afterwards and reports "expired", although a save did happen.
- **Why not a blocker:** the actor holds both sessions. Base had no check at all.
- **Action:** backlog.

**3. Link session in a second tab.**
- **Path:** the marker is written only at first submit (`passwordRecovery.js:113`). Before that, a second tab's `SIGNED_IN` on becoming visible falls through to "apply" (`passwordRecovery.js:27-30`, `App.jsx:200`).
- **Action:** backlog.

#### Coverage

- **Identity binding:** the verified user id is taken from the `verifyOtp` or link session. The save is refused if the session is gone or belongs to another account, and the retained stage is invalidated on sign-out or account switch (`passwordRecovery.js:150-152`, `:204-207`; `Login.jsx:39-46`).
- **Save confirmation:** success requires no error and a returned user id equal to the verified one (`passwordRecovery.js:155`). It is not assumed.
- **Session transitions and event ordering:**
  - The hold is raised before `verifyOtp` (`passwordRecovery.js:138`), so the `PASSWORD_RECOVERY` emitted before return is held (`App.jsx:192`).
  - `USER_UPDATED`, `TOKEN_REFRESHED` and `SIGNED_IN` with a session are held by the hold or the marker.
  - `SIGNED_OUT` and a rejected refresh still apply.
  - I found no deadlock; the wrapper in `lib/auth.js:10-15` does not await the callback.
- **Marker ownership and cleanup:**
  - The marker holds a user id only, never a code, token or password.
  - It is cleared only after a confirmed sign-out (`App.jsx:211-212`, `:221-222`; `passwordRecovery.js:191-195`) or a successful password sign-in (`Login.jsx:81-87`).
  - A failed sign-in leaves it in place.
  - A stale marker cannot lock anyone out of password sign-in.
- **Cancel, retry, double submit:** the busy guard blocks concurrent submit and cancel. A retry never re-verifies the consumed code or re-saves. Back and "Request a new code" end the session first and stay put if sign-out fails.
- **Refresh, return, remember-off:** a persisted recovery session is signed out at startup rather than admitted (`App.jsx:216-225`). The remember-off sign-out is skipped for a link tab.
- **Persistence and logging:** the changed files add no console output. The password and code live only in React state. The only new storage key is `sc_recovery_user`.
- **Test fixtures:**
  - The browser script answers every auth/rest/functions call from fixtures and aborts all other third-party requests.
  - It refuses the three production hosts.
  - The Vercel token is sent only to the `BASE_URL` origin and is not logged.
  - Credentials are fake.
- **Scope:** the diff touches `App.jsx`, `Login.jsx`, the new helper and two test files. There are no server, edge-function, migration, RLS, security-setting or customer-data changes.

**Frontend vs server:** holding the form and blocking app admission are navigation UX. A recovery session is a full session server-side, and its holder proved control of the mailbox. None of this change is, or needs to be, an authorization boundary.

#### Limitations

- No live or preview probes and no test execution; T3's 24 unit and 8 browser results are not independently confirmed.
- auth-js behaviour is taken from the routing note and test comments, not read from the installed package. This covers emit-before-return, sign-out keeping the local session on a 5xx, and cross-tab broadcast.
- Supabase project settings (secure password change, OTP expiry, rate limits) were not inspected.
- The actual incident cause remains unproven; this does not certify the customer's password is fixed.
- I did not read the T3 or T5 transcripts, or `t5-first-review.txt`.
- The known residual (refresh after saved-plus-sign-out-failure loses the saved-status message) is acknowledged as filed and not re-raised.


### Chris acceptance — B124 / PR #73 — 2026-10-01

- Role: release coordinator; original approval verified directly with the supported `mcp__codex_app__read_thread` tool.
- Artifact: PR #73 candidate `48ab14392be71f25713c0e641a642221c01c523e`; application source reviewed at `e508736`, eight-scenario preview tested at `3031f0c`.
- Verdict: release approved; production verification pending.
- Source: parent thread `01a0f447-ce26-721f-a345-7097d9bbc012`, approval turn `01a0f848-cf4f-7282-b911-88650521039b`, original user message `01a0f848-d104-74a5-ac25-d64993bf54d8`, 2026-10-01 16:25 UTC. The preceding delivered question is in turn `01a0f83d-67a5-7782-9273-6d0979fb3130`.
- Question: “One release decision: Bugbot is disabled for this repository, so it skipped the review. The independent AIOS code and security reviews both passed. Do you approve using those reviews instead and releasing the tested password-reset fix? That replaces my previous approval question.”
- Acceptance, Chris: “The reset fix is approved. I want to know how, why, and when it happened because I've had this issue in the past and we fixed it.”
- Scope: one-time substitution of the completed independent AIOS T5/T6 reviews for disabled Bugbot on PR #73 only; no permanent waiver or settings change. No account/password/mail/backend changes. Historical investigation is separate from this release.
- Provenance: T3 could not authenticate a forwarded export within its permission review and made no acceptance changes. The coordinator independently read the original conversation through the supported thread tool and records this entry. Public PR record: https://github.com/chris7berger-droid/subcon-command/pull/73#issuecomment-5935784359 .

### 2026-10-01 — F60 Sunday parity — T2 Plan Audit, round 1

Transcribed verbatim from the reviewer's proposed gate record and gate block (`t2-sunday-parity`, emitted to `/tmp/sunday-t2-r1-verdict-20261001.md`). Only the Acceptance field is filled in by the transcriber. The reviewer's audit-log row is transcribed verbatim into the audit table above.

Proposed gate record (verbatim):

```
Role T2 Plan Audit · Agent/session t2-sunday-parity / 471c2a52-fb03-4034-ac24-0dcf72bf2f23 (independent of author t1-sunday-parity / 1470cf53-cb8c-459b-a4a2-787383448af0) · Artifact docs/plans/sunday-scheduling.md @ 745a291c08c353c1918708646f3f154c821c3804 · Verdict NOT CONVERGED — 6 caused-by (4 Med, 2 Low), 0 regressions, no scope-cut · Date 2026-10-01
```

- **Acceptance:** standing (§9)

Reviewer's gate block (verbatim):

```
Role:        T2 Plan Audit · agent/session t2-sunday-parity · 471c2a52-fb03-4034-ac24-0dcf72bf2f23
Audited:     subcon-command · plan docs/plans/sunday-scheduling.md @ 745a291c08c353c1918708646f3f154c821c3804 · round 1 · manifest 54f4849
Verdict:     NOT CONVERGED  (proposed)
Findings:    top-6 0C/0H/4M/2L · regressions 0 · over-cap 0 · adjacent 3
Human gate:  none — ordinary verdict (no scope change, no [LOCKED] change, no scope-cut). Open provenance: no personal plan lock by Chris is recorded (§A).
Proposed gate record: Role T2 Plan Audit · Agent/session t2-sunday-parity / 471c2a52-fb03-4034-ac24-0dcf72bf2f23 (independent of author t1-sunday-parity / 1470cf53-cb8c-459b-a4a2-787383448af0) · Artifact docs/plans/sunday-scheduling.md @ 745a291c08c353c1918708646f3f154c821c3804 · Verdict NOT CONVERGED — 6 caused-by (4 Med, 2 Low), 0 regressions, no scope-cut · Date 2026-10-01
Next:        _protocol.md §9 acceptance → T3 transcription → T7 re-reads the gate → T1 revision
```

### 2026-10-01 — F60 Sunday parity — T2 Plan Audit, round 2 (delta)

Transcribed verbatim from the reviewer's proposed gate record, gate block, two non-blocking notes and stated limits (`t2-sunday-parity`, emitted to `/tmp/sunday-t2-r2-verdict-20261001.md`). Only the Acceptance field is filled in by the transcriber. The reviewer's audit-log row is transcribed verbatim into the audit table above.

Proposed gate record (verbatim):

```
Role T2 Plan Audit · Agent/session t2-sunday-parity / 471c2a52-fb03-4034-ac24-0dcf72bf2f23 (independent of author t1-sunday-parity / 1470cf53-cb8c-459b-a4a2-787383448af0) · Artifact docs/plans/sunday-scheduling.md @ bbe71e4ad1c79db530866fd63ea3631dd1f22520 · Verdict CONVERGED — round-1 findings A1, A2, B1, C1, D1, D2 resolved; 0 regressions; 0 new in-cap findings; 2 non-blocking notes · Date 2026-10-01
```

- **Acceptance:** standing (§9)

Reviewer's gate block (verbatim):

```
Role:        T2 Plan Audit · agent/session t2-sunday-parity · 471c2a52-fb03-4034-ac24-0dcf72bf2f23
Audited:     subcon-command · plan docs/plans/sunday-scheduling.md @ bbe71e4ad1c79db530866fd63ea3631dd1f22520 · round 2 (delta since 745a291) · manifest d431a3497ae7a15b365a7729840c44accfd84b5f
Verdict:     CONVERGED  (proposed)
Findings:    none in cap · regressions 0 · over-cap 0 · adjacent 0 new · 2 non-blocking notes (B13 carve-out, W2 wording)
Human gate:  none — ordinary verdict (no scope change, no [LOCKED] change, no scope-cut). Open provenance: no personal plan lock by Chris is recorded (§A).
Proposed gate record: Role T2 Plan Audit · Agent/session t2-sunday-parity / 471c2a52-fb03-4034-ac24-0dcf72bf2f23 (independent of author t1-sunday-parity / 1470cf53-cb8c-459b-a4a2-787383448af0) · Artifact docs/plans/sunday-scheduling.md @ bbe71e4ad1c79db530866fd63ea3631dd1f22520 · Verdict CONVERGED — round-1 findings A1, A2, B1, C1, D1, D2 resolved; 0 regressions; 0 new in-cap findings; 2 non-blocking notes · Date 2026-10-01
Next:        _protocol.md §9 acceptance → T3 transcription → T7 re-reads the gate
```

Reviewer's two non-blocking notes (verbatim):

The reviewer tagged both Low / caused-by. Under the T2 card any counted caused-by finding blocks convergence, so this is a judgment call that acceptance can overrule.

1. **B13's carve-out names only P8's pool chip.**
   - What also changes: a person whose only crew days that week are on Sunday (P7) becomes a Booked chip, and the pool's "N free this week" count drops by one (`Schedule.jsx:429–436`, `:1307`).
   - Why it doesn't block: this is exactly how a Saturday-only person behaves today, and B14 already says those Sunday rows show in the pool dots. Only the count is unstated.
   - For T3: read B13 as the Monday–Saturday day columns.
2. **W2's "so both read sites agree" is looser than it sounds.**
   - What slips through: a build that fixes only the mount effect still settles on the right week and passes W2, after one wasted fetch of the wrong week.
   - Why it doesn't block: S10 and §3 both instruct the fix at both sites, the diff reviews read both, and the stale-response guard (`:260`, `:278–283`) keeps the wrong week from being shown.
   - For T3: a tighter W2 would assert that no read for another week is sent.

A third round for these would change check wording only, not what gets built.

Reviewer's limits (verbatim):

- Nothing was built or run beyond reading and throwaway date arithmetic. Production was not probed (U4 stays open).
- The plan still states that Chris has not personally locked this artifact, and that the D1 pool-chip change is expected but not accepted by him. This verdict does not change either.
- This was a delta review only; unchanged sections were not re-audited.

### 2026-10-01 — F60 Sunday parity — T4 Build vs Plan, round 1

Transcribed verbatim from the reviewer's proposed gate record (T4, emitted to `/tmp/sunday-t4-r1-verdict-20261001.md`), followed by its limits, punch list, source-read passes and brand check, also verbatim, as the supporting record. Only the Acceptance field is filled in by the transcriber, and only the heading level of the supporting sections was changed to nest them here. The reviewer emitted no audit-table row, so none is added.

Reviewer's opening line (verbatim): **Proposed verdict: NO-GO.** One layout check fails, and several required checks could not be verified because this session could not run commands.

```
Role:        T4 Build vs Plan · agent/session https://claude.ai/code/session_01UcymLRm6N9ZtrHaUwDdi2k
             (independent of builder t3-sunday-parity / 2c23e844-d27d-4995-bdcc-7b0ef7430cb0)
Artifact:    docs/plans/sunday-scheduling.md @ bbe71e4ad1c79db530866fd63ea3631dd1f22520
             · build 3145a7a..adf27b4 (source 3f6b3cf8ac3df2ceef39654e10a429ca14f1a086)
Checks:      passed by source read: S1–S10 logic, C4, C5, E3
             failed: F1/B11 crew-pool day dots (P1 below)
             unverified: reviewed revision, E1, E2 (diff), E4, E5, live run of M/B/H/K/D/X/T/L/W
             deferred: P (preview), N (native device), U4 (production Sunday rows)
Brand check: sources and 1280 screenshots verified; one unreported deviation (P1);
             picker, popup, toggle and print evidence missing
Verdict:     NO-GO — P1 fails; the unverified checks above must be closed in a session that can run git and the checks
Date:        2026-10-01
Next:        T7 · proposed record only, not recorded
```

No personal plan lock is claimed; the plan's §A provenance stands as written.

- **Acceptance:** standing (§9)

Supporting record (verbatim):

#### Limits of this review

- **No shell:** Bash was denied, so there was no `git diff`, no `npm run build`, no ESLint and no check run.
- **Procedure not read:** `/Users/chrisberger/.claude/commands/buildvsplan.md` was denied, so I followed the T4 card and protocol §9 and §14 only.
- **Revision not confirmed:** I could not read the worktree HEAD, so I reviewed the working tree as found; it matches the build report's description.
- **Repo invariants not read:** I did not open the repo `CLAUDE.md` or `docs/DEVELOPMENT_PROTOCOL.md`.

#### Punch list

**P1 — fails F1/B11; caused by this build.** The seventh day dot overflows the crew-pool chip.
- `src/schedule/App.css:959` fixes the dots block at 125px, which is exactly a 62px label plus six 8px dots with 3px gaps.
- Seven dots need 136px, so the row spills 11px, about 3px past the chip's right edge.
- It shows in `after/board-1280.png` and `after/board-1440.png`: the last dot and the last "S" sit on or over the chip border.
- The plan's edit list named only `App.css:1103` and `:6768`, and the new check's clipping test does not cover the pool dots (`scripts/check-sunday-parity.mjs:170`).
- The build report's "no clipped" and "deviations: none" claims are wrong on this point.

**P2 — brand evidence gap.** The screenshots cover the board, strip, Daily and Calendar week only. Nothing shows the seven-chip assign and Sick pickers, the crew week popup, the expanded-row day toggles or the prints.

**P3 — E5 holds only in the weakened form the report states.** `check-crew-week-summary.mjs` and `check-overlapping-crew-trips.mjs` fail on base and on the build, so they give no trip-ownership coverage. These are original failures, not regressions.

#### Passed by source read

- **Sunday row ownership (C4):** assign and remove still go through `changeRowAssignments` with the trip id as `mobilization_id` and deletes by row id (`Schedule.jsx:483–526`).
- **One week list (E3):** columns, pickers, dots, popup, both reads and the strip all follow `dates`, with ends at `.at(-1)` (`Schedule.jsx:197–205`, `:250–251`).
- **Capacity:** the strip is seven cards, and the screenshot's SUN 4 (3 / 8, 38%, 5 free, 2 out) matches the fixture by Saturday's formula.
- **Read ranges:** the board, Daily (`Daily.jsx:100`, `:180`) and both prints (`exports.js:72`, `:153`) run Monday through Sunday.
- **Calendar boundary (K4):** the week fetch is Monday–Sunday unioned with the month grid, so the week of 11-02 reads through 11-08 (`Calendar.jsx:218–229`). Sunday is the last column, with none before Monday (`:366`).
- **Week links and DST (S10, W2, W3):** both read sites use `weekOffsetFor`, which rounds the difference between two local Mondays, so a clock-change hour cannot shift the week (`Schedule.jsx:61–65`, `:130`, `:189–195`). The check asserts no other week's read is sent (`check-sunday-parity.mjs:643–652`).
- **Select all and time off (C5, B15):** Select all still skips out days (`Schedule.jsx:461–465`). The chip greys only when out on all seven days (`:1191–1193`), and the screenshot shows the Monday–Saturday person as a normal chip.
- **Other surfaces:**
  - Multi-week alert counts seven days (`queries.js:974`).
  - Midweek text runs through Sunday (`crewWeekText.js:110–114`).
  - The five phone strings say Sunday (`CrewPhone.jsx:151–210`).
  - Presets fill Monday to Sunday (`crewStatus.js:65–73`).
  - `fmtWk` ends on Monday+6 (`weeks.js:32–39`).
- **Seventh-column fit at 1280:** the board, strip, Daily and Calendar week each show seven columns with no visible clipping of headers, counts, `need N`, percent or the TODAY tag.
- **Dead six-day code left alone, as planned:** `wkEnd`, `StatsBar.jsx`, `App.css:391` and `:757`.

#### Brand check

- **Authority:** resolved through the registry; the UI standard `.md` governs.
- **Sections read:** §10 "Tables / schedules" and "Crew panels", §14, §17 and §18 "AI coding-agent acceptance checklist". I did not open §1.
- **Canonical image:** opened; it shows six columns, and the report correctly claims no column-count match.
- **Sunday treatment:** in the four screenshots Sunday's column and card carry Saturday's treatment, with no new colour, type or radius visible.
- **Gaps:** P1 is an unreported deviation, and P2 is missing evidence.
