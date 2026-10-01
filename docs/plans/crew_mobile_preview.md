# Mobile crew scheduler preview — Crew Schedule at phone width

**Status:** DRAFT for T2 (original). **Not locked by Chris personally** — see §A. T2 convergence is the gate before build. **App edits are on hold** until the manager names a stable Sunday commit (§A item 5, §3).
**Author:** T1 / `t1-crew-mobile` (Claude Code session `69f2b966-cf6c-47b6-813d-b777b86b1a51`) · 2026-10-01
**Slice:** `crew_mobile_preview` · backlog F66 · branch `feat/mobile-crew-scheduler-preview` · base `28c84681038d27e7cf481d77dd8d2787547ce250` (F65 mobile shell + preview archive guard). Next handoff is v300.
**Phase:** Planning → Plan Audit (T2, independent). Mode: FOCUSED. No later gate is skipped by this plan.

Tags
- `[LOCKED]` + its source: **user** (words relayed in the coordinator's packet, §A) · **delegated** (T1's choice inside the approved direction; T2 may challenge it; Chris sees it at preview) · **brand** · **repo**.
- `[DERIVED]` — T1's reading of source, for T2 to verify. `[UNOBSERVED → T3]` — a baseline check T1 did not run (§5 U). `[DESIGN-OPEN]` — none in scope (§4). `[BLOCKED]` — none.

## §A Authorization record (quoted — not a lock)

Source: the coordinator's packet in this worktree (`node_modules/.cache/crew-mobile-review/brief.md`, `t1-task.md`, `coordination.md`; untracked). T1 has not seen Chris's own messages. These are relayed words.

1. Direction (brief): "compact week overview with staffing gaps/conflicts; day-focused job/TRIP cards; person-week view; tap → choose person → choose days → review → save; weekly board remains accessible with deliberate horizontal scrolling and fixed job labels; desktop behavior preserved. First meaningful tasks: find tomorrow's gaps, assign a person to the correct trip, change their days without disturbing a sibling trip." Chris: "ok go", then "no you should give AIOS a prompt and manage it".
2. Boundaries (brief): "preview branch/deployment only; no main merge or production deploy, no backend/schema/RLS/auth/project-setting/data changes. Preserve established queries/identity, trip/mobilization IDs, time off, archived roster eligibility, unknown staffing, unavailable/legacy assignment visibility, existing conflict behavior and business calculations. No orchestration/framework/dependencies introduced for this slice. … reusing existing assignment functions. … No arbitrary loss of columns/actions."
3. Gate (t1-task): "no personal plan lock has been observed, do not falsely claim it or add routine technical permission gates. T2 independent convergence is required before T3 implementation."
4. Sunday (coordination): "Mobile week strip must use current scheduler dates (Mon–Sat) and clearly disclose current Sunday limitation. Do not add an editable Sunday or alter date-loader windows."
5. Hold (coordination, latest): "Sunday parity IS NOW separately authorized and another AIOS App session owns it. Mobile must not independently implement Sunday. Finish mobile plan and report files, but HOLD APP EDITS until manager coordinates a stable Sunday commit. Avoid baking six-day assumptions into new presentation; consume existing dates array so later Sunday integration is scoped, while current baseline remains six days."

What this does and does not establish:
- It replaces the Planning lock (repo `docs/DEVELOPMENT_PROTOCOL.md` Planning gate; AIOS dev protocol §3) with T2 agreement, for this request. Recorded here as a departure, not resolved silently.
- AIOS protocol §14 asks T1 to settle unsettled brand decisions with Chris before lock. Not done. They are made under the delegation and tagged `delegated` (Beats 3, 4, 8).
- No personal lock, acceptance or approval of this document by Chris is recorded or claimed. Chris Acceptance after the preview is unchanged.

## §0 Baseline — observed 2026-10-01 at `28c8468`

**Evidence and its limits**
- Source read in full: `src/schedule/views/Schedule.jsx`; `src/schedule/lib/{crewScheduleRows,scheduleCrew,crewStatus,assignmentIdentity,allocations,trips,crewWeekSummary}.js`; `src/schedule/components/{CrewWeekCapacity,HomeCapacityStrip,ScheduleTripDetails,ScheduledOffModal}.jsx`; `src/schedule/ScheduleLayout.jsx`; `src/schedule/views/CrewPhone.jsx`; `src/styles/mobile-shell.css`; and the cited parts of `src/schedule/App.css` and `src/App.jsx`.
- Existing synthetic evidence: F65's formal Smoke loaded `/schedule/schedule` at 390 and 768 as "no error" only, with empty schedule data (`scripts/check-mobile-preview.mjs:38`, `:212`; `scripts/mobile-preview-fixtures.mjs:16` has no scheduler table). F65's plan §0.4 measured about 825px of content need on this screen, empty, before the shell change.
- **No rendered baseline of a populated Crew Schedule exists at this base, and T1 did not make one** (stopped by manager direction). Every geometry statement below is derived from CSS, not measured. The unobserved checks are U1–U4 in §5.

**0.1 Layout `[DERIVED]`**
- The crew pool is a fixed 280px column (`App.css:812–820`). The board grid is `260px repeat(6, 1fr)` (`:1100–1104`). `.sch-main` and `.sch-brd` clip their overflow (`:1006–1013`, `:1088–1098`). On this route the content region is a fixed-height column that does not scroll (`:483–494`). No media query touches a `.sch-*` rule (`:6962–6967` covers the capacity strip and Home panels only).
- So at 360–430 the board gets 48–118px for a 260px first column, and its day columns cannot be scrolled to. At 768 it gets about 456px.
- The three dialogs have minimum widths of 340, 360 and 380px (`App.css:1808–1815`, `:2005–2009`, `:1889–1892`).

**0.2 Interaction `[DERIVED]`**
- Assigning a person to a trip starts only from a `drop`. `handleAssignCrew` has two call sites, both `onDrop` (`Schedule.jsx:896–900`, `:1131–1135`); chips are `draggable` (`:1273`). A tap on a chip opens the crew week popup (`:1276`). A tap on a day cell does nothing. `src/schedule` has no touch or pointer handler.
- The day picker already exists (`:1412–1473`). It names the job and trip, dims out-of-trip days, labels each conflict — the other job's number, "(another trip)" for a sibling trip, or the status when the person is out (`:1441–1450`) — offers Select all / Clear all over assignable days only (`:461–476`), and has Cancel and Assign with a "Saving…" state. It has no review step. Conflict text is 8px in a 60px label, otherwise a `title` (`App.css:1867–1878`).
- There is one save path: `applyAssignModal` → `changeRowAssignments(row, name, selectedDays)` (`:483–533`). It re-finds the row, inserts through `newAssignmentRows` with `mobilization_id` set to the trip id and `team_member_id` (`assignmentIdentity.js:18–52`), and deletes only that row's own assignment ids. It refuses an unavailable row, a second save in flight, an archived person on that date, an out-of-trip day, new crew on a legacy row, and a job with no saved trip. On error it shows the message, reloads, and leaves the picker open.
- Expanded board rows also carry per-person day toggles and ✕. Each tap writes at once, with no review (`:1159–1169`).
- Sick, Call In, No Show and Scheduled Off start from buttons that appear only on chip hover, 18px square (`Schedule.jsx:1284–1289`; `App.css:933–954`).
- A person's week today is a popup with one line per **job**, so two trips of one job merge into one line (`:1476–1558`). The pool chip's dots are per trip row (`:1232–1250`).
- The week is `dates`: six dates, Mon–Sat (`:18–19`, `:42–50`, `:203`). Sunday is on none of these surfaces.
- Rows, warnings and numbers come from: `crewWeekRows` — saved-trip rows, legacy "Crew history" rows, unavailable-job rows and `row.issue` text (`crewScheduleRows.js:40–73`); `crewRowStaffing`, where `needed` null means unknown (`:27–32`); the board cell's "need N", "need ?" and "2X" rules (`Schedule.jsx:887`, `:909–918`) and its double-booking map (`:342–352`); `crewWeekCapacity` and `crewWeekSummary` behind the capacity strip and its three badges; roster eligibility in `scheduleCrew.js`.

**0.3 Brand sources read**
Registry `assets/brand/subcon-command/SUBCON_COMMAND_CURRENT.md` (AIOS checkout). UI standard `source-docs/SUBCON_COMMAND_UI_STANDARD_LAUNCH.md`, read in full. Visual Brand Guide `.docx`: text extracted by T1, 265 paragraphs, identical to the registry's reading copy; sha256 `9833d17f…0a80` matches the hash that copy records. Canonical image `visual/crew-schedule-canonical.png` opened: a 1672×941 desktop composition, byte-identical to the DOCX's first image.
- No governing document defines a phone layout, a breakpoint, a touch-target size or a phone schedule pattern. A phone-width brand comparison cannot be performed.
- The Schedule route uses its own tokens (`src/schedule/index.css:1–43`, e.g. `--command-green`, `--teal`), not the standard's cyan set. Pre-existing. Not changed here.

## ID8 decisions

- **Beat 1 — Objective `[LOCKED · user]`:** on a phone the Crew Scheduler does three things: find tomorrow's gaps; assign a person to the correct trip; change their days without disturbing a sibling trip. Preview branch only. Desktop behavior preserved.
- **Beat 2 — Phone views `[LOCKED · user]`:** Week (compact overview with gaps and conflicts), Day (job/trip cards), Person (a person's week), and the weekly Board (full grid, sideways scroll, fixed job labels).
- **Beat 3 — Breakpoint `[LOCKED · delegated]`:** the phone layout applies at ≤768px, the breakpoint the base shell already uses (`src/App.jsx:389–397`, `src/styles/mobile-shell.css:8`). ≥769px is unchanged.
- **Beat 4 — How the views are reached `[LOCKED · delegated]`** — affected UI: `/schedule/schedule` at ≤768px · options: (A) one view at a time behind a four-way switch, Week first; (B) all sections stacked on one long page; (C) separate routes · chosen **A**: one route and one data load, nothing to scroll past, and the canonical reference already shows a view switch in this toolbar (visual precedent only). A link carrying `?job=` opens on Board, where today's row focus lives.
- **Beat 5 — Edit flow `[LOCKED · user]`; where it starts `[LOCKED · delegated]`:** tap → choose person → choose days → review → save. It starts from a trip: Assign on a Day card, a person already on a Day card, a trip line in Person, or Assign crew in a Board row's expanded crew section. Assignment that starts from a person (choose a trip for them) is not built.
- **Beat 6 — Review is phone-only `[LOCKED · user]`:** desktop keeps today's one-step picker. Adding a step there would change desktop behavior.
- **Beat 7 — Rules `[LOCKED · user]`:** no validation, eligibility, conflict, staffing or identity rule changes. Conflicts and time off warn; they do not block — as today. The save is the existing save.
- **Beat 8 — Theme `[LOCKED · delegated]`** — affected UI: every new phone surface · options: (A) the Schedule route's existing tokens; (B) the brand standard's tokens on new surfaces only; (C) re-theme the screen · chosen **A**: B leaves one screen in two palettes, C is a different slice. No new color, font or radius. No logo or mark change `[LOCKED · brand]`.
- **Beat 9 — Mechanism:** `[LOCKED · user]` no new dependency, framework, state library or route. `[LOCKED · delegated]` new CSS sits in `@media screen and (max-width: 768px)`; any viewport test is the browser's `matchMedia`, as the shell already does.
- **Beat 10 — Days `[LOCKED · user]`:** phone views render the scheduler's existing `dates` array and its labels — six days, Mon–Sat, on this base — and never a day list or count of their own. This slice adds no Sunday, no editable Sunday, and changes no date window. Sunday parity belongs to another slice.
- **Beat 11 — Statuses `[LOCKED · delegated]`:** Person offers the four status actions the desktop chip has, opening the existing dialogs. On touch they are unreachable today, and marking someone out is a phone-in-hand task. Their save code is not changed.
- **Beat 12 — QA `[LOCKED · user]`:** synthetic records, fake credentials, every backend request answered inside the browser, service workers blocked, default-deny. Saves run only against intercepted responses. No agent signs in anywhere.

## §1 Problem / intent

On a phone the Crew Schedule cannot be worked. The board is clipped to a sliver, crew can only be assigned by dragging, and the time-off buttons need a hover.

Intent: Chris opens the preview on a phone, sees the week's gaps, opens tomorrow, puts the right person on the right trip, and changes someone's days — with a review before anything saves — while desktop stays as it is.

## §2 Proposed change (≤768px, `/schedule/schedule` only)

**Frame.** A four-way switch — Week · Day · Person · Board — with Week selected on load. The week label and Prev / Next / This Week stay in view in every view. + Job, Actions and Weekly crew texts stay reachable. The page never scrolls sideways; only the Board does, inside its own frame. Changing week keeps the selected view.

**Week.** One entry per day in `dates`: weekday and date, today marked, the capacity strip's numbers for that day (assigned / available, free, out), and three counts of what the board already marks for that day — trips short of a known need, trips with unknown need, people double-booked. The three badges (Jobs Starting, Jobs Ending, Jobs Needing Crew) and the "crew requirements unclear" link keep their numbers and lists. Tapping a day opens Day on it.

**Day.** A day selector over `dates`, then one card per board row whose cell for that day is not empty on the board — it has crew that day, or it is in range with a known or unknown need — in board order. Each card shows job number and name, trip label and date range, lead, the people on it that day, the board cell's staffing text, `2X` on double-booked people, and the row's issue text where the board shows one. Below the cards: that day's Free and Out people (today's day-detail lists). A trip that can take crew has Assign. Legacy and unavailable rows show their issue and no Assign.

**Person.** The pool as a list: same people, grouping, order, status dots, `2X` and out labels. A person opens to: a status for each day in `dates`; one line per **trip** they are on (job number, trip label, days, issue flag), so sibling trips stay separate; their Scheduled Off ranges with Edit Dates and Remove; the phone link; and the four status actions.

**Board.** Today's board, whole: the Job column, every day column, every row, and the expandable row editor with all its controls. It scrolls sideways in its frame with the Job column and the date header fixed. The expanded crew section gains Assign crew wherever desktop would accept a drop.

**The flow.**
1. *Person* — the week's roster as in the pool. People who are out on every day in `dates` cannot be chosen (on desktop they cannot be dragged). People already on the trip are marked. Skipped when the flow starts from a person.
2. *Days* — today's picker rules, unchanged: one button per day in `dates`, out-of-trip days disabled, the person's current days on this trip preselected, Select all / Clear all over assignable days only. Each conflict or status is readable text on the day, not a tooltip.
3. *Review* — person; job number; trip label and date range; days added; days removed; every warning for the chosen days. Clearing all days reads as removing the person from this trip. With no change it says so, and saving sends nothing.
4. *Save* — the existing save path, same arguments. A busy state while it runs; no second request. On failure the existing message is shown, the flow stays on Review with the selection intact, and the user can retry or cancel. On success the flow closes and every view shows the reloaded week.

Cancel, Back and close are available at every step and never write.

**Constraints**
- `[LOCKED · user]` ≥769px is unchanged: no new control, no review step, drag-and-drop as today.
- `[LOCKED · user]` No new or changed Supabase call. No change to a guard, message, eligibility, conflict, staffing, capacity or identity rule. Existing files in `src/schedule/lib/` have zero diff.
- `[LOCKED · user]` Every warning the board, pool and picker show today appears in the phone views wherever the same row, person or day is shown.
- `[LOCKED · user]` `/crew` (`CrewPhone.jsx`) is untouched.

**Expectation check**
- Chris will see, on a phone: the week with each day's gaps; tomorrow's trips as cards; Assign → person → days → review → save; a person's week by trip; the time-off actions; the full board by sideways scroll.
- He will not see: Sunday (six days, Mon–Sat, until the Sunday slice lands); a review step on desktop; phone-shaped trip editing, + Job or Actions dialogs; Calendar, Daily or any other Schedule screen; assignment that starts from a person; drag on touch.
- **Gap:** none known beyond those limits. Not confirmed with Chris personally.

## §3 Files / surfaces likely touched `[DERIVED]`

- **Overlap with the Sunday slice — reported before any edit:** `src/schedule/views/Schedule.jsx` and `src/schedule/App.css`, at base `28c8468`. This slice changes no day list, week helper or date window in them.
- New files under `src/schedule/` for the phone views, the flow and a presentation-only helper.
- `src/schedule/ScheduleLayout.jsx` and `src/schedule/components/{CrewWeekCapacity,HomeCapacityStrip,ScheduledOffModal}.jsx` — class hooks only, if needed.
- New files under `scripts/`: one focused check script and its scheduler fixture.
- T3's records: `docs/agent-handoffs/BUILD-REPORT.md`, the F66 row, `docs/handoffs/SC_Handoff_v300.txt`.

Zero diff `[LOCKED · user/repo]`: every existing file in `src/schedule/lib/`; `src/schedule/views/` other than `Schedule.jsx`; `src/App.jsx`, `src/components/**`, `src/styles/**`, `src/pages/**`, `src/lib/**`, `src/field/**`, `src/ar/**`; every existing file in `scripts/`; `supabase/`, `db/`, `sql/`, `package.json`, `package-lock.json`, `index.html`, `vite.config.js`, `vercel.json`, `eslint.config.js`.

**Base and hold.** T3 does not start until the manager names the base that carries the stable Sunday commit. If that base is not `28c8468`, T3 first re-checks §0.2 on it and reports any difference. A difference that changes a `[LOCKED]` decision or the scope comes back to T1.

## §4 Out of scope / deferred

- Sunday in any form. Any change to `DAYS`, `DAYS_LONG`, `wkDates`, `getMonday`, `workdays.js` or a date window.
- Phone layouts for trip editing, + Job / Add to Schedule, the Actions dialogs (Crew List, Work Types, Export), and the other Schedule routes (Home, Jobs, Calendar, Daily, Logistics, Billing and the rest). They stay reachable and are not reworked.
- Assignment that starts from a person; crew search; drag-and-drop on touch; a review step on the Board's existing day toggles and ✕ (they keep writing per tap, as on desktop).
- Applying the brand theme to Crew Schedule; any logo or mark work. `[DESIGN-OPEN]`, deferred: gap-first ordering of Day cards; a landscape layout.
- Desktop changes of any kind; `/crew`; native Field Command; backend, schema, RLS, auth, settings, data; `main`; production; merge; return-to-tab refresh of the board (an open backlog note); widths other than those tested.

## §5 Acceptance bar

**Harness.** `docs/plans/mobile_web_preview.md` §5 H1–H6 apply as written, with three changes. (1) One new script in the repo's `scripts/check-*.mjs` practice, run in the shell at the real route, adding no dependency. (2) A scheduler fixture held in memory: `jobs`, `job_mobilizations`, `crew`, `assignments`, `crew_status`, `work_types`. It can fail one week read (P15). (3) H4's "never activates a save" is replaced for one control only, the flow's Save: two writes — `POST` and `DELETE` on `rest/v1/assignments` — are answered inside the browser from that fixture, with a switch that makes them fail (the practice in `scripts/check-overlapping-crew-trips.mjs:54–63`). Every other non-read request is refused, logged and fails the run. No other save, send or delete control is activated. The clock is fixed to a Wednesday. Widths: 360, 390, 430, 768; desktop 1440.

**Fixture — fixed, synthetic names only.** The week of the fixed clock; "tomorrow" is its Thursday.
- Job A with two saved trips that overlap: A-wide (all week, needs 4) and A-short (Thu–Fri, needs 2). Person X is on both.
- Job B: one trip covering Thursday, needs 3, has 1. Job C: a trip with no crew requirement. Job D: fully staffed. One job name of 40 characters. One legacy crew day (no trip link) and one crew day on a job that is not in `jobs`.
- People: two teams and floaters; one Team-linked and one unlinked; one Sick on Thursday; one Scheduled Off on Friday; one out all week; one on two jobs on Thursday; one archived effective Thursday with crew days earlier in the week.

**P — phone: every phone and tablet width unless stated.** "Matches 1440" means equal to what the same build shows at 1440 for the same fixture.
- P1. The route loads in the shell with no page error and no sideways page scroll. The shell's menu button and drawer still work on it.
- P2. The switch shows Week, Day, Person and Board. Week is selected on load. Each is at least 44×44, named, exposes its selected state, and takes a tap at its centre.
- P3. The week label matches 1440. Prev, Next and This Week are in view in all four views. Next loads the next week, This Week returns, and the selected view is kept.
- P4. Week: its days equal the 1440 board's day columns, in order. Each day's assigned / available, free and out match the 1440 capacity strip. Each day's three counts equal what the 1440 board shows for that day: rows short of a known need, rows with unknown need, people on more than one row. The three badges match 1440 and open their lists inside the viewport. Tapping Thursday opens Day on Thursday.
- P5. Day (Thursday): the cards equal the 1440 board rows whose Thursday cell is not "—", in board order. Each card shows job number and name (the 40-character name is not clipped), trip label, date range, lead and that day's people, with the same staffing text, `2X` and issue text as 1440. A-wide and A-short are two cards. The legacy and unavailable cards show their issue and have no Assign. The Free and Out lists match the 1440 day detail.
- P6. Assign, success: Job B → Assign → the person list matches the 1440 pool, and the person who is out all week cannot be chosen → choose the Team-linked free person → the day buttons equal the 1440 picker's, out-of-trip days disabled → choose Thursday → Review shows the person, job number, trip label and range, Thursday added, nothing removed, no warning → Save sends exactly one `POST assignments` whose row carries Job B's `job_id`, its trip id as `mobilization_id`, `crew_name`, the date, and the person's `team_member_id` → the flow closes, the card shows the person and "need 1", and Week's Thursday counts match 1440. Repeated with the unlinked person, the row carries `team_member_id: null`.
- P7. Cancel: leaving from the person, days and review steps — by Cancel, Back, close and, at 768, Escape — sends no write and leaves the data as it was.
- P8. Failure: with the failure switch on, Save shows the response's message on screen, stays on Review with the selection intact, and changes nothing. While the request is open Save shows busy and a second tap sends no second request. With the switch off, Save succeeds.
- P9. Sibling isolation: on A-short's card tap X → Thursday and Friday are preselected → clear Friday → Review shows Friday removed and nothing else → Save sends exactly one `DELETE assignments` naming that one row's id, and no `POST`. A-wide's rows for X are unchanged in id and date, and A-wide's card still lists X on Friday. Reopening X on A-short shows Friday labelled as on another trip.
- P10. Warnings: the person who is Sick on Thursday shows "Sick" on that day and in Review; Select all leaves that day out; choosing it by hand still saves (warn, not block). A day where the person is on another job names that job in the days step and in Review. Choosing Thursday for the archived person and saving shows the existing archived message and sends no request.
- P11. Person: the list matches the 1440 pool in people, order, grouping, `2X` and out labels. X shows a status for each day and two trip lines, A-wide and A-short, each with its own days. Tapping the A-short line opens the days step for X on A-short. The Scheduled Off person shows the range with Edit Dates and Remove. Sick, Call In, No Show and Scheduled Off are present, at least 44×44, and each opens its existing dialog fully inside the viewport; closing it sends no write.
- P12. Board: header cells and row count match 1440. The board scrolls sideways inside its frame and the document does not. Scrolled fully right, the last day column is fully visible and the Job column has not moved. The date header stays in view while rows scroll. Tapping a job label expands the row; the day toggles and ✕ are present; Assign crew opens the flow for that trip and is absent on the legacy and unavailable rows.
- P13. A link with `?job=`, `?week=` and `?trip=` opens Board on that week with that row marked and in view.
- P14. Every control this slice adds is at least 44×44 and takes a tap at its centre. The flow has an accessible name, takes focus on open and returns it on close. At ≤600px, text-entry controls in dialogs opened from the phone views compute to at least 16px.
- P15. States: while a week loads, the views show the loading state and no numbers from another week. A week with no trips says so. A failed week load shows the existing error and Retry, and Retry loads it.

**D — desktop, 1440.**
- D1. No phone control is present. Pool, board and capacity strip render. The picker opened by drag has Cancel and Assign and no review step.
- D2. `scripts/check-overlapping-crew-trips.mjs`, unedited, passes — subject to U2.
- D3. A screenshot of the populated board differs from base by no more than base differs from itself. The literal counts are recorded. A miss is a failure, not a waiver.
- D4. 1440 → 390 → 1440 in one session: the week is kept, no overlay is stuck, and the desktop layout returns.

**E — preservation.**
- E1. `git diff <base>..HEAD` shows zero changes in the §3 zero-diff list.
- E2. Read from the diff by T4: saving still goes through `applyAssignModal` → `changeRowAssignments` with the same arguments; there is no new Supabase call site; no guard, message, eligibility, conflict, staffing, capacity or identity rule changes; new code holds no day list or day count of its own — the views read `dates`; every added media query includes `screen`.
- E3. `npm run build` passes. ESLint reports no new finding in a touched file and no more than the base totals (U3). `assignmentIdentity.test.mjs`, `crewStatus.test.mjs` and `scheduleCrew.test.mjs` pass.

**F — Brand check (in `BUILD-REPORT.md`).** It names the documents and sections checked (§0.3) and the changed surfaces. It states: new phone surfaces use the Schedule route's existing tokens — reported as pre-existing, not as "no deviations"; no new color, font, radius or mark asset; a phone-width comparison against a brand reference was **not performed**, because none exists; 1440 is unchanged, so no new claim is made against the canonical image.

**G — Vercel preview.** `docs/plans/mobile_web_preview.md` §5 G1–G4 apply with this branch's name. P–F are the Smoke Test, run locally on the reviewed commit after T4–T6. The coordinator pushes. The Ready deployment's SHA equals the reviewed commit. Hosted checks run only if the preview is reachable without a user cookie; otherwise they are recorded as not performed.

**U — baseline T1 did not observe. T3 records each before the first app edit.**
- U1. A rendered "before" of the populated route at all five widths: what is visible and reachable, and how much height the capacity strip takes. If it contradicts §0.1, T3 reports it.
- U2. Whether `scripts/check-overlapping-crew-trips.mjs` passes on the base in this environment. If it cannot run, D2 is recorded as not performed, with the reason. The script is not repaired.
- U3. ESLint totals on the base, and how the three existing dialogs sit at 360 (derived from CSS only).
- U4. Drag-and-drop by touch on a real phone. No agent can assess it. It stays unassessed.

**What a pass does not prove**
- **Real devices.** Emulated Chrome shows neither iPhone Safari's toolbars, keyboard and safe areas nor real touch. Chris's own look on a phone is that check.
- **Real data and access.** Fixtures prove layout and behavior, not that signed-in users see their records (repo `CLAUDE.md` Workflow Rule 10). No data path changes here.
- **The preview writes to production.** Preview and production share one database. A real sign-in on the preview that taps Save changes the real schedule. No agent performs that walk.
- **Other widths.** A desktop window under 769px gets the phone layout. Only the named widths are checked.

Completion claims stay separate: code built · data applied (none) · authenticated access (not exercised) · Chris's acceptance (pending).

## §6 Estimate

Agent elapsed time: about 90–120 minutes of build and local self-check, once the hold lifts. The reviews are separate. After them, about 15 minutes for the local Smoke Test, the push, the deployment and any hosted run.

Uncertain: U1 (how much vertical room the capacity content needs on a small phone); U2; how far the Sunday commit moves `Schedule.jsx` and `App.css`.
