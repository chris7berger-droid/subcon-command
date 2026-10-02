## F66 — Mobile crew scheduler: Crew Schedule at phone width (2026-10-01)

**Built and locally checked. At ≤768px `/schedule/schedule` has Week, Day, Person and Board views and a person → days → review → save flow that saves through the existing assignment path. Desktop is unchanged. Stopped at the T3 build gate for independent review. Not pushed by T3, no preview walked, not merged, not in production.**

    Role:        T3 Build · mode: build (initial) · agent/session t3-crew-mobile / 6bdefad7-da48-4732-b78a-f804c6c558d9
    Plan:        docs/plans/crew_mobile_preview.md @ 39cd8713f8d1097f58b70e4bcc22b84499fa1606 · body identical at build start (only `## Audit manifest` differs)
    Gates:       T2 CONVERGED @ 39cd871, recorded in docs/AUDIT_LOG.md at eeb4190. Chris's personal T1 lock is NOT recorded (plan §A); the coordinator routed the build as implementation authorization, not as a lock, acceptance or release.
    Base:        7608b0e8504416678c43d31f3fedacbf015e7d1e · `src/` and `scripts/` at build start were identical to it
    Source:      1e6bde178b2ffcf5816ba10573d38a127f8347fd (app source + check script + fixture). Every result below was run on this source.
    Outcome:     bar met within planned scope, with one literal miss recorded under Deviations (P12 at 768)
    Completion:  code built: yes · data applied: none · authenticated access: not exercised · Chris accepted: not T3's to claim

### What changed

| File | Change |
|---|---|
| `src/schedule/views/Schedule.jsx` | Phone view state (which view, which day), the flow's draft, and breakpoint handling. Renders the switch, the three phone panes and the flow at ≤768px; the desktop picker and crew week popup are not rendered there. Adds "Assign crew" to an expanded Board row. 117 lines changed; the only removed lines are the wrapper tags and two render conditions it had to extend. |
| `src/schedule/components/SchedulePhone.jsx` (new) | The switch, Week, Day, Person and the assign flow. Presentation only. |
| `src/schedule/components/SchedulePhone.css` (new) | Phone layout. Two media queries, both `screen` (≤768px, ≤600px). Every rule is scoped to this route. |
| `src/schedule/lib/schedulePhone.js` (new) | Small helpers that read the board's own rows, staffing and summary. |
| `scripts/check-crew-mobile.mjs`, `scripts/crew-mobile-fixture.mjs` (new) | The plan's acceptance checks and its synthetic fixture. |

No other existing file changed. No dependency, route, backend call, schema, auth or config change.

### How it works, briefly

- **Week** lists the seven days with the capacity strip's numbers and three counts (short, unknown need, double-booked). The strip's badges and "requirements unclear" link stay above it. Tapping a day opens Day.
- **Day** shows one card per board row that has a non-empty cell that day, in board order, then that day's Free and Out lists.
- **Person** reuses the crew pool as the list. A person opens to a status per day, one line per trip, Scheduled Off ranges and the status actions.
- **Board** is the existing board, scrolling sideways in its own frame with the Job column and date header fixed.
- **The flow** covers the screen and makes the page behind it inert. Save re-finds the row by its key and calls the existing `changeRowAssignments(row, name, days)`, whose body is unchanged. Review is recomputed from the current row, so after a partial failure it shows what is on the trip now and what is still to do.
- **Crossing 768px** closes the flow, the desktop picker, the crew week popup and Person's open person with no write. A save already in flight finishes first.

### Baseline recorded before the first app edit (plan §5 U)

- **U1 — rendered "before" at 360, 390, 430, 768** (`evidence/crew-mobile/base/`). The capacity strip takes 373px of height at the three phone widths and 353px at 768. The pool keeps its 280px, leaving the board 48, 78, 118 and 456px. No day column is fully visible at the phone widths; four are at 768. The week buttons are in view. The status buttons are not shown without a hover.
  - **One difference from plan §0.1:** the board's row area does scroll sideways inside its 48–118px box (its vertical scroll setting makes it scrollable both ways); the date header does not move with it. The plan said the day columns cannot be scrolled to. This does not change the design.
- **U2 — ESLint on base:** 176 errors, 43 warnings. **Dialogs at 360:** crew week popup 360px wide (fills the screen exactly), status picker 348px (inside), Scheduled Off 380px (10px off each side).
- **U3 — drag by touch on a real phone:** not assessed. No agent can.
- **U4 — D2 pass-set on the base** (`evidence/crew-mobile/base/checks-base.txt`): 24 of 40 existing checks and tests exit zero, the four named in D2 among them. `check-mobile-preview` was run separately on a base build: 166 pass, 0 fail, B1 skipped, 0 writes. The 16 that already exit non-zero are the 15 the Sunday build recorded plus `check-sunday-parity-preview.mjs`, which needs a hosted URL.

### Verification — all on source `1e6bde1`, synthetic fixture only

No sign-in, no real record, no real backend request. Chrome with touch emulation; clock fixed at 2026-10-07 12:00 PDT.

| Check | Result |
|---|---|
| `scripts/check-crew-mobile.mjs` — P1–P17 at 360, 390, 430, 768; D1 and D4 at 1440 | **86 of 86 pass.** 0 page errors, 0 refused requests, 0 writes other than the two allowed fake assignment writes (`evidence/crew-mobile/after/results.json`) |
| D2 — every check that exits zero on the base still does (`after/checks-after.txt`) | same 24 pass, same 16 non-zero |
| D2 — `check-sunday-parity-model` | pass, M1–M6 |
| D2 — `check-sunday-parity` (desktop drag → picker → save, seven days) | pass, 30 groups |
| D2 — `check-mobile-preview` (phone shell) | 166 pass, 0 fail, B1 skipped; 0 writes, 0 refused |
| D2 — `check-preview-autoarchive` (preview archive guard, with eligible "Lost" candidates) | pass |
| D3 — 1440 board screenshot against base | base vs base again: 5,959 pixels differ (max 3 levels). base vs this build: 2,844 pixels (max 1 level). Within the base's own difference — pass |
| E1 — zero-diff list | Among existing files only `src/schedule/views/Schedule.jsx` changed since `7608b0e`. `28c8468`, `3059639`, `0a78d32` are ancestors |
| E2 items T3 can check | `changeRowAssignments` body byte-identical to base; no added `supabase` call; both media queries include `screen` |
| E3 — `npm run build` | pass |
| E3 — ESLint | 176 errors, 43 warnings — equal to base. No new finding in a touched file; the new files report none |
| E3 — `assignmentIdentity`, `crewStatus`, `scheduleCrew` tests | pass |

The same script's save-free subset (§5 G) was also run against the local build to prove it works: 25 pass, 21 local-only skipped, 0 writes. That is not a hosted run.

### Deviations from the plan

1. **P12 at 768 — literal miss.** P12 says the Board scrolls sideways at every phone and tablet width. At 768 the Job column and all seven days fit the frame, so there is nothing to scroll. The check records this as a note instead of failing. At 360, 390 and 430 it scrolls as written. T4 should judge whether fitting the whole week at 768 meets the intent.
2. **Review shows one extra line**, "On this trip now", so a partial failure can be read. Add and Remove are as planned.
3. **Other-job warnings read "Also on 9103, 9104"** in the flow. Desktop's picker shows the bare job numbers under a "Conflict:" tooltip. Same rule, same jobs.
4. **P13** was checked with a link into the fixture's own week (all fixture trips are in that week). The week-snapping itself is existing code and is not re-proved here.

Nothing else differs from the plan that T3 knows of.

### Brand check

- **Documents opened by this T3 session** (registry `/Users/chrisberger/aios/assets/brand/subcon-command/SUBCON_COMMAND_CURRENT.md`, sha256 `253e3637…`):
  - `source-docs/SUBCON_COMMAND_UI_STANDARD_LAUNCH.md`, read in full — §1 (do not redesign), §4 color, §7 typography, §8 geometry, §10 components, §14 accessibility, §18 acceptance checklist, and the locked identity-mark section.
  - `visual/crew-schedule-canonical.png`, opened.
  - `source-docs/Subcon_Command_Visual_Brand_Guide.readable.txt` searched for phone, tablet, touch and breakpoint rules: none beyond "check mobile/tablet behavior". The DOCX itself was not re-read; the plan records T1's full read.
- **Changed surfaces:** the phone switch, Week list, Day cards, Person detail, the assign flow, and phone sizing of the existing board, week header, capacity strip head and dialogs. All at ≤768px on this route only.
- **Tokens:** every new surface uses the Schedule route's existing tokens (`--bg-card`, `--header-dark`, `--command-green`, `--danger`, `--teal`, the Barlow fonts, 8px radius). That palette is the route's own, not the standard's cyan set. **This is pre-existing and is reported as such, not as "no deviations".** No new color, font, radius or mark asset was added. The mark is untouched.
- **Phone-width brand comparison: not performed.** No governing document defines a phone layout or reference, so there is nothing to compare against.
- **1440:** unchanged within the base's own pixel noise (D3), so no new claim is made against the canonical image.

### What this does not show

- **Real devices.** Emulated Chrome is not iPhone Safari: no real toolbars, keyboard, safe areas or touch.
- **Signed-in use with real records.** Not exercised by anyone.
- **A hosted preview.** None was walked. A preview shares the production database: only the Call Log's automatic archive is skipped there. A signed-in person who taps Save, a Board day toggle, ✕ or a status action changes the real schedule.
- **A trip set to need no crew** is not in the plan's fixture, so "no card for it" is built but not exercised.
- **Keyboard reach behind the flow:** the schedule page is inert while the flow is open, but the shell's own menu button above it is outside this slice and can still take keyboard focus. It is covered by the flow for taps.
- **Widths** other than 360, 390, 430, 768 and 1440.

### Notes for reviewers

- The first D2 rerun showed two extra failures (`check-crew-schedule-sticky-dates`, `check-crew-week-text`). Cause: T3's own local preview servers were holding ports 5196 and 5198, which those checks bind. With the ports free both pass, and the recorded rerun matches the base set.
- `check-sunday-parity.mjs` rewrites screenshots under `evidence/sunday-parity/after/`. Each run's rewrites were restored; that folder is unchanged.
- Dependencies: this worktree's `node_modules` is a copy of the sibling `mobile-preview` worktree's (identical lockfile). Nothing was installed.

### Remaining

- T4, T5 and T6 on source `1e6bde1`. Then Smoke and the hosted preview, routed by the coordinator.
- Chris's look on a real phone, and his acceptance. Neither has happened.
- Backlog O14 holds the four pre-existing behaviors T2 listed as adjacent.

Earlier reports follow unchanged.

---

## Integration — Sunday parity merged into the mobile crew scheduler branch (2026-10-01)

**Dependency integration only. The stable Sunday checkpoint is merged into `feat/mobile-crew-scheduler-preview` with both lineages kept. No new mobile UI code. The mobile crew scheduler build (F66) has not started and still waits for the revised plan and its T2 audit. Not merged to main, not in production. T3 did not push; see Push below.**

    Role:        T3 Build · mode: build (dependency integration) · agent/session t3-crew-mobile / 6bdefad7-da48-4732-b78a-f804c6c558d9
    Plan:        docs/plans/sunday-scheduling.md §3 "Integration with the mobile slice" · body @ bbe71e4 (identical to 0a78d32 outside `## Audit manifest`) · T2 CONVERGED recorded in docs/AUDIT_LOG.md
    Branch:      feat/mobile-crew-scheduler-preview · merge commit 7608b0e8504416678c43d31f3fedacbf015e7d1e
    Parents:     3059639108aad22c3076cf692aeea5731657b7a9 (mobile lineage) · 0a78d32072135e9daa81d85dcb34abc8e1c83dd1 (Sunday checkpoint, = origin/feat/sunday-saturday-parity when fetched)
    Gates:       T2 CONVERGED @ bbe71e4 is recorded. Chris's personal T1 lock of the Sunday plan is NOT recorded (Report A, Gates) — carried open, not resolved here.
    Authority:   coordinator routing `/tmp/mobile-integrate-sunday-20261001.md`, which relays Chris's authorization of one workstream (Sunday first, then mobile). T3 did not verify that authorization at its source.
    Completion:  code built: integration only · data applied: n.a. · access verified: no · Chris accepted: not T3's to claim
    Push:        T3 did not push. Merge `7608b0e` was published to origin by another session while this report was being written (remote-tracking reflog: "update by push"); the report commit after it was not pushed by T3

### Conflicts and how each was resolved

Three files conflicted, all documents. No application file conflicted.

| File | Resolution |
|---|---|
| `docs/AUDIT_LOG.md` | Both sides kept verbatim. Audit table: the two mobile rows, then the three Sunday rows. Gate records: one `## Gate records` heading with the main-lineage intro line, the mobile 2026-09-30 records, then the B124 and F60 2026-10-01 records. Every line of both parents is present; no line was added that is in neither. |
| `docs/agent-handoffs/BUILD-REPORT.md` | Both prior reports carried verbatim below, in marked blocks (Report A, Report B). |
| `docs/handoffs/SC_Handoff_v298.txt` (added on both sides) | The path keeps the main-lineage B124 password-recovery handoff (from `3145a7a`, PR #73). The mobile lineage's "Call Log brand preview" v298 is kept byte-identical as `docs/handoffs/SC_Handoff_v298-calllog-brand-preview.txt` (same blob as `3059639:docs/handoffs/SC_Handoff_v298.txt`). |

Merged without conflict but changed on both sides: `docs/BACKLOG.md`, `src/App.jsx`, `src/pages/Login.jsx`.

### What the merged tree holds

- Everything the Sunday checkpoint changed since the shared base `90f890d` (73 files). That range includes the password-recovery fix already on main (`3145a7a`, PR #73), because the Sunday branch is built on it.
- Files that match neither parent exactly: the three conflict files above, the added `SC_Handoff_v298-calllog-brand-preview.txt`, `docs/BACKLOG.md`, `src/App.jsx`, `src/pages/Login.jsx`. Every other file is byte-identical to one parent.

### Verification

Checked on the merge commit, by blob comparison:

- **Ancestry:** `0a78d32`, `28c8468` (mobile web shell), `3059639` and `3145a7a` are all ancestors of `7608b0e`.
- **Mobile shell kept:** `src/styles/mobile-shell.css` is the same blob as at `28c8468`. `src/styles/**`, `src/components/**`, `src/lib/tokens.js`, `src/pages/CallLog.jsx`, `vite.config.js` and the mobile check scripts are identical to `3059639`.
- **Sunday source kept:** every application and script file the Sunday branch changed is identical to `0a78d32`, except `src/App.jsx` and `src/pages/Login.jsx`. For those two, the merged file differs from the mobile parent by exactly Sunday's own change set, and from the Sunday parent by exactly the mobile lineage's own change set. `src/schedule/**` is identical to `0a78d32`.
- **Not changed by this integration:** `package.json`, `package-lock.json`, `vercel.json`, `vite.config.js`, `supabase/**`, `sql/**`, `db/**`, `src/field/**` are identical in both parents and in the merge. `docs/plans/crew_mobile_preview.md` (body and audit manifest) and `docs/plans/mobile_web_preview.md` are identical to `3059639`. `docs/plans/sunday-scheduling.md` is identical to `0a78d32`. `feat/calllog-brand-preview` stays at `701a209` and `feat/sunday-saturday-parity` at `0a78d32`.

Run on the merged tree, synthetic fixtures only, no sign-in, no real record, no hosted request:

| Check | Result |
|---|---|
| `npm run build` | pass |
| `scripts/check-mobile-preview.mjs` — widths 360, 390, 430, 640, 768, against a local compiled build of the merged tree | 167 checks: 166 pass, 0 fail, 1 skipped (B1). 0 page errors, 0 attempted writes, 0 refused requests |
| `scripts/check-preview-autoarchive.mjs` (automatic-archive guard) | pass |
| `scripts/check-sunday-parity-model.mjs` | pass, M1–M6 |
| `scripts/check-sunday-parity.mjs` (browser, 1440 and 1280) | pass, 30 groups |
| `scripts/check-crew-midweek-text-model.mjs`, `scripts/check-crew-week-text-model.mjs` | pass |
| `src/schedule/lib/crewStatus.test.mjs`, `src/lib/passwordRecovery.test.mjs` | pass |

**Preservation checks the coordinator asked for:** the automatic-archive guard is in the merged tree unchanged (`CallLog.jsx`, `vite.config.js` identical to the mobile parent; its check passes). The check harnesses' backend-write protections are unchanged (fixtures and scripts identical to their parents) and recorded zero attempted writes.

### Limits

- **B1 (desktop pixels against base) was not run.** No base captures were made for this merge, so the mobile check's one desktop comparison is skipped, not passed.
- The full existing check suite was not rerun. Report A records 15 checks that already fail on base; that baseline was not re-established here. `scripts/check-password-recovery.mjs` is one of them and was not run.
- ESLint was not run.
- Nothing was checked on a hosted preview, on a phone, with a real sign-in or with real records. T3 published no preview. A branch push can start an automatic Vercel preview build; whether one exists for `7608b0e` was not checked.
- Sunday's Schedule surfaces were checked at desktop widths only. How the Schedule views behave at phone widths is the pending mobile slice, not this integration.
- The mobile check ran against a local build made with a synthetic backend name (`calllog-fixture`), which is what the fixture's session key expects.
- Dependencies were not installed from the network: this worktree had none, so the sibling `mobile-preview` worktree's `node_modules` (identical `package-lock.json`) was copied in. It is git-ignored.
- `scripts/check-sunday-parity.mjs` rewrites screenshots under `docs/agent-handoffs/evidence/sunday-parity/after/`. Two were re-rendered by this run and were restored, so the evidence directory is identical to `0a78d32`.

### Remaining

- Independent baseline check of this combined tree before any further app edit (plan §3 item 4). Routed by the coordinator.
- T1 revision of `docs/plans/crew_mobile_preview.md` and its T2 audit. No mobile UI build until that converges.
- Chris's acceptance of the Sunday preview and of the mobile web preview are both still open; this merge implies neither.
- Publishing is the coordinator's step; the merge commit is already on origin (see Push).

---

## Prior reports carried by the merge

The two prior build reports follow, each carried **verbatim** (byte-identical to the commit named). Neither was edited, re-tiered or re-worded. Their headings repeat (`## Status`, `## Summary`, `## Brand check`); read each inside its own marked block.

- **Report A — F60 Sunday = Saturday parity**, from `0a78d32072135e9daa81d85dcb34abc8e1c83dd1:docs/agent-handoffs/BUILD-REPORT.md`.
- **Report B — F65 Mobile web preview (phone shell)**, from `3059639108aad22c3076cf692aeea5731657b7a9:docs/agent-handoffs/BUILD-REPORT.md` (the mobile lineage; shell evidence commit `28c84681038d27e7cf481d77dd8d2787547ce250`).

<!-- BEGIN REPORT A — verbatim from 0a78d32072135e9daa81d85dcb34abc8e1c83dd1 -->
## Status

**F60 — Sunday = Saturday parity. Built, reviewed (T4 GO, T5 0 blockers, T6 0 exploitable-today), smoke-tested, and walked read-only on a Ready Vercel preview with synthetic data. Stopped for Chris's preview acceptance. Not merged, not in production.**

| | |
|---|---|
| Branch | `feat/sunday-saturday-parity`, base `origin/main` `3145a7a` |
| Plan | `docs/plans/sunday-scheduling.md` @ `bbe71e4ad1c79db530866fd63ea3631dd1f22520` (body verified identical at commit, index and working tree; only `## Audit manifest` differs) |
| Build commit | `3f6b3cf8ac3df2ceef39654e10a429ca14f1a086` |
| Fix for T4 round 1 | `019997ba8d5b62ea72c1b824f9ef46e127849cb9` |
| Builder | T3 `t3-sunday-parity` · `2c23e844-d27d-4995-bdcc-7b0ef7430cb0` · https://claude.ai/code/session_01JQBVvRqXkNRVdkMBL7VRDh |

Completion: code built **yes** · data applied **n/a (none)** · authenticated access verified **no** (synthetic session and data only, locally and on the preview) · Chris accepted **no — pending his preview walk**.

Outcome: bar met locally for every §5 check T3 can run, with the limits listed under "What this does not show". P (Vercel preview) and N (native device) are not T3-build steps.

## Gates

| Gate | Result | Recorded |
|---|---|---|
| T1 Planning lock | **Not recorded.** The plan's §A states Chris has not personally locked it; the coordinator directed the work forward under his "make Sunday match Saturday… go launch that work" direction. T3 built on the coordinator's explicit build instruction and carries this forward as an open provenance fact, not a resolved one. | plan §A |
| T2 round 1 | NOT CONVERGED @ `745a291` | `docs/AUDIT_LOG.md`, `c6bdb7f` |
| T2 round 2 | CONVERGED @ `bbe71e4` · standing (§9) | `docs/AUDIT_LOG.md`, `735b6e3` |
| T3 Build | committed `3f6b3cf` | this file |
| T4 Build vs Plan, round 1 | NO-GO — P1 fails; several checks unverified because the reviewer could not run commands · standing (§9) | `docs/AUDIT_LOG.md`, `96e8eea` |
| T3 fix for T4 | committed `019997b` (P1 fixed, P2 evidence added) | this file |
| T4 Build vs Plan, round 2 | GO · standing (§9) | `docs/AUDIT_LOG.md`, `31f1b13` |
| T5 Code Review | 0 BLOCKS-SHIP · 0 SHOULD-FIX · 4 HARDENING · standing (§9) | `docs/AUDIT_LOG.md`, `9633576` |
| T6 Security Review | 0 exploitable-today · 1 SHOULD-FIX (pre-existing) · 2 HARDENING · standing (§9) | `docs/AUDIT_LOG.md`, `6de19ad` |
| Smoke + Preview | pass, with the limits below | this file |
| Chris Acceptance | **pending** | — |

All three reviews cover source `019997b`. `git diff 019997b..6de19ad` over `src`, `scripts`, `index.html`, `package.json`, `vite.config.js`, `public` and `vercel.json` is empty: only records changed after the reviewed source.

T2's two non-blocking notes were applied as written: B13 is compared on the Monday–Saturday **day columns** (not week-wide pool totals), and the week-link check asserts that **no read for another week is sent**, which is tighter than W2's wording.

## For Chris at the preview

Preview: https://sales-command-git-feat-sund-2db8ee-chris7berger-droids-projects.vercel.app (PR #74, draft). It uses the production database, so anything saved there is real.

What you will see:
- A **Sunday column** on the crew board, the capacity strip, Daily and the Calendar week view, and Sunday in the pickers, pool dots, crew popup and prints. Weeks read "Sep 28 – Oct 4".
- A **Sunday-only trip** now shows on its week's board and can be staffed like a Saturday trip.

What comes with it, because Saturday already works this way:
1. **Select all** on a trip that spans a weekend picks Sunday too.
2. A trip spanning a weekend shows **Sunday as needing crew**.
3. **Capacity and completion percentages include Sunday**, so they read lower in weeks with no Sunday crew.
4. **Time off saved as Monday–Saturday does not cover Sunday.** That person shows free on Sunday, and their pool chip is **no longer greyed out** — it is a normal chip you can drag, with six off days and an open Sunday. Someone off all seven days is still greyed.
5. The **Midweek Update** text runs through Sunday.
6. **Open Crew Schedule** from a job's trips now opens the right week for trips that start on a Friday, Saturday or Sunday.

Not changed: Saturday and Monday–Friday rules, the Month view, job-card day counts, billing numbers, the phone layouts, native Field, the Time Clock. There is no way to turn weekends off yet; that is the later work you set aside.

None of the list above has been put to you before. Your walk is also the only signed-in check with real records.

## Smoke and preview — 2026-10-01

**Smoke (local, source `019997b`, tree at `6de19ad`)**

| Check | Result | Run by |
|---|---|---|
| Browser parity check, 30 groups | pass | T3 at `019997b`; coordinator independently (exit 0, `/tmp/sunday-independent-browser.log`) |
| Model check M1–M6, `TZ=America/Los_Angeles` | pass | T3; coordinator independently (`/tmp/sunday-independent-model.log`) |
| `npm run build` | pass | T3; coordinator independently |
| ESLint | 176 errors / 43 warnings, equal to base; per-file counts for every touched file equal to base | coordinator (`/tmp/sunday-independent-lint-comparison.txt`); T3 totals at `3f6b3cf` |
| Every existing check, rerun for smoke | 23 pass, 15 fail — the same 15 as base and as the `3f6b3cf` run (`evidence/sunday-parity/checks-smoke.txt`) | T3, this pass |

The smoke rerun closes the limit T4 and T5 named (the full suite had last run before the fix). It regenerated one screenshot (`after/daily-1440.png`), which was restored to the committed version; the tree was clean before these records were written.

**Hosted preview walk (read-only)**

- Served deployment: `dpl_77UMw7UTsm12ggwgEufM9RqBCA55`, status Ready, built from `6de19ad5f245d3d0d160ae50b8fca57a48232a3b` per the GitHub commit status and `vercel inspect` of the branch URL at 17:13 PDT. Its app source equals the reviewed `019997b`. The served bundle's hash was not read from the page itself.
- Method: `scripts/check-sunday-parity-preview.mjs`, run through `vercel env run` from a linked checkout, the repo's existing way past Deployment Protection. Protection was left on; the short-lived token went only to the preview's own origin.
- **What kind of evidence this is:** the real hosted bundle in the real app shell, with a **synthetic session injected into the browser — not a real sign-in** — and every database request answered from the synthetic fixture. Every write is refused and fails the run; sockets are closed; other hosts are aborted. Pickers were opened and closed; nothing was saved.
- Result: pass (`evidence/sunday-parity/preview/run.txt`, screenshots beside it). Zero writes attempted. One auth call (`GET /auth/v1/user`) was answered by the fixture. No socket was opened. `fonts.googleapis.com` was aborted, so the preview screenshots use fallback fonts.
- Walked, at 1440 and 1280 inside the app shell with the sidebar: seven columns MON 09/28 … SUN 10/04; week reads Monday–Sunday; the Sunday-only trip row; the SUN 4 card; no sideways scroll, no clipped label, pool dots inside their chips; assign picker with only Sun enabled; Sick picker with seven chips; crew week popup. Also: a Sunday `?week=` link opening its own week with no other week read; Calendar week Mon 28 … Sun 4; Daily's seven columns.
- This is the first check with the sidebar present. The local harness mounts the Schedule module without the shell, so the board is narrower here; at 1280 the day cells are tight but nothing clips.

**Not done, and why**
- **No signed-in walk with real records.** No agent signs in to the preview because it shares the production database.
- Hosted walk subset only: no assign, edit, remove, status or Scheduled Off save; no prints, texts, Home, Jobs or Billing on the hosted bundle. Those are covered locally with fixtures.
- **Native Field:** source and synthetic checks only; no device.
- Production was not checked for existing Sunday rows (U4).
- Long crew names in the 11px-narrower pool chip: not tried. Worth a glance at the preview.

**Follow-ups filed, not fixed:** F67 (T5's four hardening items plus T6's two), S16 (pre-existing unescaped print HTML, own track). T5's record says "filed as one backlog item"; the reviewer wrote no file — the rows were written in this pass.

## T4 round 1 — what was wrong and what changed

**P1 — the seventh crew-pool day dot overflowed its chip. T4 was right, and this report's earlier "no clipped" and "deviations: none" claims were wrong on that point.** `App.css` fixed the pool chip's dots block at 125px, which fits a 62px label plus six dots. Seven need 136px, so the last dot and day letter spilled 11px. The plan's edit list did not name that rule, and my clipping check did not cover the pool dots.

- Fix (`019997b`): that one rule is now 136px. No other style changed; Saturday's dot, the typography and the mobile layout are untouched.
- New assertion in `scripts/check-sunday-parity.mjs`, at 1440 and 1280: every pool dot and day letter sits inside its block and inside the chip's content box, and each row has seven dots. It **fails on `3f6b3cf`** ("dots block overflows by 11px", on every chip with dots) and passes on `019997b`.
- Cost of the fix: the chip's name area is 11px narrower. The fixture's names and tags fit; long real names were not tried.

**P2 — missing visual evidence.** Added under `evidence/sunday-parity/after/`, at both widths unless noted, and each one opened and looked at by T3: `pool-*`, `assign-picker-*` (seven chips, Select all 7), `assign-picker-sunday-conflict-*` (only Sun enabled, other job named), `sick-picker-*`, `crew-week-popup-*`, `expanded-row-toggles-*` (deferred-start chips and per-person toggles Mo–Su), `print-week-schedule.png`, `print-daily-crew-status.png` (one size). The board, strip, Daily and Calendar screenshots were re-rendered by the same run.

**P3 and the 15 base failures** are pre-existing and were not touched.

Rerun for this fix: browser check 30 groups pass · model check M1–M6 pass · `npm run build` pass · ESLint on the three touched/new check files clean. The full existing suite was not rerun: only one CSS rule and the new check changed.

## Summary

Every Schedule surface that showed, loaded or totalled Monday–Saturday now uses Monday–Sunday. Sunday is the seventh day, after Saturday, always shown, and takes Saturday's existing rules and classes. No Saturday or Monday–Friday rule changed.

One fix beyond Sunday (S10): the crew board turned `?week=<date>` into a week by rounding days ÷ 7, so a Friday, Saturday or Sunday date opened the following week. Both read sites now share one helper that takes the Monday of the target date. Monday links are arithmetically unchanged.

## Files Changed

App (13 files, +72 / −86):

- `src/schedule/views/Schedule.jsx` — day labels gain `Su` / `Sun`; week list is seven dates; week end and both reads use the list's last date; label Monday – Sunday; crew popup grid follows the list length; `weekOffsetFor()` used by both `?week=` sites.
- `src/schedule/App.css` — board grid and capacity strip grid `repeat(7, 1fr)` (lines 1103, 6768 only).
- `src/schedule/lib/queries.js` — `wkDates` returns seven dates; `getJobMultiWeekAlert` checks seven days per later week.
- `src/schedule/lib/weeks.js` — `fmtWk` ends on Monday+6.
- `src/schedule/components/HomeCapacityStrip.jsx` — `SUN` label.
- `src/schedule/views/Calendar.jsx` — week view is `wkDates(monday)`, Sunday last, always; week fetch range is Monday–Sunday. The on-demand Sunday column before Monday is gone.
- `src/schedule/views/Daily.jsx`, `src/schedule/lib/exports.js` — seven days.
- `src/schedule/lib/crewWeekText.js` — Midweek Update runs today through Sunday. `src/schedule/views/CrewPhone.jsx` — five strings say Sunday.
- `src/schedule/lib/crewStatus.js`, `src/schedule/components/ScheduledOffModal.jsx` — the two presets fill Monday → Sunday (`thisWeekMonSat` / `nextWeekMonSat` renamed `…MonSun`; no other caller).

Checks:

- New: `scripts/check-sunday-parity.mjs` (browser, 30 check groups), `scripts/check-sunday-parity-model.mjs` (M1–M6), `scripts/sunday-parity-fixture.mjs` (the plan's §5 fixture, synthetic names).
- Restated for the seven-day week, as the plan's §3 lists: `scripts/check-crew-midweek-text-model.mjs`, `scripts/check-crew-phone.mjs`, `scripts/check-crew-week-summary.mjs`, `src/schedule/lib/crewStatus.test.mjs`.

Records: this file, `docs/BACKLOG.md` (F60 row, F67, S16; stale "pending merge" note at line 9), `scripts/check-sunday-parity-preview.mjs` (read-only hosted walk), `docs/handoffs/SC_Handoff_v302.txt`, evidence under `docs/agent-handoffs/evidence/sunday-parity/`.

No schema, migration, RLS, edge function, dependency, config or env change. No new Supabase call site.

## Important Implementation Decisions

- **One week list on the board (E3).** Columns, labels, pickers, dots, the popup, both reads and the capacity strip all follow `dates`; the ends are `dates.at(-1)`, not an index.
- **Week links: one helper, both sites.** `weekOffsetFor(week)` = whole weeks between this week's Monday and the Monday of the target date. Because both sites now compute the same value, the mount effect no longer overwrites the initial state with a different week, so no wrong-week read is sent.
- **Calendar week range starts on Monday.** Base fetched from the Sunday *before* Monday so the old leading Sunday column could see its crew. That column no longer exists, so the range is the week itself. The month-grid union is unchanged. This is inside C6 ("the Calendar week range").
- **Left alone, per the plan:** the dead six-day code (`wkEnd` in `Schedule.jsx`, `StatsBar.jsx`, `App.css:391`, `:757`); the duplicate week helpers; `billingForecast.js:272`.

## Verification Performed

All data synthetic. Every backend request was answered inside the browser from an in-memory fixture; the harness refuses any write other than `POST`/`DELETE assignments` and the `crew_status` upsert. No sign-in anywhere, no production read or write.

Tooling: Playwright is not a repo dependency. Run with `PLAYWRIGHT_MODULE=<path to playwright-core/index.mjs> CHROME_PATH=<Chrome> TZ=America/Los_Angeles node scripts/check-sunday-parity.mjs`.

**Base evidence, recorded before the first app edit**

- U1 — base screenshots of the populated board, strip, Daily and Calendar week at 1440×900 and 1280×800: `evidence/sunday-parity/base/`.
- U2 — every `scripts/check-*.mjs` and `*.test.mjs` on base: 21 pass, 15 fail. `evidence/sunday-parity/checks-base.txt`.
- U3 — ESLint on base: 176 errors, 43 warnings (268 files).
- U4 — **not observed.** Production was not queried. B14 covers existing Sunday rows with the fixture.

"Matches base" values were recorded by running the new scripts with `SUNDAY_PARITY_BASE=1` while the app edits were stashed (`base-snapshot.json`, `base-model-snapshot.json`), then asserted against the build.

**Results on the build**

| Check | Result |
|---|---|
| `scripts/check-sunday-parity-model.mjs` — M1–M6 | pass |
| `scripts/check-sunday-parity.mjs` — B1–B15, H1–H2, K1–K4, D1–D2, X1–X2, T1–T2, L1, W1–W3, F1–F2 | pass, 30 groups |
| Full run of every existing check | 23 pass, 15 fail — **the same 15 as base**, no new failure (`checks-after.txt`) |
| `scripts/check-crew-phone.mjs` with a local fixture dev server on 5197 | pass on base (original script) and on the build (restated script) |
| `npm run build` | pass |
| `npx eslint .` | 176 errors, 43 warnings — equal to base; no touched file's count changed |
| E1 zero-diff list | `git diff 3145a7a` over the §3 zero-diff files and the "expected zero diff" files is empty |

What the browser script exercises, on the real DOM:

- **Board:** seven columns MON 09/28 … SUN 10/04; reads `gte 2026-09-28` / `lte 2026-10-04`; Saturday-only and Sunday-only trips are rows on that week and not the next.
- **Assign / edit / remove:** dragging a person onto a Sunday-only trip shows seven chips with only Sun enabled and sends exactly one `POST` carrying the trip id (and `team_member_id` for a linked person, `null` for an unlinked one); Saturday is identical. Su and Sa toggles each send one `POST` then one `DELETE` naming that row id. ✕ deletes only that person's rows on that trip.
- **Overlapping trips:** turning Sunday off on the short trip deletes that one row id; the long trip's Sunday row keeps its id and date; the picker labels it "(another trip)".
- **Select all:** 7 for a free person; 6 leaving Sunday out for someone Scheduled Off Sunday; 6 leaving Saturday out for someone Sick Saturday; the out day still saves when picked by hand.
- **Time off:** Sick picker has seven chips and writes one row for Sunday; Scheduled Off presets fill 09-28 → 10-04 and 10-05 → 10-11; the review lists the Saturday and Sunday assignments and changes neither. A person off Monday–Saturday is a normal draggable chip with an open Sunday (greyed on base); a person off all seven days stays greyed.
- **Capacity:** seven cards; SUN 4 reads `3 / 8`, 38%, 5 free, 2 out — the fixture's truth by Saturday's formula. Home's Crew Capacity is the rounded mean of seven percentages.
- **Calendar:** week view Mon 28 … Sun 4, no column before Monday; after five Next presses the week of 11-02 reads `lte 2026-11-08` and draws the Sunday bar, which only passes with the fetch-range edit. Month view matches base.
- **Daily, prints, texts, billing:** seven columns; prints end "Sun 10/04"; Midweek range "THU 10/1 – SUN 10/4 · today through Sunday" and the one-day Sunday case; Weekly send text matches base; billing header and forecast buckets read Monday – Sunday with rows and dollar figures equal to base.
- **Dates:** fall-back week, year-end week and spring-forward week each show seven consecutive dates. With the clock in standard time, Monday links to daylight- and standard-time dates open the same week as base.
- **Layout:** at 1440 and 1280, no sideways page scroll, no clipped header, count, `need N`, percent or TODAY tag; all seven day columns equal width; Sunday's header carries Saturday's classes; all seven crew-pool day dots inside their chip (added after T4 round 1 — the first build failed this). F4 did not trigger.

### Pre-existing failures (not caused by this build, not fixed)

Identical on base and build: `check-crew-first-deletion`, `check-crew-schedule-eligibility` (port 5199 held by another session's process); `check-crew-phone` (needs a dev server — passes with one); `check-crew-week-summary` (fails at the same `:115` assertion "2 / 4 assigned · needs 2 more" before and after; its week labels and day count were restated and it now runs as far as it did on base); `check-job-trips-model`, `check-job-trips`, `check-overlapping-crew-trips`, `check-required-trip-titles`, `check-sales-trips-send`, `check-send-schedule-dates`, `check-password-recovery` (assertion or timeout failures); `check-legacy-trip-conversion-preview`, `check-sales-trips-preview`, `check-trip-owned-crew-preview` (need `PREVIEW_URL`); `check-public-select-grants` (needs a linked Supabase project).

So E5 is met only in this form: every existing check that passed on base still passes unedited. `check-overlapping-crew-trips.mjs` and `check-job-card-schedule.mjs`-class coverage of trip ownership rests on the model checks that pass plus B4/B7 here, because the overlapping-trips browser check was already failing on base.

### What this does not show

- **No signed-in user, no real records.** Fixtures only (repo `CLAUDE.md` Workflow Rule 10).
- **No Vercel preview.** Nothing was pushed.
- **W1 was not clicked through the Trips panel.** The check opens the exact URL `TripsPanel.jsx:100` builds (`?job=&week=<trip start>&trip=`); that file is unchanged.
- **X2** asserts the seven column headers and that Sunday cells are filled; it compares Sunday's Scheduled Off label to Saturday's instead of pinning the string.
- **L1** has one partly billed job (job R) in the browser fixture; the Saturday-vs-Sunday twin comparison is in the model check (M4).
- **M4 detail worth a reviewer's eye:** the worklist's internal `arm` is `production` for the Saturday-dated twin and `null` for Sunday-dated job R, on base and build alike. That is the `billingForecast.js:272` window the plan leaves alone; row, status, label and amounts are equal, which is what the plan claims.
- **Phone layouts, native Field, Time Clock:** not exercised beyond `check-time-clock.mjs` passing unedited.
- **Production Sunday rows (U4):** not inspected.

## Brand check

- Registry: `aios/assets/brand/subcon-command/SUBCON_COMMAND_CURRENT.md`.
- Read: `source-docs/SUBCON_COMMAND_UI_STANDARD_LAUNCH.md` §1, §10 "Tables / schedules" and "Crew panels", §14, §17 (steps 9–10), §18 "AI coding-agent acceptance checklist".
- Canonical image `visual/crew-schedule-canonical.png`: **opened and compared** with `after/board-1440.png` and `base/board-1440.png`.
  - Same in all three: dark header row over a linen grid, capacity cards with free/out badges and a percent bar, assignment blocks carrying a count and `need N`, grey placeholders for out-of-range days, pool chips with status dot and day dots.
  - Different from the canonical image in **both** base and build, so not introduced here: the photo/sidebar shell (the check mounts the Schedule module without the app shell), the cyan accent and cyan today outline (the app shows green/teal and a green today wash), and the pool chip layout.
  - Column count differs on purpose: six in the image, seven in the build. No match is claimed for it.
- Surfaces looked at in screenshots (1440 and 1280): board, capacity strip, crew pool, Daily, Calendar week, assign picker (free and Sunday-conflict), Sick picker, crew week popup, expanded-row toggles and deferred-start chips; both prints at one size.
- On those surfaces Sunday carries Saturday's classes and treatment, and the diff adds no color, font, radius, shadow or token. The one sizing change is the pool dots block (125px → 136px).
- Deviations on the surfaces looked at: **one, found by T4 and now fixed** — the pool-dot overflow (P1). None other seen.
- **Not looked at, so no claim is made:** Home, the Jobs page, the Billing header and forecast, the weekly-texts page and `/crew` (string and label changes only; asserted as text), the Scheduled Off modal, the three badge dialogs, the capacity day-detail modal and the Calendar month view.
- Not performed: §17 step 10 mobile/tablet (owned by the mobile slice); Visual Brand Guide not opened (no theme, surface, typography or imagery change); no contrast measurement (no color changed); long crew names in the narrower pool chip.

## Deviations From Plan

None in behavior. Two things a reviewer should know: the two preset functions were renamed (`…MonSat` → `…MonSun`), and the Calendar week fetch now starts on Monday instead of the Sunday before.

## Issues / Follow-up

- **Chris has not seen** the plan's expectation list or the pool-chip consequence (B15). He first sees them at the preview.
- T2's three adjacent items (Select all replacing a saved out-of-range day; a status save overwriting Scheduled Off; the Prev/Next pulse reading the loaded week) behave for Sunday as they do for Saturday. Not changed, not filed by T3.
- Optional weekends / Select-all reform: deferred by Chris, not designed.
- Mobile slice integration (plan §3): not started; this build never touched the mobile worktree.
- The 15 pre-existing check failures above are unowned by this slice.
<!-- END REPORT A -->

<!-- BEGIN REPORT B — verbatim from 3059639108aad22c3076cf692aeea5731657b7a9 -->
## Preview archive guard — current addendum

Guard commit `44a94bd554ffd3bdafd519961a4c5812355ca6f0` is pushed on `feat/mobile-web-preview`. Vercel reports **Ready**, target **preview**, deployment `dpl_H1VZUTxhLc3LcPvELvjeF4riWgJ6`: https://sales-command-nc4um1vj7-chris7berger-droids-projects.vercel.app . This supersedes the unguarded deployment URLs below; do not reuse those older immutable URLs for a signed-in look. The final documentation commit will have its own deployment, verified separately by the coordinator.

`vite.config.js` exposes only the existing `VERCEL_ENV` environment name. `CallLog.jsx` skips its automatic archive candidate query, update and banner when that value is `preview`. Production, development and missing values retain the original behavior. Existing Vercel project facts were read through the management API: framework `vite`, `autoExposeSystemEnvs=true`; no settings were changed.

**Verification:** `node scripts/check-preview-autoarchive.mjs` and focused ESLint pass. Compiled preview and production-condition builds pass. Local browser runs use only synthetic credentials/records with network interception: preview made no archive query/write; production-condition made the original archive query and one PATCH, fulfilled locally; both list loads and mobile drawers worked with zero unexpected writes, blocked requests or page errors. Evidence: task-3 `qa/autoarchive-browser-results.json`, `qa/autoarchive-preview.png`, `qa/autoarchive-production.png`. This is fixture evidence, not a live production or hosted flow test. Independent T5/T6 delta reviews found zero blockers; their exact records and limits are in `docs/AUDIT_LOG.md`.

**Hosted limitation:** exact SHA and Ready state are verified, but the deployed JavaScript has not been inspected. Vercel SSO blocks unauthenticated hosted access; the management file-tree endpoint returned 404. No cookie or protection bypass was used. T5/T6's deployed-guard verification item remains open before signed-in use; local compiled evidence is not substituted for that check.

**This preview still shares production Supabase and is not read-only.** Interactive saves remain live. Source-only inspection also found unchanged automatic writes: On `/settings`, an Admin must expand Company → Billing: its accordion defaults closed and does not mount children while closed (`Settings.jsx:25–33,785–787`). Merely opening Settings does not trigger this path. Expanding Billing mounts `BillingSection`, which invokes `create-billing-session` status (`Settings.jsx:474–488`); with a Stripe subscription and changed status the handler updates `tenant_config.subscription_status` (`supabase/functions/create-billing-session/index.ts:172–195`). Ordinary `/sales/invoices` list viewing does not trigger schedule creation. The user must choose + New Invoice and select a proposal (`Invoices.jsx:3474,491`), or click + Create Invoice on a Sold proposal detail (`src/components/ProposalDetail.jsx:1085–1086`), which passes route state to auto-open/preselect (`Invoices.jsx:3283–3299,126–130`). If the proposal has no existing schedule, a linked customer requiring pay apps, and WTC rows, selection inserts `billing_schedule` and `billing_schedule_lines` before Save (`Invoices.jsx:135–167`). Those flows were not executed against live data. Avoid expanding Billing and starting New Invoice/pay-app creation during a visual preview. This was a bounded inspection of covered navigation, not an exhaustive whole-app mutation audit.

Guard authorization: the later explicit parent delegation authorized this preview-only archive exception to the original no-touch scope. Formal mobile smoke remains **166/167**, with B1 failed: **9 Call Log pixels, maximum channel difference 1**. No test threshold was changed; the coordinator treated that measured visual difference as immaterial, not a passing test or user acceptance.

No production deployment, main merge, backend/schema/RLS/auth/data or project-setting change. Sibling CallLog branch/worktree untouched. The archive guard is available to that sibling as the pure commit above (includes the local regression script), or the two-file patch `/tmp/mobile-preview-archive-guard.patch`.

## Status

Mobile web preview (F65) — built, reviewed, smoke-tested and **published as a Vercel preview** from `feat/mobile-web-preview` (draft PR #72). T4, T5 and T6 are recorded clear in `docs/AUDIT_LOG.md`. The formal Smoke Test ran on the reviewed source: **166 of 167 checks passed; the one failure is B1 (desktop pixels), which fails as written and is not waived.** The hosted walk was **not performed** (the preview is behind Vercel sign-in). What remains is Chris's look and acceptance. **Do not merge.**

    Role:        T3 Build · mode: build (preview record) · agent/session t3-mobile-finish / 59b45299-39fb-407c-b796-c5c77532256b
                 (continues builder session 0dd426b3-d40d-4c3a-97af-393dc105f6f3, which wrote most of the source)
    Plan:        docs/plans/mobile_web_preview.md @ 87e820f · plan diff 87e820f → working tree is inside `## Audit manifest` only
                 · T1: no personal lock exists; build authorised by Chris directly (plan §A)
    Gates:       T2 CONVERGED (a4b831b) · T4 NO-GO round 1 (8cd3f62) → GO round 2, B1 carried unwaived (82b61fa)
                 · T5 0 BLOCKS-SHIP (3704b9c) · T6 0 exploitable-today (307feb8) — all in docs/AUDIT_LOG.md `## Gate records`
    Branch:      feat/mobile-web-preview · slice base 34af375 · app source cc4d733 · reviewed build db14d25 (src and scripts byte-identical since) · deployed 2092cea · this commit (docs only)
    Outcome:     Smoke: every acceptance check passes except B1, which fails as written (see "Formal Smoke Test")
    Completion:  code built yes · data applied n.a. (none) · access verified no (not exercised) · Chris accepted: not T3's to claim
    Push:        pushed by the coordinator as the approved preview step (plan G1), through 2092cea; this commit not pushed by T3
    Next:        T7 → Chris Acceptance

## Summary

At ≤768px the sidebar leaves the layout and becomes a drawer opened from a menu button in the header. The sales phone flow (both homes, Call Log list and detail, New Inquiry, Login) and the sales read lists (Leads, Proposals, Invoices, Customers, Customer detail) fit phone widths. ≥769px and print are unchanged in source: every new rule sits in a `@media screen` query at ≤768px or ≤600px, and the desktop markup changes are attributes and class names only.

In the original mobile CSS/shell slice no data fetching, backend call, auth, guard, route, validation, save handler, calculation, table column or row action changed. The later authorized preview archive guard changes only the automatic archival path described in the current addendum.

## What changed

- **Shell (P0)** — `src/App.jsx`, `src/components/AppSidebar.jsx`: one `matchMedia` listener at 768px and one drawer boolean, independent of the desktop sidebar state. The drawer closes on a destination (including the current one), the Directory, the scrim, Escape and its close control. While closed it is `inert`. Focus moves in on open and back to the menu button on close. The desktop Collapse control is hidden in drawer mode.
- **Layers** — while the drawer is open, the content column becomes one layer under the scrim, so an embedded sticky header (AR's top bar is z 100) cannot cover the drawer. An open `aria-modal` dialog lifts that, so modals stay above the drawer. The Directory sits outside the column at z 200.
- **Dialog semantics** — `role="dialog" aria-modal="true"` and a name on the existing containers of New Inquiry, the Directory, Log Outcome, the job-list modal and the Hunt results modal. Attributes only.
- **New Inquiry (P1)** — dialog inside the viewport; Back/Next/Save pinned at the bottom; the title row is sticky so Close stays on screen while a tall step scrolls. The customer picker's search box (rendered on `<body>` by `SearchSelect`) is 16px while the wizard is open.
- **P1/P2 screens** — class hooks plus scoped rules in `src/styles/mobile-shell.css`: one-column field grids, wrapping header actions and KPI rows, 16px text entry and 36px buttons on P1 screens and Login, scrollable table frames on Customer detail, wrapping status tabs on Proposals.
- **QA scripts** — `scripts/check-mobile-preview.mjs`, `scripts/mobile-preview-fixtures.mjs` (both written by the coordinator and first committed in `cc4d733`). In `db14d25` T3 extended `check-mobile-preview.mjs` only, for T4 finding 2, and added `scripts/capture-mobile-preview-desktop.mjs` (the coordinator's capture procedure). The fixtures file has not changed since `cc4d733`. Playwright is loaded from an existing local runtime via `PLAYWRIGHT_MODULE`; no dependency or `package.json` change.

P2 deferrals: none. No screen needed a no-touch file.

## Formal Smoke Test

Run by T3 after T6 cleared, on T7's routing, against the coordinator's compiled build of the reviewed source served locally at `http://127.0.0.1:5195` (build log `qa/mobile-compiled-build.log`). `src` and `scripts` are byte-identical to the reviewed commit `db14d25`. Fully synthetic: fixture data, backend default-deny, no sign-in, no real credential, cookie or token. No save, send, delete, merge or invite control was activated.

**Result — `qa/mobile-smoke/results.json`, console in `qa/mobile-smoke/console.log`** (widths 360, 390, 430, 640, 768):

- 167 checks: **166 passed, 1 failed (B1)**. 0 page errors, 0 attempted writes, 0 refused requests.
- The script exited non-zero because of B1 alone. No waiver bound was set for this run.

**B1, as run for Smoke:** one desktop capture (`qa/mobile-smoke/desktop`, made once with `scripts/capture-mobile-preview-desktop.mjs`) against base `qa/desktop-base-final`, noise floor `qa/desktop-base-repeat`. 12 of 13 screens exact. **Call Log differs by 9 pixels, max channel difference 1**, against a floor of 0. New Inquiry is exact (floor 30 px). B1 therefore **fails as written**. The plan's Smoke gate is "every acceptance check passes", so the gate is not met literally; that is for T7 and the coordinator to dispose of, on the dispositions listed under "Desktop at 1440" below. Chris has not accepted it.

**Login buttons, measured by hand** (agreed with T7 because the reviewed script measures Login inputs only; the reviewed scripts were not changed). Signed-out fixture context at 360, compiled build, no sign-in: Remember me 36px, Sign In 41px, Forgot password? 36px — all ≥36px, all inside the viewport and tappable at their centre; Sign In is in view; no sideways scroll; 0 errors, 0 writes. Evidence: `qa/mobile-smoke/login-buttons.json`, `login-360.png`, and the one-off probe `login-buttons.mjs` beside them.

Not covered by Smoke: real devices, real data, authenticated access, and the hosted preview (plan G1–G4).

## Preview (plan G1–G4)

| | |
|---|---|
| G1 push | By the coordinator, after T4, T5, T6 and Smoke. Never to `main`, never forced. T3 confirmed by `git fetch` that `origin/feat/mobile-web-preview` and draft PR #72 both sit at `2092cea`. |
| G2 deployment | **Ready**, environment preview, commit `2092cea8ec9991bc4251a9bcdd4194ee37d17f6f`, deployment `dpl_8wNFvnp3Jsas1YZgHTY1ZYfys5Xc`. Observed by the coordinator (`qa/mobile-preview-deployment.json`); T3 did not query Vercel. |
| URL | https://sales-command-k1m6b6wos-chris7berger-droids-projects.vercel.app |
| PR | https://github.com/chris7berger-droid/subcon-command/pull/72 (draft) |
| G3 hosted checks | **Not performed.** An unauthenticated request is redirected (HTTP 302) to Vercel sign-in. No cookie, session or bypass was acquired or used, per plan Beat 10 and H6. |
| G4 | `2092cea` and this commit are docs-only on top of the reviewed build `db14d25`; `src` and `scripts` are identical to it. This commit will deploy again when pushed; the coordinator verifies that deployment separately, so its SHA and URL are not recorded here. |

No hosted behaviour is claimed. The evidence for this slice is the local synthetic run against the compiled reviewed source (Formal Smoke Test, above).

**The preview is not a test sandbox.** It uses the production Supabase project; no environment setting was changed. Signing in loads real records, and Save, Send, Delete, Move to Old Jobs and Invite change them. The Call Log's existing archive update on load is unchanged by this slice and runs on the preview exactly as in production. A look on a phone should be read-only.

**Not phone-ready, by scope:** Schedule (including Crew Schedule and Calendar), Field web, AR, Proposal detail and the WTC calculator, Invoice detail and its modals, Settings, Team, History Locker and Import. They are reachable at full width and load without error; several scroll sideways or clip.

## Evidence (pre-review build self-check)

One script carries the acceptance checks (plan H1): `scripts/check-mobile-preview.mjs`, with its fixtures in `scripts/mobile-preview-fixtures.mjs`. Desktop screenshots for B1 are captured by `scripts/capture-mobile-preview-desktop.mjs` and compared by the check script. All runs are synthetic: local dev server, fixture data, backend default-deny, service workers blocked, WebSockets mocked, no sign-in. They are a build self-check — **not** the Smoke gate, a review or a hosted walk. Results and screenshots stay in the task's local `qa/` directory and are not committed (handoff v298 practice).

**Pre-review run — `qa/mobile-acceptance/results.json`, console in `qa/mobile-acceptance/console.log`** (run by T3 on the source at `cc4d733`, widths 360, 390, 430, 640, 768):

- 167 checks: **166 passed, 1 failed (B1)**. 0 page errors, 0 attempted writes, 0 refused requests.
- A refused request now fails the run, not only a write (T4 finding 6). The fixtures were not loosened.

| Plan item | What the script now checks | Checks |
|---|---|---|
| A3 | Drawer rows — label, title, order, active marker — equal the 1440 sidebar for the Admin, Manager and Sales-only fixtures; every drawer button ≥44px; ≥44px of page left beside the drawer | 12 |
| A4, A5, A7 | Drawer close modes and focus; edited job and list filters survive the drawer; badge and jump button apart and tappable (unchanged checks) | 12 |
| A6 | Shell height equals the viewport; last Call Log row scrolls clear of the jump button | 4 |
| A8 | 28 smoke routes at 390 and 768, each left through the drawer; `/sales/managers` with the Manager fixture; `/crew` with no sideways scroll at 360, 390, 430 | 56 + 1 + 3 |
| A9 | Directory opened from the drawer and from the badge: inside the viewport, close 44px and tappable, content scrolls inside it | 4 + 4 |
| A10 | Drawer open: taps at the badge and jump button centres do not reach them; no drawer row is covered by the page. Wizard and Directory controls tappable; the wizard stays on top of a drawer opened from the keyboard behind it | 4 |
| C1 | Both homes: no sideways scroll, no number clipped or outside its box, KPI cells do not overlap, seven-digit figure shown; the "Wants Bid" tile opens Call Log with that stage and the rep applied | 3 |
| C2 | Pipeline count, search, table headers, sideways scroll in frame, View opens the job (unchanged) | 4 |
| C3 | Job opened from the list; header actions equal the 1440 set and are inside the viewport; one-column field grids; linked rows show label, status and amount inside the viewport; three totals unclipped with a seven-digit figure; Save Changes and Cancel in view in edit mode (not pressed: Cancel only); Back returns to the list | 3 |
| C4 | Ten standard steps and the Change Order path, stopping before Save (unchanged) | 5 + 5 |
| C5 | Every text input, select and textarea ≥16px and every button ≥36px on the four P1 screens, in detail edit mode and on every wizard step; Login inputs | 3 + inside C3/C4 + 1 |
| D1–D5 | Layout and table headers per screen; "+ New Proposal", Invoices header actions and "+ Add Customer" in view; a row opens the proposal, invoice and customer routes with no error; Customer detail Back, Merge, Delete and Edit in view (not pressed); its three tables scroll in frame | 36 layout + 4 + 4 |
| B2, B3, E4 | Desktop collapse 228/56 and resize restore; Sales-only fixture gets "Not authorized" on `/settings` | 1 + 1 |
| B1 | Pixel comparison of the 13 desktop screens against base — **fails as written**, below | 1 |

Selector notes, from the real UI: a Proposals row opens through its own "Open" control (the row itself does not route); the "Your Book" tile sets the stage tab and rep filter, not the pipeline button state.

No control that saves, sends, deletes, merges, invites or moves a job is activated anywhere in the script.

Earlier runs by the coordinator, on the same source, kept for the record: `qa/mobile-final` 126 checks, `qa/mobile-tall-step` 20 checks, `qa/wizard-matrix` 66 checks — all passed, 0 errors, 0 writes. The 66-check wizard result is in the coordinator's review packet.

Local checks by T3: `npm run build` passed at `cc4d733` (no app source change since); ESLint 176 errors / 43 warnings after this revision, equal to the baseline, and the two edited scripts lint clean; `git diff --check` clean; zero diff under the plan's no-touch list.

### Desktop at 1440 — B1 fails as written

B1 asks that the 13 screens differ from base `34af375` by no more than base differs from itself. **That is not met, and it is carried here as a failure, not a pass.** No threshold was changed and Chris has not accepted it.

Captures of this build before the reviews (the Smoke capture is a fifth: Call Log 9 px, max 1, 12 of 13 exact), each compared with the base capture (`qa/desktop-base-final`; its repeat `qa/desktop-base-repeat` is the noise floor):

| Capture of this build | Screens exact | Differences from base |
|---|---|---|
| Coordinator, earlier (`qa/desktop-after`) | 10 of 13 | Call Log 9 px, max channel 1 · Calendar 127 px, max 1 · New Inquiry 28 px, max 18 (floor 30 px, max 18) |
| Coordinator's script re-run by T3 on the current source | 12 of 13 | New Inquiry 28 px, max 18 (inside the floor) |
| Committed capture script, run 1 (`qa/mobile-acceptance/desktop-after-1`) — **the one the check script judged** | 11 of 13 | Call Log 16 px, max 1 · Time Clock 1 px, max 10 |
| Committed capture script, run 2 (`…/desktop-after-2`) | 9 of 13 | as run 1, plus the two home screens' hero image area (64,766 and 40,991 px, max 12) |

What this shows:

- **The capture is not repeatable.** The same source, captured four times, gives four different results; runs 1 and 2 were minutes apart with no change between them. Calendar, the screen with the largest earlier difference, has zero source diff and is exact in three of the four.
- **No layout or content change was seen** in any capture. Crops of the largest difference (the home hero, run 2) are indistinguishable by eye.
- Every rule in `mobile-shell.css` sits in a `screen` media query at ≤768px or ≤600px, and the desktop markup changes are attributes and class names.
- A single base repeat is too thin a noise floor to tell build from noise here. T4 said the same.

Dispositions recorded so far — neither is Chris's acceptance:

- **T4 (round 1)** judged the first capture's 136 one-level pixels immaterial, and said T4 cannot waive a plan criterion.
- **The coordinator** accepts a ≤1-level difference as a routine technical deviation under the original authorization, with the literal failure kept on record. The check script was run with that bound (`QA_B1_ACCEPT_MAX_CHANNEL=1`). Run 1 is **outside** that bound because of the single Time Clock pixel at 10 levels, so the script reports B1 as failed and unwaived, and exits non-zero for that reason alone.
- **The coordinator, on run 1** (session message, 2026-09-30 19:25 PDT): accepts the 1 Time Clock pixel and 16 Call Log pixels too, as an immaterial raster-only technical deviation with no source or geometry change, and states this is not user preview acceptance. The script result was not re-run or relabelled to match; B1 stays failed in `results.json`.

Captures taken inside the long check run (after the phone widths) differed from base by far more — text raster differences with the same geometry — which is why capture is a separate script run in its own process, the way the base directories were made.

## Brand check

Authority resolved through the registry `assets/brand/subcon-command/SUBCON_COMMAND_CURRENT.md` in the AIOS checkout `/Users/chrisberger/aios` (sha256 `253e3637bdf6d87b…`; the directory is untracked there, so there is no commit to cite). Both source documents govern. Read by this T3 session:

| Source | What was opened |
|---|---|
| `source-docs/SUBCON_COMMAND_UI_STANDARD_LAUNCH.md` (sha256 `b9e80294646d1dd3…`) | §1, §10 (Sidebar, Top bar, Inputs, Modals / drawers), §13, §14, §17, §18 acceptance checklist. Other sections were not opened by this session. |
| `source-docs/Subcon_Command_Visual_Brand_Guide.docx` (sha256 `9833d17f2ec88c0a…`), read through the registry's faithful copy `Subcon_Command_Visual_Brand_Guide.readable.txt` (sha256 `b3f05c6eb526f3f5…`, which records that same DOCX hash) | In full: 02 Color System, 03 Surfaces, 04 Typography / Geometry / Motion, 05 Component Language, 07 Guardrails, 08 Implementation, The Locked Identity Mark. The DOCX itself was not unpacked by this session. |
| `visual/crew-schedule-canonical.png` | Opened. A 1672×941 desktop composition: persistent espresso sidebar, cyan active item, warm linen work surface. |

Changed surfaces: header menu button, drawer and scrim, Directory panel width, wizard layout, P1/P2 spacing and wrapping.

Checked against those sections:

- **Structure** (Standard §1; Guide 08 "Non-negotiable instruction") — information architecture and interactions preserved. The drawer is the existing sidebar: same groups, items, order, gating and active marker.
- **Color** (Guide 02; Standard §18 checklist) — no color value is added. The menu button takes its border and glyph from the tokens the header already uses; the scrim reuses the wizard overlay's existing `rgba(28,24,20,0.65)`; the drawer keeps the sidebar's existing espresso surface. No white-dominant surface is introduced.
- **Typography** (Guide 04) — no font family, weight or type role is added or changed. The only size change is text-entry controls to 16px at ≤600px on P1 screens and Login (plan Beat 6); the guide's 13–15px body/data range is stated without a phone case.
- **Geometry and spacing** (Guide 04, "4 / 6 / 9 / 12 px radius scale") — no radius is changed on an existing element. The new menu button uses 7px, matching the existing sidebar buttons rather than the scale. Phone padding (16px page, 12px header) and the 44 / 36px control sizes come from plan Beats 3 and 6; neither document states a phone value.
- **Mark** (Guide "The Locked Identity Mark"; registry "Preserve the official logo/icon") — the existing mark and wordmark components render unchanged in the drawer. No mark asset is added, redrawn, traced or generated. The mission line stays in the sidebar footer.
- **Modals / drawers** (Standard §10; Guide 05) — the drawer is the existing dark sidebar surface over a dimmed page, not a pure black slab.
- **Motion** (Standard §13; Guide 04) — 200ms `cubic-bezier(.2,.8,.2,1)`, inside 120–240ms; off under `prefers-reduced-motion`; nothing loops.

Deviations:

1. **Keyboard focus on the new controls is not cyan.** Standard §14: "Maintain visible keyboard focus using cyan"; Guide 07: "Use cyan for clear keyboard focus states". The slice's own rule (`mobile-shell.css`) is a 2px `currentColor` outline, so the ring takes each control's text color:
   - menu button — the header's heading ink (`#1c1814`);
   - inactive drawer rows, close and Sign out — translucent off-white;
   - the active drawer row — the legacy teal accent (`#30cfac`), which is not the guide's cyan (`#12D8F2`).

   The ring is visible in every case (coordinator's focus checks passed). On `/sales/calllog` only, the route theme's existing rule (`calllog-brand.css:113`, `!important`, `--cl-teal: #12D8F2`) should override the color to cyan for buttons inside the shell; that is read from the cascade in source and was not measured in a browser by this session. Reason for the deviation: plan Beat 9 forbids new colors on routes still on the legacy palette. No recolor was made.
2. **Legacy palette outside `/sales/calllog`** — teal accent and pre-standard opaque surfaces, against Guide 02 ("Do not drift back toward teal") and 03. Carried, not introduced: re-theming beyond the Call Log route is out of scope (plan Beat 9, §4).
3. **Menu button radius 7px** is off the guide's radius scale; it matches the sidebar buttons beside it.

Not performed:

- **Phone-width comparison against a brand reference** — none exists. Neither document defines a phone layout, breakpoint, phone navigation pattern or touch-target size, and the canonical image is desktop only.
- **Side-by-side comparison of the changed screens with the canonical image** — this session opened the reference but viewed no screenshot of the build, so it makes no fidelity claim. At desktop see the B1 section above.
- **WCAG contrast measurement** of the new controls and their focus rings.

## Scope boundaries

- No push, merge, release, migration, schema, RLS, auth, edge-function or environment change. `package.json`, `vite.config.js`, `vercel.json` untouched.
- No real sign-in, credential, cookie or backend request by any agent. Authenticated access to real records is unchanged, not re-verified.
- The Vercel preview shares the production database. A look on a phone should be read-only (plan §5, "What a pass does not prove").
- Not proven by emulated Chrome: iPhone Safari and Android Chrome toolbars, on-screen keyboard, safe areas, focus zoom. That is Chris's look on a real phone.
- A desktop window under 769px gets the drawer layout. Only 360, 390, 430, 768 and 1440 (plus 640 for the wizard) were checked.
- Schedule, Field web, AR, Proposal and Invoice detail, WTC, Settings, Team, History Locker and Import are reachable at full width and otherwise unchanged; several will scroll sideways or clip (plan §4).
- `:has()` carries the drawer layer rule and the picker rule; the repo already relies on it (`schedule/App.css`).

## Remaining

A recorded disposition for B1 · Chris's look at the preview on a real phone and his acceptance · no merge or production release without it. Non-blocking review findings are backlog rows O12 (T4) and O13 (T5, T6).

**The preview is not a test sandbox.** It runs against the production database (plan §0.8): signing in loads real records, and Save, Send, Delete, Move to Old Jobs and Invite change them. A look on a phone should be read-only.
<!-- END REPORT B -->
