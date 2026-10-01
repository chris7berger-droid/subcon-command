## Status

**F60 — Sunday = Saturday parity. Built and locally checked on `feat/sunday-saturday-parity`. T4 round 1 returned NO-GO; its P1 is fixed and its P2 evidence is added in `019997b`. Stopped at the T3 gate for the T4 delta review. No preview, not merged, not in production.**

| | |
|---|---|
| Branch | `feat/sunday-saturday-parity`, base `origin/main` `3145a7a` |
| Plan | `docs/plans/sunday-scheduling.md` @ `bbe71e4ad1c79db530866fd63ea3631dd1f22520` (body verified identical at commit, index and working tree; only `## Audit manifest` differs) |
| Build commit | `3f6b3cf8ac3df2ceef39654e10a429ca14f1a086` |
| Fix for T4 round 1 | `019997ba8d5b62ea72c1b824f9ef46e127849cb9` |
| Builder | T3 `t3-sunday-parity` · `2c23e844-d27d-4995-bdcc-7b0ef7430cb0` · https://claude.ai/code/session_01JQBVvRqXkNRVdkMBL7VRDh |

Completion: code built **yes** · data applied **n/a (none)** · authenticated access verified **no** (synthetic fixtures only) · Chris accepted **no — not T3's to claim**.

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
| T4 delta review / T5 / T6 / Smoke / Preview / Chris | not started | — |

T2's two non-blocking notes were applied as written: B13 is compared on the Monday–Saturday **day columns** (not week-wide pool totals), and the week-link check asserts that **no read for another week is sent**, which is tighter than W2's wording.

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

Records: this file, `docs/BACKLOG.md` (F60 row; stale "pending merge" note at line 9), `docs/handoffs/SC_Handoff_v302.txt`, evidence under `docs/agent-handoffs/evidence/sunday-parity/`.

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
