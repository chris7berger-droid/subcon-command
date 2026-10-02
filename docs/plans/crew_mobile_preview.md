# Mobile crew scheduler preview — Crew Schedule at phone width

**Status:** REVISION 2 for T2 — answers the round-2 audit of `2d9a223` (see Revision notes). **Not locked by Chris personally** — see §A. T2 convergence is the gate before build.
**Author:** T1 / `t1-crew-mobile` (Claude Code session `69f2b966-cf6c-47b6-813d-b777b86b1a51`) · 2026-10-01
**Slice:** `crew_mobile_preview` · backlog F66 · branch `feat/mobile-crew-scheduler-preview` · **build base `7608b0e8504416678c43d31f3fedacbf015e7d1e`** — the merge of the mobile lineage (`3059639`, which carries the F65 phone shell `28c8468` and its preview archive guard) with the Sunday checkpoint (`0a78d32`). The integration handoff is v303; this slice's build handoff takes the next free number.
**Phase:** Planning → Plan Audit (T2, independent, delta). Mode: FOCUSED. No later gate is skipped by this plan.

Tags
- `[LOCKED]` + its source: **user** (words relayed to T1, §A) · **delegated** (T1's choice inside the approved direction; T2 may challenge it; Chris sees it at preview) · **brand** · **repo**.
- `[DERIVED]` — T1's reading of source, for T2 to verify. `[UNOBSERVED → T3]` — a baseline check T1 did not run (§5 U). `[DESIGN-OPEN]` — none in scope (§4). `[BLOCKED]` — none.

## §A Authorization record (quoted — not a lock)

Sources: the coordinator's packet in this worktree (`node_modules/.cache/crew-mobile-review/`, untracked), T7's revision routing (`/tmp/mobile-t1-revision-20261001.md`), and messages in T1's session. T1 has not seen Chris's own messages and cannot tell whether a session message was typed by Chris or by the coordinator. These are relayed words.

1. Direction (brief): "compact week overview with staffing gaps/conflicts; day-focused job/TRIP cards; person-week view; tap → choose person → choose days → review → save; weekly board remains accessible with deliberate horizontal scrolling and fixed job labels; desktop behavior preserved. First meaningful tasks: find tomorrow's gaps, assign a person to the correct trip, change their days without disturbing a sibling trip." Chris: "ok go", then "no you should give AIOS a prompt and manage it".
2. Boundaries (brief): "preview branch/deployment only; no main merge or production deploy, no backend/schema/RLS/auth/project-setting/data changes. Preserve established queries/identity, trip/mobilization IDs, time off, archived roster eligibility, unknown staffing, unavailable/legacy assignment visibility, existing conflict behavior and business calculations. No orchestration/framework/dependencies introduced for this slice. … reusing existing assignment functions. … No arbitrary loss of columns/actions."
3. Gate (t1-task): "no personal plan lock has been observed, do not falsely claim it or add routine technical permission gates. T2 independent convergence is required before T3 implementation."
4. Sunday and base (T7 routing, replacing the original's items 4–5 — a six-day limit and a hold, still readable in `2e01618`): "Chris has explicitly consolidated Sunday first then mobile into one authorized workstream through tested previews. … New user direction supersedes the old six-day/no-Sunday limitation while keeping your presentation-only mobile intent." The routing names the combined base `7608b0e`.
5. Preview safety (T7 routing): "the combined preview retains existing Call Log preview-only auto-archive guard … plus backend-write protections during synthetic QA. Do not describe ordinary user browsing as globally read-only. … Preview still shares real DB and real user saves remain real."
6. Session message, 2026-10-01 17:35 PDT: "No new approval gate; stop after your plan-only commit."

What this does and does not establish:
- It replaces the Planning lock (repo `docs/DEVELOPMENT_PROTOCOL.md` Planning gate; AIOS dev protocol §3) with T2 agreement, for this request. Recorded here as a departure, not resolved silently.
- **Revision 1 changes a locked decision.** Beat 10 was "six days, no Sunday"; it is now "exactly desktop's days". T2 flagged this as a human gate. The change rests on item 4 as relayed. No personal re-lock by Chris is recorded; T2 and T7 can check item 4 at its source.
- AIOS protocol §14 asks T1 to settle unsettled brand decisions with Chris before lock. Not done. They are made under the delegation and tagged `delegated` (Beats 3, 4, 8).
- No personal lock, acceptance or approval of this document by Chris is recorded or claimed. Chris Acceptance after the preview is unchanged.

## §0 Baseline — observed 2026-10-01 at `7608b0e`

**Evidence and its limits**
- Source: read in full at `28c8468` for the original. For Revision 1, T1 re-read the Sunday changes to `src/schedule/**` and re-verified §0.1, §0.2 and every citation in this plan at the combined source. `src/` and `scripts/` are identical at `7608b0e` and at the commit this revision was written on (`ba322bf`).
- Lineage, checked by T1 with git: `28c8468`, `3059639` and `0a78d32` are ancestors of `7608b0e`. `src/schedule/**` and the Sunday checks are identical to `0a78d32`. `src/styles/mobile-shell.css`, `src/pages/CallLog.jsx`, `vite.config.js`, `scripts/check-mobile-preview.mjs`, `scripts/mobile-preview-fixtures.mjs` and `scripts/check-preview-autoarchive.mjs` are identical to `28c8468`.
- Existing synthetic evidence, recorded by others and not re-run by T1. On the combined tree (handoff v303): build passes; `check-mobile-preview` 166 pass, 0 writes; `check-preview-autoarchive` pass; `check-sunday-parity-model` and `check-sunday-parity` pass. The phone shell check loads `/schedule/schedule` as "no error" only, with empty schedule data. The Sunday build's full run (`docs/agent-handoffs/evidence/sunday-parity/checks-after.txt`) shows 15 existing checks already exiting non-zero on its base, `scripts/check-overlapping-crew-trips.mjs` among them.
- **No rendered baseline of a populated Crew Schedule at phone width exists, and T1 did not make one** (stopped by manager direction). Sunday surfaces were not checked at phone widths either (v303). Every geometry statement below is derived from CSS. The unobserved checks are U1–U4 in §5.

**0.1 Layout `[DERIVED]`**
- The crew pool is a fixed 280px column (`App.css:812–820`). The board grid is `260px repeat(7, 1fr)` (`:1101–1105`); the capacity strip's day grid is `repeat(7, 1fr)` (`:6769`). `.sch-main` and `.sch-brd` clip their overflow (`:1007–1014`, `:1089–1099`). On this route the content region is a fixed-height column that does not scroll (`:483–494`). No media query touches a `.sch-*` rule (`:6963–6968` covers the capacity strip and Home panels only).
- So at 360–430 the board gets 48–118px for a 260px first column, and its day columns cannot be scrolled to. At 768 it gets about 456px.
- The three dialogs have minimum widths of 340, 360 and 380px (`App.css:1809–1816`, `:2006–2010`, `:1890–1893`).

**0.2 Interaction `[DERIVED]`** (`Schedule.jsx` unless named)
- Days: the week is `dates`, seven dates, Mon–Sun (`:18–19`, `:42–50`, `:203`). Day labels are taken by position from `DAYS` / `DAYS_LONG` (`:18–19`) and from the strip's own array (`HomeCapacityStrip.jsx:6`).
- Assigning a person to a trip starts only from a `drop`. `handleAssignCrew` has two call sites, both `onDrop` (`:896–900`, `:1131–1135`); chips are `draggable` (`:1273`). It does nothing, silently, for an unavailable or legacy row (`:444`). A tap on a chip opens the crew week popup (`:1276`). A tap on a day cell does nothing. `src/schedule` has no touch or pointer handler.
- The day picker (`:1412–1473`) is created with a person (`:443–447`) and always renders the desktop dialog. It names the job and trip, dims out-of-trip days, labels each conflict — the other job's number, "(another trip)" for a sibling trip, or the status when the person is out (`:1441–1450`) — offers Select all / Clear all over assignable days only (`:461–476`), and has Cancel and Assign with a "Saving…" state. No review step. Conflict text is 8px in a 60px label, otherwise a `title` (`App.css:1868–1879`).
- One write path: `applyAssignModal` re-finds the row by its key **in the week now loaded**, then calls `changeRowAssignments(row, name, selectedDays)` (`:483–533`). That inserts first (`:497–509`, through `newAssignmentRows` with `mobilization_id` = the trip id and `team_member_id`, `assignmentIdentity.js:18–52`) and deletes second (`Schedule.jsx:510–515`), only that row's own assignment ids. It refuses a second save in flight, an archived person on that date, an out-of-trip day, new crew on a legacy row and a job with no saved trip; for an unavailable row it returns false with no message (`:484`). On error it shows the message, reloads the week and leaves the picker open (`:518–521`) — so a delete that fails after an insert landed leaves the insert saved.
- Week navigation refuses to move while a trip editor has unsaved changes (`:137–146`). The desktop picker blocks the page behind it only by its overlay.
- Expanded board rows carry per-person day toggles and ✕. Each tap writes at once, with no review (`:1159–1169`).
- Statuses start from chip buttons that appear only on hover, 18px square (`App.css:933–954`). Scheduled Off is always offered; Sick, Call In and No Show only when the person is not out on every day of the week (`Schedule.jsx:1191–1193`, `:1282–1289`). The Sick / Call In / No Show picker saves on DONE and ignores errors (`Schedule.jsx:760–781`).
- A person's week is a popup with one line per **job**, so two trips of one job merge (`:1476–1558`). Its Scheduled Off ranges load through the same state that opens the popup (`:602–622`). The pool chip's dots are per trip row (`:1232–1250`).
- A trip link in a badge list expands that trip's board row and scrolls to it (`:150–164`).
- While another week loads, the screen keeps the previous week whole — label, days, numbers — makes it inert and shows "Loading <week>…" (`:200–211`, `:1341–1350`).
- Rows, warnings and numbers come from: `crewWeekRows` — saved-trip rows, legacy "Crew history" rows, unavailable-job rows and `row.issue` text (`crewScheduleRows.js:40–73`); `crewRowStaffing`, where `needed` null means unknown and is forced for legacy rows (`crewScheduleRows.js:27–32`); the board cell's "need N", "need ?" and "2X" rules (`Schedule.jsx:887`, `:909–918`) — a trip with a known need and no crew shows an empty box and a tooltip only (`Schedule.jsx:917–918`); the double-booking map (`Schedule.jsx:342–352`); `crewWeekSummary`, which lists, per day and per trip, trips under a known need and trips with no requirement, skipping legacy rows (`crewWeekSummary.js:7–30`); `crewWeekCapacity`; roster eligibility in `scheduleCrew.js`.

**0.3 Brand sources read** (for the original; not re-read for Revision 1)
Registry `assets/brand/subcon-command/SUBCON_COMMAND_CURRENT.md` (AIOS checkout). UI standard `source-docs/SUBCON_COMMAND_UI_STANDARD_LAUNCH.md`, read in full. Visual Brand Guide `.docx`: text extracted by T1, 265 paragraphs, identical to the registry's reading copy; sha256 `9833d17f…0a80` matches the hash that copy records. Canonical image `visual/crew-schedule-canonical.png` opened: a 1672×941 desktop composition, byte-identical to the DOCX's first image.
- No governing document defines a phone layout, a breakpoint, a touch-target size or a phone schedule pattern. A phone-width brand comparison cannot be performed.
- The Schedule route uses its own tokens (`src/schedule/index.css:1–43`, e.g. `--command-green`, `--teal`), not the standard's cyan set. Pre-existing. Not changed here.

## ID8 decisions

- **Beat 1 — Objective `[LOCKED · user]`:** on a phone the Crew Scheduler does three things: find tomorrow's gaps; assign a person to the correct trip; change their days without disturbing a sibling trip. Preview branch only. Desktop behavior preserved.
- **Beat 2 — Phone views `[LOCKED · user]`:** Week (compact overview with gaps and conflicts), Day (job/trip cards), Person (a person's week), and the weekly Board (full grid, sideways scroll, fixed job labels).
- **Beat 3 — Breakpoint `[LOCKED · delegated]`:** the phone layout applies at ≤768px, the breakpoint the base shell already uses (`src/App.jsx:415–421`, `src/styles/mobile-shell.css:8`). ≥769px is unchanged.
- **Beat 4 — How the views are reached `[LOCKED · delegated]`** — affected UI: `/schedule/schedule` at ≤768px · options: (A) one view at a time behind a four-way switch, Week first; (B) all sections stacked on one long page; (C) separate routes · chosen **A**: one route and one data load, nothing to scroll past, and the canonical reference already shows a view switch in this toolbar (visual precedent only). A link carrying `?job=` opens on Board, where today's row focus lives.
- **Beat 5 — Edit flow `[LOCKED · user]`; where it starts `[LOCKED · delegated]`:** tap → choose person → choose days → review → save. It starts from a trip that can take crew: Assign on a Day card, a person already on that card, a trip line in Person, or Assign crew in a Board row's expanded crew section. Legacy and unavailable rows start no flow. Assignment that starts from a person (choose a trip for them) is not built.
- **Beat 6 — Review is phone-only `[LOCKED · user]`:** desktop keeps today's one-step picker. Adding a step there would change desktop behavior.
- **Beat 7 — Rules `[LOCKED · user]`:** no validation, eligibility, conflict, staffing or identity rule changes. Conflicts and time off warn; they do not block — as today. The save is the existing save.
- **Beat 8 — Theme `[LOCKED · delegated]`** — affected UI: every new phone surface · options: (A) the Schedule route's existing tokens; (B) the brand standard's tokens on new surfaces only; (C) re-theme the screen · chosen **A**: B leaves one screen in two palettes, C is a different slice. No new color, font or radius. No logo or mark change `[LOCKED · brand]`.
- **Beat 9 — Mechanism:** `[LOCKED · user]` no new dependency, framework, state library or route. `[LOCKED · delegated]` new CSS sits in `@media screen and (max-width: 768px)`; any viewport test is the browser's `matchMedia`, as the shell already does.
- **Beat 10 — Days `[LOCKED · user]`, changed in Revision 1 (§A item 4):** phone views show exactly the days the desktop board shows — the scheduler's `dates`, seven days Mon–Sun on this base — with the labels desktop uses for them. New code and CSS hold no day list, day count or grid track count of their own. This slice changes no Sunday rule: Sunday behaves on a phone as it does on desktop.
- **Beat 11 — Statuses `[LOCKED · delegated]`:** Person offers the status actions the desktop chip offers for that person — Scheduled Off always; Sick, Call In and No Show only when the person is not out all week — opening the existing dialogs. On touch they are unreachable today, and marking someone out is a phone-in-hand task. Their save code is not changed.
- **Beat 12 — QA `[LOCKED · user]`:** synthetic records, fake credentials, every backend request answered inside the browser, service workers blocked, default-deny. Saves run only against intercepted responses, and only locally. No agent signs in anywhere.
- **Beat 13 — Flow state `[LOCKED · delegated]`, added in Revision 1 on T2's design call:** the flow is modal and holds its own draft. While it is open, week navigation and the view switch cannot be used. It closes with no write when the viewport crosses 768px — as the shell's drawer does (`src/App.jsx:437–444`) — or when the route is left. At ≤768px the desktop picker and the crew week popup are not rendered; crossing 768px in either direction also clears an open desktop picker, an open crew week popup and Person's open person, with no write. If a save is already in flight at the moment of crossing, it is left to finish — nothing is cancelled or undone — and the flow, or the desktop picker, closes once it settles; today's picker already refuses to close while a save is busy (`Schedule.jsx:1413`, `:1468`). The crossing itself starts no write. The status and Scheduled Off dialogs are the same dialogs at both widths.

## §1 Problem / intent

On a phone the Crew Schedule cannot be worked. The board is clipped to a sliver, crew can only be assigned by dragging, and the time-off buttons need a hover.

Intent: Chris opens the preview on a phone, sees the week's gaps, opens tomorrow, puts the right person on the right trip, and changes someone's days — with a review before the new assignment flow saves — while desktop stays as it is.

## §2 Proposed change (≤768px, `/schedule/schedule` only)

**Frame.** A four-way switch — Week · Day · Person · Board — with Week selected on load. One header stays in view above all four views: the week label, Prev / Next / This Week, + Job, Actions and Weekly crew texts. It keeps the existing "Weekly crew texts" button and the existing week label element (`.sch-wklbl`), which `scripts/check-crew-week-text.mjs` reads at 390px. The capacity strip's badges and per-day numbers appear in Week only. The page never scrolls sideways; only the Board does, inside its own frame. Changing week keeps the selected view. The desktop assignment picker and the crew week popup are not rendered at this width; the flow and Person take their place.

**Week.** One entry per day in `dates`, labelled as desktop labels that day: weekday and date, today marked, the capacity strip's numbers for that day (assigned / available, free, out), and three counts.
- *Short* — trips: that day's `needing` entries in `crewWeekSummary`. A trip in range that day with fewer crew than a known need.
- *Unknown need* — trips: that day's `unknown` entries in `crewWeekSummary`. A trip in range that day with no crew requirement. Legacy rows are not counted, as in the badge lists; their own issue text flags them.
- *Double-booked* — people: those on more than one board row that day, the board's `2X` rule (`Schedule.jsx:342–352`, `:887`).

These are trips and people for one day. The three badges (Jobs Starting, Jobs Ending, Jobs Needing Crew) and the "crew requirements unclear" link stay per job for the week, with their own labels, numbers and lists. A trip link in one of those lists closes the list and opens Board with that trip's row expanded — the row the link expands on desktop. Tapping a day opens Day on it.

**Day.** A day selector over `dates`, opening on today when today is in the loaded week and otherwise on the first day. Then one card per board row whose cell for that day is not empty on the board — it has crew that day, or it is in range with a known or unknown need — in board order. A trip set to need no crew, with none on it, has no card; it stays on the Board. Each card shows job number and name, trip label and date range, lead, the people on it that day, `2X` on double-booked people, the row's issue text where the board shows one, and — on a saved trip that is in range that day — a staffing line: "need N" when crew is below a known need, including a trip with nobody on it yet, where the board shows only an empty box and a tooltip; "need ?" when the need is unknown. Below the cards: that day's Free and Out people (today's day-detail lists). A trip that can take crew has Assign. Legacy and unavailable rows are read-only here: their issue text, no staffing line, no Assign, and their people cannot be tapped. One stated difference from the board: a legacy row's cell reads "need ?" on desktop because its requirement is forced to unknown (`crewScheduleRows.js:31`); the phone shows its issue text instead and does not count it as unknown need.

**Person.** The pool as a list: same people, grouping, order, status dots, `2X` and out labels. A person opens to: a status for each day in `dates`; one line per **trip** they are on (job number, trip label, days, issue flag), so sibling trips stay separate; their Scheduled Off ranges with Edit Dates and Remove; the phone link; and the status actions of Beat 11. Lines for legacy and unavailable rows are read-only. The open person is held in the existing selected-person state, so the existing Scheduled Off range load runs unchanged.

**Board.** Today's board, whole: the Job column, every day column, every row, and the expandable row editor with all its controls, which work as on desktop — the day toggles and ✕ still save on each tap. It scrolls sideways in its frame with the Job column and the date header fixed. The expanded crew section gains Assign crew wherever desktop would accept a drop. A legacy row's crew days can still be removed here, as on desktop; an unavailable row cannot be changed anywhere, as on desktop.

**The flow** is modal and holds its own draft: the trip (by row key), the person, the chosen days and the step. While it is open, nothing behind it — week navigation, the view switch, the views — can be activated by tap or keyboard. It closes with no write if the viewport crosses 768px or the route is left; a save already in flight is left to finish first (Beat 13).
1. *Person* — the week's roster as in the pool. People who are out on every day in `dates` cannot be chosen (on desktop they cannot be dragged). People already on the trip are marked. Skipped when the flow starts from a person.
2. *Days* — today's picker rules, unchanged: one button per day in `dates`, out-of-trip days disabled, the person's current days on this trip preselected, Select all / Clear all over assignable days only. Each conflict or status is readable text on the day, not a tooltip.
3. *Review* — always computed from the trip's row as it is now, re-found by its key, against the chosen days: person; job number; trip label and date range; days to add; days to remove, including any that Select all dropped; every warning for the chosen days. Clearing all days reads as removing the person from this trip for this week. With no change it says so, and Save writes nothing. If the row can no longer be found, the existing "This trip has changed" message is shown and only close is offered.
4. *Save* — re-finds the row by key and calls `changeRowAssignments(row, name, days)`, as desktop's Assign does (`:528–533`). A busy state while it runs; no second request. On success the flow closes and every view shows the reloaded week. On failure the existing message is shown and the flow stays on Review. Because the existing save inserts first and deletes second, a failed save can leave part of the change saved; Review then shows, from the reloaded row, what is on the trip now and what is still to do.

Cancel, Back and close are available at every step and write nothing. They do not undo a part that a failed save already wrote.

**Constraints**
- `[LOCKED · user]` ≥769px is unchanged: no new control, no review step; drag-and-drop, the picker and the crew week popup as today.
- `[LOCKED · user]` No new or changed Supabase call. The body of `changeRowAssignments` is unchanged. No change to a guard, message, eligibility, conflict, staffing, capacity or identity rule. Existing files in `src/schedule/lib/` have zero diff.
- `[LOCKED · user]` Every warning the board, pool and picker show today appears in the phone views wherever the same row, person or day is shown.
- `[LOCKED · user]` Days and their labels come from `dates` and the labels desktop already uses. Nothing the Sunday slice changed is altered.
- `[LOCKED · delegated]` Phone rules for the capacity strip apply on this route only. The strip on the other Schedule screens is unchanged.
- `[LOCKED · user]` `/crew` (`CrewPhone.jsx`) is untouched.

**Expectation check**
- Chris will see, on a phone: the week, Monday to Sunday, with each day's gaps; tomorrow's trips as cards; Assign → person → days → review → save; a person's week by trip; the time-off actions; the full seven-day board by sideways scroll.
- He will not see: a review step on desktop; phone-shaped trip editing, + Job or Actions dialogs; Calendar, Daily or any other Schedule screen; assignment that starts from a person; drag on touch.
- **Saves with no review at phone width, as on desktop.** The Board's day toggles and ✕ save on each tap. The Sick / Call In / No Show picker saves on DONE and does not report a failed save. Scheduled Off and Remove Scheduled Off save from their own confirm dialogs. The review step covers the new assignment flow only.
- **Gap:** none known beyond those limits. Not confirmed with Chris personally.

## §3 Files / surfaces likely touched `[DERIVED]`

- `src/schedule/views/Schedule.jsx` and `src/schedule/App.css`. Both now carry the Sunday changes, identical to `0a78d32`. This slice keeps them: no day list, week helper, date window or seven-column rule changes.
- New files under `src/schedule/` for the phone views, the flow and a presentation-only helper.
- `src/schedule/ScheduleLayout.jsx` and `src/schedule/components/{CrewWeekCapacity,HomeCapacityStrip,ScheduledOffModal}.jsx` — class hooks only, if needed.
- New files under `scripts/`: one focused check script and its scheduler fixture.
- T3's records: `docs/agent-handoffs/BUILD-REPORT.md`, the F66 row, the next free `docs/handoffs/SC_Handoff_v*.txt`.

Zero diff `[LOCKED · user/repo]`: every existing file in `src/schedule/lib/`; `src/schedule/views/` other than `Schedule.jsx`; `src/App.jsx`, `src/components/**`, `src/styles/**`, `src/pages/**`, `src/lib/**`, `src/field/**`, `src/ar/**`; every existing file in `scripts/`; `supabase/`, `db/`, `sql/`, `package.json`, `package-lock.json`, `index.html`, `vite.config.js`, `vercel.json`, `eslint.config.js`. That list holds the phone shell (`src/styles/mobile-shell.css`), the preview archive guard (`src/pages/CallLog.jsx:81`, `vite.config.js:10`) and both lineages' checks.

**Base.** The build base is `7608b0e`. T1 re-verified §0.1, §0.2 and every citation there for this revision, and T2's delta review checks that; T3 does not judge its own base. If T3's starting commit differs from `7608b0e` in `src/` or `scripts/`, work stops and the plan returns to T1.

## §4 Out of scope / deferred

- Any change to Sunday behavior, to `DAYS`, `DAYS_LONG`, `wkDates`, `getMonday`, `fmtWk`, `workdays.js` or a date window. The Sunday slice (F60) owns them.
- Phone layouts for trip editing, + Job / Add to Schedule, the Actions dialogs (Crew List, Work Types, Export), and the other Schedule routes (Home, Jobs, Calendar, Daily, Logistics, Billing and the rest). They stay reachable and are not reworked.
- Assignment that starts from a person; crew search; drag-and-drop on touch; a review step on the Board's day toggles and ✕ or on the status dialogs.
- Applying the brand theme to Crew Schedule; any logo or mark work. `[DESIGN-OPEN]`, deferred: gap-first ordering of Day cards; a landscape layout.
- Desktop changes of any kind; `/crew`; native Field Command; backend, schema, RLS, auth, settings, data; `main`; production; merge; return-to-tab refresh of the board (an open backlog note); widths other than those tested.
- Four pre-existing behaviors T2 listed as adjacent are not changed here, and T3 files them as one backlog row: + Job and Actions dialogs overflow a 360px screen; a name missing from the crew list gets the "archived" message; the board's scroll-to-row targets may not scroll; an out person still counts as crew.

## §5 Acceptance bar

**Harness.** `docs/plans/mobile_web_preview.md` §5 H1–H6 apply as written, with these changes. (1) One new script in the repo's `scripts/check-*.mjs` practice, run in the shell at the real route, adding no dependency. `scripts/mobile-preview-fixtures.mjs` and `scripts/sunday-parity-fixture.mjs` are its starting points and are not edited. (2) A scheduler fixture held in memory and rebuilt before each check: `jobs` (with the `call_log` link `loadJobs` reads), `job_mobilizations`, `crew`, `assignments`, `crew_status`, `work_types`. It can hold one week read open and fail one week read (P15). (3) H4's "never activates a save" is replaced for one control only, the flow's Save: `POST` and `DELETE` on `rest/v1/assignments` are answered inside the browser from that fixture, with one switch that fails both and one that fails only the `DELETE`. Every request beyond what H3 and H4 allow and beyond those two intercepted writes is refused, logged and fails the run. No other save, send or delete control is activated. The clock is fixed at `2026-10-07T12:00:00-07:00`, a Wednesday, with browser timezone `America/Los_Angeles`. Widths: 360, 390, 430, 768; desktop 1440.

**Fixture — fixed, synthetic names only.** Week Mon Oct 5 – Sun Oct 11, 2026. "Tomorrow" is Thursday Oct 8.
- Job A, two saved trips that overlap: A-wide (Mon–Sun, needs 4) and A-short (Thu–Fri, needs 2). X is on A-wide every day and on A-short Thu–Fri.
- Job B: one trip Wed–Fri, needs 3; P1 is on it Thursday. Job C: one trip covering Thursday with no crew requirement on the trip or the job; T is on it Thursday. Job D: one trip on Thursday, needs 2; T and D2 are on it. Job E: one trip covering Thursday, needs 2, nobody on it. One job name of 40 characters.
- One legacy crew day (L on Job B, Thursday, no trip link) and one crew day on a job that is not in `jobs` (U, Thursday).
- People: two teams and floaters. F1 Team-linked and free; F2 unlinked and free; S Sick on Thursday; O Scheduled Off on Friday; W Scheduled Off on all seven days; R archived effective Thursday, with crew days Mon–Tue on A-wide.
- Thursday's counts: short 4 (A-wide, A-short, B, E) · unknown need 1 (C) · double-booked 2 (X, T).

**P — phone: every phone and tablet width unless stated.** "Matches 1440" means equal to what the same build shows at 1440 for the same fixture.
- P1. The route loads in the shell with no page error and no sideways page scroll. The shell's menu button and drawer still work on it.
- P2. The switch shows Week, Day, Person and Board. Week is selected on load. Each is at least 44×44, named, exposes its selected state, and takes a tap at its centre.
- P3. The week label matches 1440. The header — Prev, Next, This Week, + Job, Actions, Weekly crew texts — is in view in all four views. Next loads the next week, This Week returns, and the selected view is kept.
- P4. Week: each day's assigned / available, free and out match the 1440 capacity strip. Thursday reads short 4, unknown need 1, double-booked 2. For all seven days the three counts equal what the script computes from the fixture with `crewWeekSummary` and the board's double-booking rule. The three badges match 1440 and open their lists inside the viewport. A trip link in a list closes it and opens Board with that trip's row expanded. Tapping Thursday opens Day on Thursday.
- P5. Day opens on Wednesday; in the next week it opens on Monday. On Thursday the cards equal the 1440 board rows whose Thursday cell is not "—", in board order. Each card shows job number and name (the 40-character name is not clipped), trip label, date range, lead and that day's people, with the same issue text as 1440 and `2X` on X and T. Staffing lines: A-wide "need 3", A-short "need 1", B "need 2", E "need 2", C "need ?", D none. The legacy and unavailable cards show their issue, no staffing line and no Assign; a tap on their people opens nothing and sends nothing. The Free and Out lists match the 1440 day detail.
- P6. Assign, success: Job B → Assign → the person list matches the 1440 pool, and W cannot be chosen → choose F1 → the day buttons equal the 1440 picker's, out-of-trip days disabled → choose Thursday → Review shows F1, the job number, trip label and range, Thursday to add, nothing to remove, no warning → Save sends exactly one `POST assignments` whose row carries Job B's `job_id`, its trip id as `mobilization_id`, `crew_name`, the date, and F1's `team_member_id` → the flow closes and B's card shows F1 and "need 1". Repeated with F2, the row carries `team_member_id: null`.
- P7. Cancel: leaving from the person, days and review steps — by Cancel, Back, close and, at 768, Escape — sends no write and leaves the fixture as it was.
- P8. Failure. (a) With both writes failing, Save shows the response's message on screen, stays on Review, and the fixture is unchanged. While the request is open Save shows busy and a second tap sends no second request. With the switch off, Save succeeds. (b) With only the `DELETE` failing: on Job B open P1, add Friday and clear Thursday, Save. The message is shown and the flow stays on Review, which now shows Friday as on the trip and Thursday still to remove. The fixture holds P1's Friday row and still holds Thursday. Cancel closes with no further write, and Friday stays.
- P9. Sibling isolation: on A-short's card tap X → Thursday and Friday are preselected → clear Friday → Review shows Friday to remove and nothing else → Save sends exactly one `DELETE assignments` naming that one row's id, and no `POST`. A-wide's rows for X are unchanged in id and date, and A-wide's Friday card still lists X. Reopening X on A-short shows Friday labelled as on another trip.
- P10. Warnings: S shows "Sick" on Thursday and in Review; Select all leaves that day out; choosing it by hand still saves (warn, not block). A day where the person is on another job names that job in the days step and in Review. Choosing Thursday for R and saving shows the existing archived message and sends no write.
- P11. Person: the list matches the 1440 pool in people, order, grouping, `2X` and out labels. X shows a status for each of the seven days and two trip lines, A-wide and A-short, each with its own days. Tapping the A-short line opens the days step for X on A-short. O shows the Scheduled Off range with Edit Dates and Remove. F1 offers Sick, Call In, No Show and Scheduled Off; W offers Scheduled Off only. Each action is at least 44×44 and opens its existing dialog fully inside the viewport; closing it sends no write. L's legacy line and U's unavailable line cannot be tapped. The crew week popup is not shown.
- P12. Board: header cells and row count match 1440 — Job plus seven days. The board scrolls sideways inside its frame and the document does not. Scrolled fully right, the last day column is fully visible and the Job column has not moved. The date header stays in view while rows scroll. Tapping a job label expands the row; the day toggles and ✕ are present; Assign crew opens the flow for that trip and is absent on the legacy and unavailable rows.
- P13. A link with `?job=`, `?week=` and `?trip=` opens Board on that week with that row marked, as at 1440.
- P14. Every control this slice adds is at least 44×44 and takes a tap at its centre. The flow has an accessible name, takes focus on open and returns it on close. At ≤600px, text-entry controls in dialogs opened from the phone views compute to at least 16px.
- P15. States: the first load shows the existing loading state. While the next week's read is held open, every view keeps the previous week whole — its label, days and numbers together — cannot be used, and shows the existing "Loading <week>…" line; when the read completes, label, days and numbers change together. A week with no trips says so. A failed week read shows the existing error and Retry, and Retry loads it.
- P16. Modal: with the flow open at each step, a tap at the centre of Prev, Next, This Week and each switch control lands on the flow, none of them can take keyboard focus, and the week label does not change. The desktop picker is never shown.
- P17. Seven days: Week, the Day selector, the days step, Person's status row and the Board each show the 1440 board's seven days, ending in Sunday, with the same labels. Choosing Sunday for F1 on A-wide saves one `POST` carrying the Sunday date.

**D — desktop, 1440.**
- D1. No phone control is present. Pool, board and capacity strip render. The picker opened by drag has Cancel and Assign and no review step. A tap on a chip opens the crew week popup.
- D2. Both lineages still pass their own checks, unedited: `scripts/check-sunday-parity-model.mjs` and `scripts/check-sunday-parity.mjs` (the Sunday build's bar; the second drives desktop drag → picker → Assign saves on seven days); `scripts/check-mobile-preview.mjs` (the phone shell's bar, with zero writes and zero blocked requests); `scripts/check-preview-autoarchive.mjs` (the preview archive guard). D2 gates on the pass-set T3 records on `7608b0e` before the first app edit (U4): every check that exits zero there, these four included, still does. If one of the four does not pass on the base, T3 reports it before editing. A check that already exits non-zero on the base is not repaired and is not a gate; on the Sunday build, before the merge, 15 did, `check-overlapping-crew-trips.mjs` among them (`docs/agent-handoffs/evidence/sunday-parity/checks-after.txt`).
- D3. A screenshot of the populated board differs from base by no more than base differs from itself. The literal counts are recorded. A miss is a failure, not a waiver.
- D4. Crossing 768px: 1440 → 390 → 1440 in one session keeps the week, leaves no overlay stuck and returns the desktop layout. With the flow open on Review at 390, widening to 1440 closes it, sends no write and opens no desktop picker. With Save in flight at 390, widening sends no further write; that save completes, then the flow closes and no desktop picker opens. With a person open in Person at 390, widening opens no crew week popup. With the desktop picker open at 1440 and a day chosen, narrowing to 390 closes it and sends no write; the same for the crew week popup.

**E — preservation.**
- E1. `git diff 7608b0e..HEAD` shows zero changes in the §3 zero-diff list. `28c8468`, `3059639` and `0a78d32` are ancestors of the reviewed commit.
- E2. Read from the diff by T4: the body of `changeRowAssignments` is unchanged, and the phone Save reaches it as `applyAssignModal` does — re-find the row by key, then `changeRowAssignments(row, name, days)`; there is no new Supabase call site; no guard, message, eligibility, conflict, staffing, capacity or identity rule changes; new code and CSS hold no day list, day count or grid track count of their own; nothing in `DAYS`, `DAYS_LONG`, `wkDates`, `fmtWk` or the seven-column rules changes; every added media query includes `screen`, and every rule for the capacity strip is scoped to this route.
- E3. `npm run build` passes. ESLint reports no new finding in a touched file and no more than the base totals (U2). `assignmentIdentity.test.mjs`, `crewStatus.test.mjs` and `scheduleCrew.test.mjs` pass.

**F — Brand check (in `BUILD-REPORT.md`).** It names the documents and sections checked (§0.3) and the changed surfaces. It states: new phone surfaces use the Schedule route's existing tokens — reported as pre-existing, not as "no deviations"; no new color, font, radius or mark asset; a phone-width comparison against a brand reference was **not performed**, because none exists; 1440 is unchanged, so no new claim is made against the canonical image.

**G — Vercel preview.** P–F are the Smoke Test, run locally on the reviewed commit after T4–T6. The coordinator pushes; never to `main`, never forced. The Ready deployment's SHA equals the reviewed commit. A commit after the reviews re-opens them.
- Hosted run, only if the preview can be reached without a user cookie or sign-in: the same script under the same interception — every Supabase request answered inside the browser from the synthetic fixture, and any request that would reach the real backend failing the run. It is limited to P1–P5, P7, P11–P14, P16 and the display half of P17. It opens the flow and cancels it. It never taps Save or any other save control. P6, P8–P10, P15 and the Sunday save run locally only.
- If the preview cannot be reached that way, the hosted run is recorded as not performed, with the reason.

**U — baseline T1 did not observe. T3 records each before the first app edit.**
- U1. A rendered "before" of the populated route at 360, 390, 430 and 768: what is visible and reachable, and how much height the capacity strip takes. If it contradicts §0.1, T3 reports it.
- U2. ESLint totals on the base, and how the three existing dialogs sit at 360 (derived from CSS only).
- U3. Drag-and-drop by touch on a real phone. No agent can assess it. It stays unassessed.
- U4. The D2 pass-set on `7608b0e`: T3 runs D2's checks on the base and records each result. D2 gates on that record.

**What a pass does not prove**
- **Real devices.** Emulated Chrome shows neither iPhone Safari's toolbars, keyboard and safe areas nor real touch. Chris's own look on a phone is that check.
- **Real data and access.** Fixtures prove layout and behavior, not that signed-in users see their records (repo `CLAUDE.md` Workflow Rule 10). No data path changes here.
- **The preview is not a sandbox.** Preview and production share one database. On a preview build the Call Log's automatic archive is skipped by the existing guard; nothing else is. A signed-in person who taps Save, a Board day toggle, ✕ or a status action there changes the real schedule. No agent does that, and the hosted run saves nothing.
- **Other widths.** A desktop window under 769px gets the phone layout. Only the named widths are checked.

Completion claims stay separate: code built · data applied (none) · authenticated access (not exercised) · Chris's acceptance (pending).

## §6 Estimate

Agent elapsed time: about 100–130 minutes of build and local self-check. The reviews are separate. After them, about 15 minutes for the local Smoke Test, the push, the deployment and any hosted run.

Uncertain: U1 (how much vertical room the header and Week content need on a small phone); how long the two lineages' existing checks take to re-run.

## Revision notes

### Revision 1 — response to round 1
Audit of `2e01618` by T2 `t2-crew-mobile` (manifest `3059639`; gate record at `ba322bf` in `docs/AUDIT_LOG.md`): NOT CONVERGED, 12 in cap (0C/2H/10M/0L). Routed by T7 with the combined base `7608b0e`.

| Finding | Outcome | Where |
|---|---|---|
| A1 High — week can change under an open flow; save then writes the wrong week | Fixed: the flow is modal and blocks week navigation | Beat 13; §2 The flow; P16 |
| A2 High — Sunday branch lacked the phone shell; builder judged its own base | Fixed: base is the merge `7608b0e`; T1 re-verified §0 and all citations; any other base returns to T1 | Header; §0; §3 Base; E1; D2 |
| A3 Med — "six days" false on a Sunday base; a restated track count would drop Sunday | Fixed: phone shows exactly desktop's days; no day or track count in new code | Beat 10; §2 Constraints; Expectation check; E2; P17 |
| B1 Med — Review's source undefined; partial failure misreported | Fixed: Review is computed from the re-found row; wording corrected; mixed-failure check added | §2 flow steps 3–4; P8 |
| B2 Med — person taps on legacy and unavailable rows unspecified | Fixed: excluded — read-only in Day and Person | Beat 5; §2 Day, Person, Board; P5; P11 |
| B3 Med — flow state owner, what is suppressed, breakpoint crossing | Fixed: own draft; desktop picker and popup not rendered at ≤768px; crossing closes with no write | Beat 13; §2 Frame, Person, The flow; D4; E2 |
| C1 Med — Week counts had no single rule or unit | Fixed: each count's rule, unit and source named (`crewWeekSummary`, the board's `2X` rule); literal fixture counts; the one difference from the board cell on legacy rows is stated | §2 Week, Day; fixture; P4; P5 |
| C2 Med — zero-crew trip with a known need had no card text | Fixed: "need N"; Job E added | §2 Day; fixture; P5 |
| C3 Med — badge-list trip links scroll an off-screen board | Fixed: the link opens Board with the row expanded | §2 Week; P4 |
| C4 Med — "no numbers from another week" contradicted the held snapshot | Fixed: restated against existing behavior; fixture can hold a read | §0.2; harness; P15 |
| D1 Med — §1 over-promised review; status rules | Fixed: §1 narrowed; one-tap saves listed; desktop's hide rule kept | §1; Beat 11; Expectation check; P11; §4 |
| D2 Med — hosted check set inherited from another plan | Fixed: hosted subset named, synthetic, no save activated | Beat 12; §5 G |

Also changed:
- **Base and Sunday, by direction (§A item 4):** build base `7608b0e`; Beat 10 and the Expectation check now say seven days; the hold is lifted; §4 no longer excludes Sunday from view, only from change.
- **Preview guard, by direction (§A item 5):** the archive guard and both lineages' checks are held at zero diff and re-run (§3; D2; E1); "What a pass does not prove" no longer reads as if browsing the preview were safe.
- **D2 replaced.** `scripts/check-overlapping-crew-trips.mjs` already exits non-zero on the base (recorded by the Sunday build), so it cannot be a gate. The Sunday parity check covers desktop saves. The former U2 is dropped.
- **Over-cap wording, folded in:** "no write" instead of "no request" (P10; flow step 3); "for this week" on clearing all days; Select all's dropped days listed in Review; labels from `dates`; Day's opening day; the zero-need trip with no card; strip rules scoped to this route; the header above all views; the clock's instant and timezone; fixture rebuilt per check, with a held read; the `call_log` link in the fixture.

Not changed: the four views, where the flow starts, the theme decision, the breakpoint, the no-touch list's intent. T2's four adjacent findings go to the backlog (§4). No new mechanism beyond the modal flow T2 recommended.

### Revision 2 — response to round 2
Audit of `2d9a223` by T2 `t2-crew-mobile` (manifest `3622b56`; gate record at `81bb9c2` in `docs/AUDIT_LOG.md`): NOT CONVERGED, 5 in cap (0C/0H/1M/4L), no regressions; all twelve round-1 findings resolved. Wording only. No mechanism added.

| Finding | Outcome | Where |
|---|---|---|
| 1 Med — D2's pass-set was recorded before the merge | Fixed: T3 records the pass-set on `7608b0e` first and D2 gates on it; the phone header keeps the "Weekly crew texts" button and `.sch-wklbl` | §2 Frame; D2; U4 |
| 2 Low — crossing 768px with Save in flight was undefined | Fixed: the save finishes, then the draft closes; the crossing starts no write | Beat 13; §2 The flow; D4 |
| 3 Low — the staffing line lacked the board's in-range gate | Fixed | §2 Day |
| 4 Low — "same `2X` as 1440" had no comparand | Fixed: `2X` on X and T | P5 |
| 5 Low — harness wording contradicted H3 and H4 | Fixed: "beyond what H3 and H4 allow" | §5 Harness (3) |

---

## Audit manifest

_Generated by `/auditcriteria` on 2026-10-01 by T2 Plan Audit (`t2-crew-mobile`, Claude Code session `d456ca7b-9288-4294-8c21-4d077a8bf3d1`), not the plan author. Round 3, wording delta. Replaces the round-2 manifest (`3622b56`). Consumed by `/runaudit` to size the adversarial audit pass._

### Bottom line (plain English)
A final narrow check of five corrected sentences. Nothing new was added to the plan, so the reviewer who raised the five points reads the corrections directly against them — no wider re-audit.

### Round
- Plan type: feature
- Current round: 3
- Plan revision under audit: `39cd8713f8d1097f58b70e4bcc22b84499fa1606`
- Sizing basis: DELTA since `2d9a223` (round-2 revision; manifest `3622b56`) — round 3; scoped to what changed, capped at 3
- Delta scope (round N>1 only): the five wording corrections for round-2 findings 1–5 only — Beat 13 and §2 The flow (save in flight when 768px is crossed), §2 Frame (existing "Weekly crew texts" button and `.sch-wklbl` kept), §2 Day (staffing line only in range), §5 Harness change (3), P5 (`2X` on X and T), D2 and new U4 (pass-set recorded on `7608b0e`), D4, plus the status line, the U-count in §0 and the Revision 2 notes. No mechanism added. Everything else unchanged; not re-audited.
- Findings trend: round 1 (12 in cap) → 2 (5) → 3 (?)

### Prior rounds
- Round 1: `2e01618` · 0C/2H/10M/0L (12 in cap; 13 over cap; 4 adjacent) · pattern: reused-state-contract-gaps
- Round 2: `2d9a223` · 0C/0H/1M/4L (5 in cap; 0 over cap; 1 adjacent; 0 regressions) · pattern: acceptance-wording-residue

**Briefing for agents**: do NOT re-find issues from prior rounds. Each round's revision-pass commit message is the canonical record of what was addressed. Attack ONLY material new to the plan revision under audit.

**Plateau signal**: plateau forms when round-N count is steady or higher than round-(N-1), not just at round 3+. The plateau is usually scope creep — each revision answers prior findings by ADDING mechanism, which adds surface, which produces new findings. `/runaudit` MUST present scope-cut as the only build-prompt option when plateau is detected. Hedged "do D or do A and also 13 items" prompts make the loop worse, not better.

### Deployment context
- **Live tenants**: 1 — HDSP only (multi-tenant onboarding blocked).
- **Prod / staging / dev**: desktop Crew Schedule is live in production on `main` and is not changed by this slice. The slice is confined to branch `feat/mobile-crew-scheduler-preview` and a Vercel preview. **The preview shares the production Supabase database.** On a preview build only the Call Log's automatic archive is skipped (`src/pages/CallLog.jsx:81`, `vite.config.js:10`); every other save by a signed-in person is real. No agent signs in. Nothing is built yet.
- **Blocking feature flags**: none.
- **Concurrency profile**: ≤5.

Agents weight severity against these values. Cross-tenant findings cap at Med while `live_tenants == 1`. Multi-user race findings cap at Low while solo. Theoretical attacks against state that doesn't exist yet are not High.

### Time budget + finding cap
- **Time budget**: 130 min (plan §6, upper bound of the 100–130 min build estimate)
- **Finding cap**: 13 findings

Synthesis MUST surface only the top-N most consequential findings. Remainder go to "Quarantined findings (not actionable this loop)." Cap forces prioritization; without it, the audit defaults to dumping.

### Surface
- Total lines: 247 (plan body, before this manifest)
- Sections: 9 (§A, §0, ID8 decisions, §1–§6, Revision notes)
- [LOCKED] decisions: 13 Beats plus 6 constraints and the zero-diff list; none added or changed in this revision (Beat 13 gained one clarifying sentence)
- [DESIGN-OPEN] items: 0 in scope (2 named and deferred in §4)
- [OPEN] items: 4 (U1–U4)
- Plan-to-code ratio: not estimated in lines by the plan; not flagged.

### Layers touched
- none newly touched — wording of existing UI and test-harness statements only

### New mechanisms introduced
- none

### Cross-system reach
- none new (build base `7608b0e` and the shared-database preview are unchanged from round 2)

### Irreversibility
- none — all changes reversible

### Known weak points
- **Beat 10 changed a user-locked decision on relayed direction (§A item 4), carried from round 2.** No personal re-lock by Chris is recorded.
- **Still no rendered baseline at phone width, for the scheduler or for Sunday.** U1–U4 stay with T3; U4 (the D2 pass-set on the base) is new and is a pre-edit step, not yet run.
- **After a 768px crossing, a save that fails in flight closes the flow once it settles (Beat 13),** so the only trace of a partial save is the existing toast. Stated in the plan; no check covers the failing case.

### Open questions
- Count: 4 (see §5 U)
- Highest-pressure: U4 — whether every D2 check passes on `7608b0e` before the first edit.

### Suggested attack angles (1 total)
1. **Wording verification of findings 1–5** — covers the changed sentences only. Required reading: `git diff 3622b56..39cd871 -- docs/plans/crew_mobile_preview.md`; `src/schedule/views/Schedule.jsx` at `:909–910`, `:1334–1340`, `:1413`, `:1468`; `scripts/mobile-preview-fixtures.mjs:87`; `docs/plans/mobile_web_preview.md` §5 H3–H4. Specific pressure: did each of the five corrections land as the round-2 finding required, and do the new words contradict any unchanged statement or loosen default-deny.

### Suggested agent count: 1

Rationale: a wording-only revision with no new surface sizes to 1; per T7's routing the T2 session performs this pass itself instead of spawning an agent, which is disclosed in the verdict.
