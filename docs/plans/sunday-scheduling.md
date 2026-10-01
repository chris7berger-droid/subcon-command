# Plan — Schedule Command: Sunday scheduling (Sunday = Saturday parity)

Confidence tags: **[LOCKED]** = user-ratified · **[DERIVED]** = inferred from code, verify · **[DESIGN-OPEN]** = needs a call · **[BLOCKED]** = depends on unresolved item.

In this plan each tag names its source:
- `[LOCKED · user]` — Chris's direction, in his words as relayed in the coordinator's packet (§A). `[LOCKED · brand]` — a settled rule in a governing brand document.
- `[DERIVED]` — T1's reading of source, or an implementation detail T1 derived from the direction. Not ratified by Chris; T2 verifies it and may challenge it. `[DERIVED · coordinator]` — the coordinator's implementation interpretation (Beat 9 only).
- `[DESIGN-OPEN]` — none in scope. `[BLOCKED]` — none.

**Status:** DRAFT for T2 (original). **Not locked by Chris personally** — see §A.
**Author:** T1 / `t1-sunday-parity` (Claude Code session `1470cf53-cb8c-459b-a4a2-787383448af0`, https://claude.ai/code/session_018Y4LCyxKSLJCHkcmpDoV4w) · 2026-10-01
**Slice:** backlog F60 · repo `subcon-command` (formerly `sales-command`) · branch `feat/sunday-saturday-parity`, isolated worktree · base `origin/main` @ `3145a7a49984015cbfa30013f502d24c45c9358a`
**Type:** feature · UI slice (AIOS dev protocol §14 applies) · **Phase:** Planning → Plan Audit (T2, independent). The Planning lock is not recorded as met (§A). No later gate is skipped by this plan.
**Replaces** the PARKED stub of 2026-09-06 in this same file (`git log -- docs/plans/sunday-scheduling.md`). Related: `docs/plans/calendar-modernization.md` §2.1.

---

## §A Authorization record (quoted — not a lock)

T1 has not seen Chris's own messages. Everything below is relayed by the coordinator (`sunday-parity`).

1. **Direction** — coordinator's packet to T1, 2026-10-01, quoting Chris: "Okay so then I would think it's easier still to just make Sunday match Saturday. After that big work is done, then we can go back and address Saturday and Sunday being options and choose all. Thoughts?" Then, after agreement on that order: "Okay go launch that work in AIOS."
2. **Scope wording** — the same packet, coordinator's words: "Make Sunday function exactly like Saturday NOW across relevant scheduling. Preserve current Saturday rules, including bulk Select all and staffing/capacity defaults. OPTIONAL-WEEKEND/SELECT-ALL REFORM IS EXPLICITLY DEFERRED. Do not silently implement the earlier proposed weekdays-only default."
3. **Gate** — coordinator follow-up to T1, 2026-10-01 15:37 PDT: "Chris already chose exact Saturday parity and then said 'Okay go launch that work in AIOS.' He subsequently authorized consolidating Sunday first and mobile afterward into one workstream. Proceed under that existing implementation authorization; do not ask him to repeat the scope or authorize the same work again. Do not fabricate a fresh personal plan-lock event, preview acceptance, or merge authorization. … The concrete plan is now subject to the independent review already authorized as part of this work."
4. **Week links** — the same follow-up: include the week-link fix (Beat 9, S10) as "the coordinator's implementation interpretation of the approved goal, not a new quote or personal decision from Chris. No other adjacent fixes are included."

What this does and does not establish:
- **User-settled:** the direction in item 1 — Sunday matches Saturday now; optional weekends and "choose all" come later.
- **Not user-settled:** the surface-by-surface scope, the constraints and the acceptance bar below. They are T1's derivations from that direction (and, for Beat 9, the coordinator's interpretation).
- **No personal plan lock by Chris was observed, asked for or recorded.** T1 drafted a lock question and did not put it to him; the coordinator directed this revision to independent T2 instead. That departs from the Planning gate (repo `docs/DEVELOPMENT_PROTOCOL.md`, Planning; AIOS dev protocol §3, T1). It is recorded here as a departure, not resolved by T1.
- Nothing here is preview acceptance, merge approval or release approval. Chris Acceptance after the preview is unchanged.

---

## §0 Baseline — observed 2026-10-01 at `3145a7a`

**Evidence and its limits**
- Read directly at the base commit: `src/schedule/views/{Schedule,Daily,Calendar,Home,CrewPhone,Schedules}.jsx` in full, `views/Jobs.jsx` (week logic); `src/schedule/lib/{weeks,workdays,crewWeekText,crewStatus,crewScheduleRows,crewWeekSummary,scheduleCrew,allocations,assignmentIdentity,trips,jobCardSchedule,calendarBars,exports}.js` in full; the week, alert and dashboard parts of `lib/queries.js` and `lib/billingForecast.js`; `components/{HomeCapacityStrip,CrewWeekCapacity,WeeklyCapacityBand,ScheduledOffModal,DaysModal,StatsBar,JobsToPrepare,HomePanels,ScheduleTripDetails,TripsPanel}.jsx`; the cited rules in `src/schedule/App.css`; `src/field/lib/crewBoard.js`.
- A tree-wide grep of `src/` for weekday math, day-name lists, six-day loops, index `[5]` and Monday+5 offsets. Every hit is in 0.1–0.4 below.
- The stub's §0 was verified against `main` @ `2c2d5ed`. Its line numbers and two of its facts are stale: the weekend rule now lives in `lib/workdays.js` (not inline in `DaysModal` / `StageJobCard`), and `StatsBar.jsx` is no longer mounted.
- **Not observed:** no screen was rendered (layout statements come from CSS); no production query was run (U4); no native device was used.

**0.1 Weeks are already bucketed Monday–Sunday. Only the visible week stops at Saturday. `[DERIVED]`**
- Every `getMonday` copy puts Sunday in the week that began the Monday before: `lib/weeks.js:11–18`, `lib/queries.js:949–955` and `:1751–1754`, `views/Schedule.jsx:22–29`, `views/Daily.jsx:17–24`, `lib/exports.js:16–23`, `views/Jobs.jsx:56–62`, `lib/jobCardSchedule.js:30`, `lib/crewStatus.js:56–63`.
- The week's day list is six dates. Canonical `wkDates`: `lib/queries.js:1755–1759` (used by Home, Jobs, `WeeklyCapacityBand`, Calendar, and `src/lib/subconSummary.js:90`). Local copies: `views/Schedule.jsx:42–50`, `views/Daily.jsx:37–45`, `lib/exports.js:36–44`.
- The week end is written as index 5 or Monday+5: `Schedule.jsx:199,205`; `Daily.jsx:180`; `exports.js:72,153`; `fmtWk` in `weeks.js:32–39`, `Schedule.jsx:35–40`, `Daily.jsx:30–35`, `exports.js:29–34`; `crewStatus.js:65–73`; `billingForecast.js:272`; `Calendar.jsx:224`.

**0.2 Saturday today, by surface — the behavior Sunday must copy `[DERIVED]`**

| # | Surface | Saturday today | Sunday today |
|---|---|---|---|
| 1 | Crew Schedule board, `views/Schedule.jsx` | Sixth column. Labels end at `Sa` / `Sat` (`:18–19`). Grid `260px repeat(6, 1fr)` (`App.css:1103`). Week reads of `assignments` and `crew_status` end at `dates[5]` (`:250–251`). Board rows use the window `wsStr…weStr`, `weStr = dates[5]` (`:205`, `:332`). A day is inside a trip by plain date comparison, no weekday rule (`crewScheduleRows.js:23–25`, `allocations.js:61–68`), so a Saturday inside a trip's dates shows the needs-crew marker (`:917–918`) and can be staffed. **Select all** = every in-range day in `dates` where the person is available and assignable (`:461–465`). Day sites over `dates`: header `:1356–1361`, cells `:881–928`, deferred-start chips `:1022–1030`, crew day header and toggles `:1143`, `:1154–1167`, status picker `:1394–1402`, assign picker `:1438–1465`, pool dots and letters `:1216–1225`, `:1237`, `:1257`, crew week popup `:1497–1536` (inline `repeat(6, 1fr)` at `:1497`), Prev/Next pulse `:359–366`. | No column. Not loaded. Not assignable. A trip whose dates touch only Sunday overlaps no board week (`allocations.js:50–57`), so it never appears and cannot be staffed. |
| 2 | Weekly Crew Capacity strip, `components/HomeCapacityStrip.jsx` | Six day cards: labels `MON…SAT` (`:6`), grid `repeat(6, 1fr)` (`App.css:6768`). On the board the numbers come from `crewWeekCapacity` + `crewWeekSummary` over the board's `dates` (`CrewWeekCapacity.jsx:14–16`). Elsewhere from `computeHomeDashboard` (`WeeklyCapacityBand.jsx:17–43`, `Jobs.jsx:252–255`). | No card. Not counted. |
| 3 | Schedule Home, Jobs, Subcon Home summary | `computeHomeDashboard` over the canonical week (`lib/queries.js:1807–1997`): per-day capacity (`:1845–1864`), crew assignments, schedule completion % (`:1911–1922`), short on crew, conflicts (`:1886–1897`). Home's Crew Capacity % is the mean of the day percentages (`Home.jsx:142–146`). Week reads run `dates[0]…dates.at(-1)` (`Home.jsx:46–56`, `Jobs.jsx:142–145,150–162`, `subconSummary.js:89–103`). `getJobMultiWeekAlert` checks six days per later week (`queries.js:973–978`, used at `Jobs.jsx:300`). | Not counted. |
| 4 | Calendar, `views/Calendar.jsx` | Month grid is Sun–Sat, seven columns (`:70–82`). Week view is Mon–Sat from canonical `wkDates` (`:375–376`). | Month: shown. Week: a Sunday column appears **before Monday**, only when that Sunday has crew (`:368–374`); the week's fetch range is the Sunday before through Saturday (`:218–231`). |
| 5 | Daily, `views/Daily.jsx` | Six columns: `DAYS` (`:13`), reads `.in('date', ds)` (`:104–105`), `we = dates[5]` (`:180`), status loop `di < 6` (`:201`), grids `130px repeat(6,1fr)` (`:430`, `:443`). | Absent. |
| 6 | Print, `lib/exports.js` | Week Schedule (`:68–112`) and Daily Crew Status (`:148–192`): labels Mon–Sat (`:71`, `:151`), reads end at `dates[5]` (`:77`, `:157–158`), loops `< 6` (`:170`, `:174`). | Absent. |
| 7 | Crew texts | Weekly send is Monday–Sunday already (`crewWeekText.js:13–20`; `CrewPhone.jsx:195`; `Schedules.jsx:118`). Midweek Update is today through Saturday: `crewWeekDates(day).slice(0, 6)` (`crewWeekText.js:111–115`). Five phone strings say Saturday (`CrewPhone.jsx:151,168,169,195,210`). | Weekly: included. Midweek: never; on a Sunday it returns nothing. |
| 8 | Scheduled Off, `components/ScheduledOffModal.jsx:71–72` | **This Week** / **Next Week** fill Monday → Monday+5 (`crewStatus.js:65–73`). | Outside both presets. A custom range accepts Sunday (`crewStatus.js:75–88`). |
| 9 | Finance / Billing | Week labels use `fmtWk`, Monday → Monday+5 (`weeks.js:32–39`; `Billing.jsx:89,174`; `BillingForecast.jsx:45,100`). The worklist also computes a "this week" window, Monday → Monday+5 (`billingForecast.js:270–272`), read only by the `production` arm (`:135–146`, `:156–163`). | Forecast buckets are Monday-anchored and already hold Sunday dates (`billingForecast.js:196–238`); only the label stops at Saturday. **The worklist window changes nothing a user sees:** the `production` arm needs `billed > 0`, a job with `billed > 0` already has a sent invoice (`:73–82`) and so already surfaces (`:307–309`), and `arm` is read nowhere outside that file. A Sunday-dated job is on the worklist today (reproduced by running `buildBillingSurface` at base: Saturday- and Sunday-dated partly billed jobs get the same row, status, label and amounts). |

**0.3 Already the same for Saturday and Sunday — not changed by this plan `[DERIVED]`**
- **Worked-day rule.** `lib/workdays.js:18–23` treats day 0 and day 6 alike: a weekend day counts only when crew is assigned that day. It feeds job-card day counts (`jobCardSchedule.js`), `DaysModal.jsx`, Calendar bars (`calendarBars.js:81–106`) and the Calendar job pane total. The file's header comment says "6-day (Mon–Sat)"; the code is the rule.
- **Trip dates.** `MobsModal.jsx` and `ScheduleTripDetails.jsx` accept any date. A Sunday-only trip can be saved today.
- **Field desktop Crews** is Monday–Sunday (`src/field/lib/crewBoard.js:68–76`) through the same `crewWeekRows`. **Time Clock** payroll week is Monday–Sunday (`src/field/lib/timeClock.js:79–88`).
- **Jobs "This Week" chip** is Monday–Friday (`JobsToPrepare.jsx:33`); Saturday and Sunday are both outside it. `Jobs.jsx:64–71` `isThisWeek` is Monday–Sunday.
- **Other repos, read on GitHub 2026-10-01.** Native `field-command` `main` @ `a39cad3`: Home's week is seven dates, Monday–Sunday (`src/screens/HomeScreen.js:28–44,77–79`). `command-suite-db` `main` @ `b93d3a0`: no weekday predicate in any SQL file (tree grep for `dow`, `isodow`, weekday names; 36 SQL files mention `assignments`, none limits a weekday); `job_mobilizations.start_date` / `end_date` are plain `date`. The live production schema was not probed.

**0.4 Dead code `[DERIVED]`:** `components/StatsBar.jsx` is imported nowhere; its `.statsbar` rule (`App.css:386–394`), the unused `.sch-stats-bar` rule (`App.css:752–760`) and `wkEnd` (`Schedule.jsx:52–56`, never called) hold six-day logic that no screen runs.

**0.5 Adjacent defect found while tracing week links `[DERIVED, reproduced 2026-10-01]`**
The board turns `?week=<date>` into a week by rounding days ÷ 7 (`Schedule.jsx:121–127`, `:186–195`). A date that is a Friday, Saturday or Sunday therefore opens the **following** week. Reproduced by running that arithmetic for each weekday. One caller passes a raw date: **Open Crew Schedule** in a job's Trips panel (`TripsPanel.jsx:100`). The other callers pass a Monday (`jobCardSchedule.js:22–36`, `HomePanels.jsx:42`, `Schedules.jsx:78`). See Beat 9.

**0.6 Recorded decisions this plan changes**
1. This file, 2026-09-06, §1 `[LOCKED]`: "Sunday remains the default day off; this is the exception path made real." Also its §2 option of an on-demand Sunday column.
2. `docs/plans/calendar-modernization.md` §2.1, "Month/Week Sunday consistency": "Week view shows a Sunday column only when the focused week has Sunday work".
3. Handoff v287 and `docs/BACKLOG.md:9`, 2026-09-23: Midweek Update — "Sunday remains empty".

Side note: commit `75f608d` (Saturday in the Midweek Update) is an ancestor of `origin/main`; the note at `docs/BACKLOG.md:9` still says "pending merge".

**0.7 Parallel work — fetched 2026-10-01 15:20 PDT**
- Mobile Crew Scheduler, backlog F66: branch `feat/mobile-crew-scheduler-preview` @ `2e01618`, based on `28c8468` (the unmerged F65 mobile shell). Against `origin/main` it is 20 commits ahead and 1 behind, and has no `src/schedule/**` diff yet. Its plan (`docs/plans/crew_mobile_preview.md` on that branch) names `src/schedule/views/Schedule.jsx` and `src/schedule/App.css` as its edit targets, holds app edits until a stable Sunday commit is named, and reads the board's `dates` list rather than a day list of its own (its Beat 10, §3).
- `feat/mobile-web-preview` @ `28c8468` and `feat/calllog-brand-preview` @ `701a209`: no `src/schedule/**` diff against `origin/main`.
- `origin/feat/sunday-saturday-parity` does not exist yet.

**0.8 Brand sources read (UI slice)**
Registry `assets/brand/subcon-command/SUBCON_COMMAND_CURRENT.md` (AIOS checkout). UI standard `source-docs/SUBCON_COMMAND_UI_STANDARD_LAUNCH.md`, read in full. Canonical image `visual/crew-schedule-canonical.png`, opened: it shows six day columns, Mon–Sat. The Visual Brand Guide was not opened: this slice changes no theme, surface, typography or imagery. No unsettled brand decision was found (Beat 8).

---

## ID8 decisions

Mode: the direction was already known, so there was no broad ideation (T1 card step 1). Beats 1–2 are the user-settled direction. Beats 3–7 are T1's derivations from it: not ratified by Chris, and open to T2's challenge. Beat 8 is a settled brand rule. Beat 9 is the coordinator's interpretation.

- **Beat 1 — Direction `[LOCKED · user]`:** Chris, 2026-10-01, as relayed (§A item 1): "Okay so then I would think it's easier still to just make Sunday match Saturday. After that big work is done, then we can go back and address Saturday and Sunday being options and choose all. Thoughts?" Then, after agreement on that order: "Okay go launch that work in AIOS." Sunday works exactly like Saturday, across scheduling, now.
- **Beat 2 — Order of work `[LOCKED · user]`:** optional weekends and a Select-all change come later, as their own work ("After that big work is done…"). This slice keeps every Saturday rule as it is today — including Select all and the staffing and capacity counts — and gives Sunday the same. No weekdays-only default. (The Select-all and capacity wording is the coordinator's, §A item 2.)
- **Beat 3 — Week shape `[DERIVED]`:** the visible week is Monday–Sunday. Sunday is the seventh day, after Saturday, always shown. Reason: every week helper already puts Sunday with the Monday before it (0.1); payroll and the weekly texts already run Monday–Sunday; Saturday is always shown, so Sunday is.
- **Beat 4 — Supersedes `[DERIVED]`:** the three recorded decisions in 0.6 no longer hold. Sunday is not an exception path. The Calendar week view no longer adds a Sunday column on demand. The Midweek Update no longer stops at Saturday.
- **Beat 5 — Counts `[DERIVED]`:** capacity, staffing and week percentages count Sunday the way they count Saturday. Nothing marks Sunday as a day off. A Sunday inside a trip's dates is a day that needs crew, as a Saturday is today.
- **Beat 6 — What does not move `[DERIVED]`:** the worked-day rule (0.3) stays as it is; job-card day counts and Calendar bars do not start treating weekends as working days. Stored statuses keep their meaning. Nothing creates a Sunday absence or a Sunday assignment on its own.
- **Beat 7 — Size of the change `[DERIVED]`:** date-driven and minimal. No refactor of the duplicate week helpers, no dead-code cleanup, no restyle. Reason: `Schedule.jsx` and `App.css` are shared with the mobile slice (0.7).
- **Beat 8 — Brand `[LOCKED · brand]`:** Sunday takes Saturday's existing treatment on every surface — same classes, same label pattern (`Su` / `Sun` / `SUN` / `S`). No new color, font, radius or token. UI standard §1 (no redesign; the seventh day is the requested functional change), §10 "Tables / schedules", §14.
- **Beat 9 — Week links `[DERIVED · coordinator]`:** included. Affected UI: **Open Crew Schedule** in a job's Trips panel (0.5). The options were (A) fix it in this slice — the board opens the week that contains the date in the link, for any weekday — or (B) leave it and log a separate bug. T1 recommended A and raised it as a call for Chris. The coordinator settled it as A (§A item 4): "Opening a saved Sunday trip in its actual containing week is necessary to the authorized end-to-end Sunday behavior. Correcting the same faulty rounding for Friday and Saturday is the bounded consequence of that fix." This is the coordinator's implementation interpretation, not a quote or a personal decision from Chris. No other adjacent fix is included.

---

## §1 Problem / intent

A Sunday trip can be saved, but it cannot be staffed or seen where the week is run: the crew board, the capacity strip, Daily, the Calendar week view, the prints and the Midweek Update all stop at Saturday.

Intent: Sunday works exactly like Saturday does today — same column, same assignment steps, same warnings, same counts — in the same Monday–Sunday week. Nothing else changes. Making weekends optional comes later.

## §2 Proposed change (what, not how)

**The rule.** Wherever the Schedule module shows, selects, loads or totals a week as Monday–Saturday, it uses Monday–Sunday, and Sunday gets the treatment Saturday has on that surface today.

**By surface**
- **S1 Crew Schedule board.** A seventh day column, `SUN mm/dd`, in the header and every row, with Saturday's cell rules: crew count, `need N`, `need ?`, double-booked marking, needs-crew marker, today highlight, deferred-start coloring, drop target. The assign picker, the per-person day toggles, the deferred-start chips and the Sick / Call In / No Show picker each include Sunday. **Select all** and **Clear all** cover Sunday by Saturday's rule: inside the trip's dates, person available, person assignable that date. The pool's dots and day letters and the crew week popup show seven days. The week label reads Monday – Sunday. `assignments` and `crew_status` are loaded Monday through Sunday, so a trip that touches only Sunday is on that week's board.
- **S2 Weekly Crew Capacity strip** (the board, Jobs, and the band on Calendar, Daily and Materials — `ScheduleLayout.jsx:85`). Seven day cards. Sunday's card is computed like Saturday's. Jobs Starting, Jobs Ending, Jobs Needing Crew and "crew requirements unclear" run over Monday–Sunday.
- **S3 Schedule Home, Jobs, Subcon Home summary.** Every "this week" number runs over Monday–Sunday. The Jobs multi-week alert counts Sunday crew.
- **S4 Calendar.** Week view shows Monday through Sunday, seven columns, always, Sunday last. Bars keep today's rule. Month view does not change.
- **S5 Daily.** Seven day columns in the header, job cards, staffing rows, status sections and Available list.
- **S6 Print.** Week Schedule and Daily Crew Status cover Monday–Sunday.
- **S7 Crew texts.** Midweek Update covers today through Sunday; the five phone strings say Sunday. Empty days are still omitted, coworkers still come from the same trip, and the Scheduled Off line keeps its rule. Weekly send does not change.
- **S8 Scheduled Off.** **This Week** and **Next Week** fill Monday through Sunday. The custom range, the review step and the writes do not change.
- **S9 Finance / Billing.** Week labels on the Billing header and the 90-day forecast read Monday – Sunday. No row, status, amount or forecast bucket changes; `billingForecast.js` is not edited (0.2 row 9).
- **S10 Week links (Beat 9).** Opening the board with `?week=<any date>` shows the week that contains that date. So **Open Crew Schedule** on a Sunday-start trip opens that trip's own week. The same fix corrects Friday- and Saturday-start trips, which open one week late today (0.5).

**Constraints**
- **C1 `[LOCKED · user]`** No Saturday scheduling rule changes. No Monday–Friday rule changes. One exception, from S10: the week a `?week=` link opens for a Friday or Saturday date.
- **C2 `[LOCKED · user]`** No optional-weekend setting, no weekdays-only default, no change to what Select all picks on Monday–Saturday.
- **C3 `[DERIVED]`** `lib/workdays.js` is not edited. Day counts on job cards, `DaysModal` and the Calendar are the same as base for the same data.
- **C4 `[DERIVED]`** Trip ownership is untouched. Crew days are still written with the trip's id as `mobilization_id` and removed by their own row ids only, through today's save path (`Schedule.jsx:483–526`, `assignmentIdentity.js`).
- **C5 `[DERIVED]`** Time-off safeguards are untouched. Select all never picks a day the person is out. Scheduled Off never overwrites Sick, Call In or No Show. Existing time-off ranges are not extended to Sunday.
- **C6 `[DERIVED]`** No schema change, migration, RLS or grant change, edge function, dependency, config or env change. No new Supabase call site. The only read changes are the upper date bound of existing week reads and the Calendar week range.
- **C7 `[LOCKED · brand]`** Brand: Beat 8.

**Expectation check**
- **Chris will see:** a Sunday column on the crew board, the capacity strip, Daily and the Calendar week view; Sunday in the pickers, the pool dots, the crew popup and the prints; week labels like "Sep 28 – Oct 4, 2026"; a Sunday-only trip on its week's board, staffed the way a Saturday trip is.
- **What comes with it, because Saturday works this way today:**
  - Select all on a trip that spans a weekend picks Sunday as well as Saturday. That crew's weekly text and phone then show Sunday work unless the day is unticked.
  - A trip that spans a weekend shows Sunday as needing crew, and Jobs Needing Crew lists the Sunday.
  - Sunday is a counted day. Its capacity card shows the whole roster as free unless people are marked off. Home's Crew Capacity % and Schedule completion % include Sunday, so they read lower in weeks with no Sunday crew.
  - Time off already saved as Monday–Saturday does not cover Sunday; that person shows free on Sunday. Scheduled Off's This Week and Next Week buttons run through Sunday from now on.
  - The Calendar week view always shows Sunday, at the end of the week. The Sunday column before Monday is gone.
  - The Midweek Update runs through Sunday.
  - Billing and forecast week labels read Monday – Sunday. No billing number changes.
- **One fix beyond Sunday (S10):** Open Crew Schedule from a job's Trips panel opens the right week for trips that start on a Friday, Saturday or Sunday.
- **He will not see:** a way to turn weekends off; a changed Select all; any other Saturday or Monday–Friday difference; a changed Month view; changed job-card day counts; anything new on the phone layouts, in native Field, in the Time Clock or in Sales.
- **Gap:** none known. **Not confirmed with Chris personally** (§A): this list was written for his lock and has not been put to him. He first sees it at the preview.

## §3 Files / surfaces likely touched `[DERIVED]`

**Shared with the mobile slice (0.7):** `src/schedule/views/Schedule.jsx`, `src/schedule/App.css`.

**Expected edits**
- `src/schedule/views/Schedule.jsx` — labels, week list, week end, label, popup grid (0.2 row 1).
- `src/schedule/App.css` — `:1103`, `:6768`.
- `src/schedule/lib/queries.js` — `wkDates` `:1755–1759`; `getJobMultiWeekAlert` `:973–978`.
- `src/schedule/lib/weeks.js` — `fmtWk`.
- `src/schedule/components/HomeCapacityStrip.jsx` — day labels.
- `src/schedule/views/Calendar.jsx` — week columns and fetch range.
- `src/schedule/views/Daily.jsx`; `src/schedule/lib/exports.js`.
- `src/schedule/lib/crewWeekText.js` (`crewMidweekDates`); `src/schedule/views/CrewPhone.jsx` (five strings).
- `src/schedule/lib/crewStatus.js` and `src/schedule/components/ScheduledOffModal.jsx` — the two presets.
- S10: the `?week=` handling in `Schedule.jsx` (`:121–127`, `:186–195`) or its caller `components/TripsPanel.jsx:100`.

**Four existing checks encode the six-day week and must state the new one:** `scripts/check-crew-midweek-text-model.mjs` (`:6–15`, `:144`), `scripts/check-crew-phone.mjs` (`:130–133`), `scripts/check-crew-week-summary.mjs` (Monday–Saturday labels at `:64–172`, six day cards at `:79`), `src/schedule/lib/crewStatus.test.mjs` (`:38–42`). A fifth, `scripts/check-legacy-trip-conversion-preview.mjs:90–99`, walks six day cells of a saved production snapshot; whether it still runs is U2. New focused checks for §5 follow the repo's `scripts/check-*.mjs` practice.

**Expected zero diff — these read the shared helpers or the passed `dates` (T2: confirm no index-5 assumption hides in them):** `views/Home.jsx`, `views/Jobs.jsx`, `views/Billing.jsx`, `views/Schedules.jsx`, `components/WeeklyCapacityBand.jsx`, `components/CrewWeekCapacity.jsx`, `components/BillingForecast.jsx`, `src/lib/subconSummary.js`.

**Zero diff — rules to preserve (§5 E1):** `src/schedule/lib/{workdays,trips,allocations,scheduleCrew,assignmentIdentity,crewScheduleRows,crewWeekSummary,jobCardSchedule,calendarBars,billingForecast}.js`, `src/schedule/components/{DaysModal,StatsBar}.jsx`, `src/field/**`, `src/ar/**`, `src/pages/**`, `src/components/**`, `supabase/**`, `package.json`, `package-lock.json`.

**T3's records:** `docs/agent-handoffs/BUILD-REPORT.md` with the Brand check; the F60 row in `docs/BACKLOG.md` (its text still describes the exception path) and the stale note at `docs/BACKLOG.md:9`; the next handoff, numbered from fetched state (the mobile branch already carries v299).

**Integration with the mobile slice (F66)**
1. Sunday first, mobile afterward, as one workstream (§A item 3). The coordinator names one stable, tested Sunday commit and its files to the mobile slice; mobile holds app edits until then.
2. The board keeps one week list. Day columns, labels, pickers, dots, the popup, the reads and the capacity strip all follow it. That list is what the mobile views read.
3. Both lineages are kept. `3145a7a` and this branch do not contain the mobile shell: `28c8468` is not an ancestor of `3145a7a` (checked 2026-10-01; the two branches meet at `90f890d`). The combined tree must hold that shell and the stable Sunday changes. The normal route is to merge the stable Sunday commits into the existing mobile feature branch. No existing branch is rewritten or force-pushed.
4. After that integration an independent baseline check runs on the combined tree before any further app edit there.
5. Before any release, this plan's §5 and the mobile plan's checks both pass on that combined tree. Conflicts are expected only in the two shared files.
6. This slice never edits the mobile worktree or branch.

## §4 Out of scope / deferred

- Optional weekends, a weekdays-only default, any Select-all change. Deferred by Chris (Beat 2); not designed here.
- Any Saturday rule. Any change to `lib/workdays.js`, job-card day counts or Calendar bar rules.
- The Calendar Month view. The Jobs "This Week" chip (Monday–Friday, 0.3).
- Phone layouts: the mobile slice owns them. `/crew` gets the five string changes and the Midweek range only.
- Sales: the WTC trips editor and Send to Schedule keep their behavior, including clearing tentative SOW day dates and copying trip ranges.
- Native Field (`field-command`), including how its Tasks tab fills dates for an undated SOW. The local native checkout is not touched.
- Time Clock and payroll: weekly overtime over 40 hours, paid driving, the lunch rule and overnight attribution to the start day are unchanged. No Sunday premium. Holiday benefit stays its own matter.
- Database: no migration, no RLS change, no data repair or backfill, no production write.
- Dead-code cleanup (0.4). Merging the duplicate week helpers. Re-theming the Schedule route.
- The billing worklist's internal week window (`billingForecast.js:272`). It changes nothing a user sees (0.2 row 9), so it is left alone.
- AR Command's own week logic (`src/ar/**`). The capacity band's fixed "this week" (calendar plan D9).
- Any adjacent fix other than S10.

## §5 Acceptance bar

**Harness.** Repo practice: focused `scripts/check-*.mjs` browser checks and model checks. Synthetic names only. Every backend request is answered inside the browser from an in-memory fixture. The only writes a check may trigger are `POST` / `DELETE rest/v1/assignments` and the `crew_status` upsert, answered from the fixture; any other non-read request fails the run. No agent signs in anywhere or reads or writes production. Clock fixed to Thursday 2026-10-01, `America/Los_Angeles`, unless stated. Desktop 1440×900. "Matches base" means equal to what `3145a7a` shows for the same fixture.

**Fixture.** Week W = Mon 2026-09-28 … Sun 2026-10-04.
- Job A: trip A1 2026-09-28 → 2026-10-09, needs 3; trip A2 2026-10-03 → 2026-10-04, needs 2. Job B: trip B1, Saturday 2026-10-03 only, needs 2. Job C: trip C1, Sunday 2026-10-04 only, needs 2, status Ongoing. Job N: one trip 2026-09-28 → 2026-10-09, no weekend crew. Job M: own dates 2026-09-28 → 2026-10-11, no trips. Job R: partly billed, with its end date and `partial_bill_date` on Sunday 2026-10-04.
- People: P1 Team-linked and free; P2 unlinked and free; P3 Scheduled Off on Sunday; P4 Sick on Saturday; P5 on A1 and B1 on Saturday; P6 on A1 and C1 on Sunday; X on A1 and A2 on both Saturday and Sunday.

**M — model checks (node, `TZ=America/Los_Angeles`)**
- M1. `fmtWk('2026-09-28')` is "Sep 28 – Oct 4, 2026"; `fmtWk('2026-12-28')` is "Dec 28 – Jan 3, 2027".
- M2. `crewMidweekDates('2026-10-01')` is 10-01, 10-02, 10-03, 10-04. `crewMidweekDates('2026-10-04')` is 10-04 only. A person on C1 gets `SUN 10/4 — JOB #… — with …` naming exactly C1's other crew that day. A person with nothing on Sunday gets no Sunday line. Scheduled Off on Sunday with no assignment gives `SUN 10/4 — (OFF — MAY CHANGE)`. The existing Saturday fixture lines in `check-crew-midweek-text-model.mjs:121–141` are unchanged.
- M3. The Scheduled Off presets from 2026-10-01: this week 2026-09-28 → 2026-10-04; next week 2026-10-05 → 2026-10-11. From Sunday 2026-10-04, this week is still 2026-09-28 → 2026-10-04.
- M4. Billing, today 2026-10-01: `buildBillingSurface` returns rows, totals and a forecast deep-equal to base for a fixture that includes job R. Job R has a row on both.
- M5. Job M with its only W+1 crew day on Sunday 2026-10-11 raises no multi-week alert (base: one). With that day on Saturday 2026-10-10 instead, the result matches base.
- M6. `jobCardSchedule` gives the same work-day count as base for job N, and for job A with its weekend crew.

**B — Crew Schedule, `/schedule/schedule?week=2026-09-28`**
- B1. The header shows MON 09/28 … SAT 10/03, SUN 10/04, in that order. The label reads "Sep 28 – Oct 4, 2026". The `assignments` and `crew_status` reads carry `date gte 2026-09-28` and `lte 2026-10-04`.
- B2. B1 and C1 are both rows on this week's board. Neither is on the week of 2026-10-05.
- B3. Assign, identical. Drag P1 onto C1: the picker shows seven day chips and only Sun is enabled. Choose Sun, Assign: exactly one `POST assignments` with job C's `job_id`, C1's id as `mobilization_id`, `crew_name`, `date 2026-10-04` and P1's `team_member_id`. The Sunday cell's count goes up by one. The same steps on B1 send the same request with `date 2026-10-03`. With P2 the row carries `team_member_id: null`.
- B4. Edit and remove. In A1's expanded row a person's Su toggle on sends one `POST` for 2026-10-04; off sends one `DELETE` naming that one row id. Sa does the same for 2026-10-03. ✕ deletes only that person's own row ids on that trip.
- B5. Select all on A1: for P1 it reads "Select all 7" and picks Monday–Sunday. For P3 it reads "Select all 6" and leaves Sunday out. For P4 it reads "Select all 6" and leaves Saturday out. Picking the out day by hand still saves, as today.
- B6. Double-booking. P6's chip shows `2X`, both of P6's Sunday cells carry the double-booked marking, and the picker's Sunday chip names the other job. P5 shows the same on Saturday and matches base.
- B7. Overlapping trips keep ownership. On A2's row, turning X's Su off sends one `DELETE` for that one row id and nothing else. A1's Sunday row for X keeps its id and date. Reopening the picker for X on A2 labels Sunday "(another trip)".
- B8. Status. The Sick picker for P2 shows seven chips. Choosing Sun writes one `crew_status` row for 2026-10-04. The Sunday card's Out count goes up by one, and P2's crew week popup shows SICK under SUN.
- B9. Scheduled Off. This Week fills 2026-09-28 → 2026-10-04; Next Week fills 2026-10-05 → 2026-10-11. For X the review lists the Saturday and Sunday assignments and changes neither.
- B10. Capacity strip. Seven cards, MON 28 … SUN 4. SUN 4's assigned / available, free, out and percent equal the fixture's Sunday truth, computed as SAT 3's are. Its click opens "SUN 10/4" with the Available, Assigned and Out lists. Jobs Starting and Jobs Ending each include job C. Job A's Needing Crew detail lists Sunday Oct 4 next to Saturday Oct 3.
- B11. Pool and popup. An assigned person's chip shows seven dots under M T W T F S S. The crew week popup has seven day columns, the last SUN 04. The deferred-start chips on A include Su.
- B12. Week edges. `?week=2026-10-26` ends SUN 11/01 (clocks fall back). `?week=2026-12-28` ends SUN 01/03 with the label "Dec 28 – Jan 3, 2027". `?week=2027-03-08` ends SUN 03/14 (clocks spring forward). Each shows seven consecutive dates with none repeated or skipped, and reads `lte` that Sunday. From week 2026-09-28, Next loads 2026-10-05 … 2026-10-11, and the 2026-10-04 crew days are not on it.
- B13. Monday–Saturday. Every Monday–Saturday cell, count and marker on the board matches base.
- B14. Existing Sunday rows. On first load, before any check writes, the fixture's saved Sunday rows — P6's and X's crew days and P3's Scheduled Off — already show in the Sunday column, the pool dots and the SUN 4 card. Only reads are sent.

**H — Home and Jobs**
- H1. `/schedule/jobs` and the band on `/schedule/calendar`: seven capacity cards; SUN 4 is computed as SAT 3 is.
- H2. `/schedule/home`: Crew Capacity is the rounded mean of those seven percentages. "Crew assignments · This week" counts the Sunday rows. The week reads end `lte 2026-10-04`.

**K — Calendar, `/schedule/calendar`**
- K1. Week view of 2026-09-28: seven columns in the order Mon 28, Tue 29, Wed 30, Thu 1, Fri 2, Sat 3, Sun 4. No column sits before Monday. The label reads "Sep 28 – Oct 4, 2026". A week with no Sunday crew shows the same seven columns.
- K2. Job C's crew draws a bar in Sun 4. Job A's bar runs through Sat 3 and Sun 4, where crew is assigned. Job N's bar stops Friday and resumes Monday, as on base.
- K3. Month view for October 2026 matches base.

**D — Daily, `/schedule/daily`**
- D1. Seven day columns, Mon 9/28 … Sun 10/4. The label reads "Sep 28 - Oct 4, 2026". The reads include 2026-10-04.
- D2. Job C's card shows ✓ under Sun for its crew. Job A's staffing row shows Sunday the way it shows Saturday. P3 is listed under Scheduled Off with Off under Sun. P6 shows 2X under Sun.

**X — Print (Actions → Export)**
- X1. Week Schedule: the subtitle reads "Sep 28 - Oct 4, 2026"; job C is listed with its Sunday crew; the `assignments` read ends `lte 2026-10-04`. (The print lists Ongoing and On Hold jobs only, as today.)
- X2. Daily Crew Status: seven day columns, the last "Sun 10/04"; Sunday cells show the job number or the status label.

**T — Crew texts**
- T1. Weekly send, `/schedule/schedules?week=2026-09-28` and `/crew?week=2026-09-28`: the text matches base.
- T2. Midweek, `/crew?mode=midweek`: the range line reads "THU 10/1 – SUN 10/4 · today through Sunday"; the Sunday lines from M2 appear in the preview and in the shared text; the five strings say Sunday; the assignment read stays Monday–Sunday. With the clock on Sunday 2026-10-04 the range is that one day and its lines are present.

**L — Billing, `/schedule/billing?tab=worklist`**
- L1. The header reads "Total to bill — Sep 28 – Oct 4, 2026". Forecast bucket labels read Monday – Sunday. Every row, status and dollar figure matches base, job R's included.

**W — Week links (S10)**
- W1. From a job's Trips panel, **Open Crew Schedule** on a trip starting Fri 2026-10-02, Sat 2026-10-03 or Sun 2026-10-04 opens the week of 2026-09-28 with that row in view. A Monday-start trip opens the same week as on base.

**F — Desktop layout and brand, 1440×900 and 1280×800**
- F1. The board, the capacity strip, Daily and the Calendar week view show all seven day columns with no sideways page scroll and no clipped or overlapping label, count, `need N`, percent or TODAY tag.
- F2. Sunday's column and card use the classes Saturday's use. The diff adds no color, font, radius, shadow or token. The Monday–Saturday columns differ from base in width only.
- F3. `BUILD-REPORT.md` carries the Brand check (AIOS protocol §14): the documents and sections checked — UI standard §1, §10 "Tables / schedules", §14, §17 steps 9–10, §18 "AI coding-agent acceptance checklist" — the changed surfaces, screenshots at both widths, and each check not performed. The canonical image shows six day columns; the seventh is the requested change, so no match to that image is claimed for the column count.
- F4. If seven columns cannot stay readable at 1280 without a layout decision, T3 HALTs with a PLAN SEED and does not pick.

**E — Preservation (T4 reads the diff)**
- E1. Zero diff across the §3 zero-diff list.
- E2. No new Supabase call site. No change to `changeRowAssignments`, `newAssignmentRows`, `planScheduledOff` or the status writes. Read changes are limited to C6.
- E3. On the board, one week list drives the columns, labels, pickers, dots, popup, reads and capacity strip (§3 Integration, item 2).
- E4. `npm run build` passes. ESLint reports no new finding in a touched file and no more than the base totals (U3).
- E5. The existing checks pass unedited, apart from the four named in §3 (and the snapshot check noted there) — among them `assignmentIdentity.test.mjs`, `scheduleCrew.test.mjs`, `src/field/lib/crewBoard.test.mjs`, `check-crew-week-text-model.mjs`, `check-crew-week-summary-model.mjs`, `check-overlapping-crew-trips-model.mjs`, `check-job-card-schedule.mjs`, `check-time-clock.mjs` — subject to U2.

**P — Vercel preview.** The preview is Ready on the reviewed commit and the affected flow is walked (repo Workflow Rule 8). The coordinator pushes. The preview shares the production database, so no agent signs in or saves on it. Chris's own walk is the signed-in check.

**N — Other apps: verification only, no edits.** Native Field: a Sunday crew day saved from the board shows on that person's Home week. This needs a real device and signed-in data, so it is Chris's check or a separately authorized one; it does not gate this build. Time Clock: `check-time-clock.mjs` passes unedited.

**U — Not observed by T1.** T3 records U1–U3 before the first app edit.
- U1. Base screenshots of the populated board, strip, Daily and Calendar week at 1440 and 1280.
- U2. Which existing checks run in the build environment on base.
- U3. ESLint totals on base.
- U4. Whether production already holds Sunday-dated `assignments` or `crew_status` rows. This is a read-only observation, made only if it is accessible. It does not block the first app edit and calls for no production write. If it cannot be inspected, that limit is recorded. Either way B14 covers existing Sunday rows with the fixture: any that exist become visible on Sunday's column and count in Sunday's capacity. No migration or backfill is proposed.

**What a pass does not prove:** that signed-in users see their real records (repo `CLAUDE.md` Workflow Rule 10); anything about phone layouts; anything on a native device.

Completion claims stay separate: code built · data applied (none) · authenticated access (Chris's walk) · Chris's acceptance (pending).

## §6 Estimate

Agent elapsed time to a tested Vercel preview: about 60–90 minutes of build and local checks, then about 15 minutes for the Smoke Test, the push and the deployment. The reviews (T2, T4, T5, T6) are separate.

Uncertain: U1 and F4 (whether seven columns stay readable at 1280); U2; how the mobile slice's rebase onto the Sunday commit goes.

---

## Audit manifest

_Generated by `/auditcriteria` on 2026-10-01 by T2 / `t2-sunday-parity` (Claude Code session `471c2a52-fb03-4034-ac24-0dcf72bf2f23`), independent of the plan's author. Consumed by `/runaudit` to size the adversarial audit pass._

### Bottom line (plain English)
A wide but shallow change: the same "the week ends Saturday" assumption is repeated on about ten scheduling screens, and each one gets a Sunday. Nothing new is invented and the database is not touched. Two reviewers: one on the crew board's save path (so showing Sunday can never remove or misfile a crew day), one on every other place a week is counted, to confirm the plan's list is complete and its dates are right.

### Round
- Plan type: feature (`**Type:** feature`)
- Current round: 1
- Plan revision under audit: `745a291c08c353c1918708646f3f154c821c3804`
- Sizing basis: full-surface — round 1
- Delta scope (round N>1 only): n/a
- Findings trend: n/a — round 1

### Prior rounds
none — this is round 1

**Briefing for agents**: do NOT re-find issues from prior rounds. Each round's revision-pass commit message is the canonical record of what was addressed. Attack ONLY material new to the plan revision under audit.

**Plateau signal**: plateau forms when round-N count is steady or higher than round-(N-1), not just at round 3+. The plateau is usually scope creep — each revision answers prior findings by ADDING mechanism, which adds surface, which produces new findings. `/runaudit` MUST present scope-cut as the only build-prompt option when plateau is detected. Hedged "do D or do A and also 13 items" prompts make the loop worse, not better.

### Deployment context
- **Live tenants**: 1 — HDSP only
- **Prod / staging / dev**: the Schedule module is live in production for HDSP's office schedulers; the Vercel preview shares the production database (§5 P)
- **Blocking feature flags**: none
- **Concurrency profile**: ≤5 (office schedulers)

Agents weight severity against these values. Cross-tenant findings cap at Med while `live_tenants == 1`. Multi-user race findings cap at Low while solo. Theoretical attacks against state that doesn't exist yet are not High.

### Time budget + finding cap
- **Time budget**: 105 min (§6: 60–90 min build and local checks + about 15 min smoke, push and deployment; upper bound used)
- **Finding cap**: 11 findings

Synthesis MUST surface only the top-N most consequential findings. Remainder go to "Quarantined findings (not actionable this loop)." Cap forces prioritization; without it, the audit defaults to dumping.

### Surface
- Total lines: 289 (before this manifest)
- Sections: 8 (`§A`, `§0`–`§6`) plus the ID8 decisions block
- [LOCKED] decisions: 6 — `[LOCKED · user]` Beat 1, Beat 2, C1, C2; `[LOCKED · brand]` Beat 8, C7. The plan states that none of these was locked by Chris personally on this artifact (§A)
- [DESIGN-OPEN] items: 0
- [OPEN] items: 0 (four "not observed" items, U1–U4)
- Plan-to-code ratio: about 2:1 (289 plan lines : roughly 150 changed lines across about 13 source files and 4 checks — T2's estimate; §6 gives time, not lines). No flag.

### Layers touched
- UI / components (board, capacity strip, Daily, Calendar week view, prints, crew phone strings, Scheduled Off presets, Billing labels)
- Data layer (the upper date bound of existing week reads; week totals in `computeHomeDashboard`; `getJobMultiWeekAlert`; the Calendar week fetch range)

### New mechanisms introduced
- none. No column, table, helper, trigger, policy, route or job. One behavior change beyond Sunday: how `?week=<date>` resolves to a week (S10).

### Cross-system reach
- Passive only. Native `field-command` and the shared production database read the same `assignments` and `crew_status` rows; this slice edits neither and changes no row shape (C6). Sunday-dated rows written from the board become visible to native Home, which is already Monday–Sunday (0.3).
- No service-role or bypass-RLS write path is added or changed.

### Irreversibility
- none — all changes reversible (no migration, backfill, API or schema-contract change). Crew days saved on a Sunday through the existing save path are ordinary rows.

### Known weak points
- **Planning lock not recorded (§A).** The plan says Chris did not personally lock this artifact; scope, constraints and the acceptance bar are T1's derivations. This is a provenance fact for the gate record, not an attack angle.
- **Existing Sunday rows start loading on the board (S1, B14, U4).** The save path removes every row in `row.assignments` for that person that is not among the picker's selected days (`Schedule.jsx:494`). Sunday rows were never in that list before. Whether every picker and toggle seeds its selection from the same list, so nothing already saved is dropped, is asserted (C4) but not traced.
- **"Zero diff" claims (§3).** `crewWeekSummary.js`, `crewScheduleRows.js`, `scheduleCrew.js`, `allocations.js`, `calendarBars.js` and the eight "expected zero diff" views and components are claimed to follow the passed `dates`. One hidden index-5, six-label array or six-wide grid makes E1 and the plan's coverage wrong at the same time.
- **Calendar week view (S4).** Today's Sunday column belongs to the week that starts the day after it, and the fetch range starts on that Sunday (`Calendar.jsx:218–231`, `:368–376`). Moving Sunday to the end changes which week a Sunday belongs to on that screen; what a Sunday click in Month view focuses is not stated.
- **S10 location is left open (§3: "in `Schedule.jsx` … or its caller `TripsPanel.jsx:100`").** §2 S10 and W1 describe a rule for any `?week=` date, which only a board-side fix satisfies. The same rounding appears twice (`Schedule.jsx:121–127`, `:186–195`).
- **C1 is tagged `[LOCKED · user]` and carries an exception (Friday and Saturday week links) that came from the coordinator (Beat 9).**
- **Acceptance bar size.** About 45 checks against a 60–90 minute build estimate; B13, T1, K3, L1 and M4 depend on a "matches base" comparison whose base capture is itself unobserved (U1, U2).
- **Counts that move for everyone (Expectation check).** Capacity and completion percentages drop in weeks with no Sunday crew, and Select all on a weekend-spanning trip books Sunday. Stated by the plan as consequences of parity; agents confirm the plan's description matches what the code would do, and do not reopen the product choice.

### Open questions
- Count: 4 (§5 U1–U4)
- Highest-pressure: U4 (whether production already holds Sunday-dated rows — decides how much B14 matters); U2 (which existing checks run at all)

### Suggested attack angles (2 total)
1. **Board user-path trace: assignment preservation and week links** — covers UI + the board's data reads and writes. Required reading: `src/schedule/views/Schedule.jsx`; `src/schedule/lib/{allocations,crewScheduleRows,assignmentIdentity,scheduleCrew,crewStatus,trips}.js`; `src/schedule/components/{ScheduledOffModal,TripsPanel}.jsx`. Specific pressure: once Sunday rows load, can any save, toggle, ✕, Select all / Clear all, status write or Scheduled Off run remove, re-own or duplicate a crew day it does not remove today; does Select all on Sunday follow exactly Saturday's rule; does `?week=` resolve correctly for every weekday, past and future, across both rounding sites and the week-change guards.
2. **Week-consumer coverage and date boundaries** — covers every other surface, the data layer and the passive cross-system reach. Required reading: `src/schedule/lib/{queries,weeks,exports,crewWeekText,crewWeekSummary,calendarBars,jobCardSchedule,workdays,billingForecast}.js`; `src/schedule/views/{Calendar,Daily,Home,Jobs,CrewPhone,Schedules,Billing}.jsx`; `src/schedule/components/{HomeCapacityStrip,CrewWeekCapacity,WeeklyCapacityBand,BillingForecast}.jsx`; `src/lib/subconSummary.js`; `src/field/lib/crewBoard.js`; the five named `scripts/check-*.mjs` and `crewStatus.test.mjs`. Specific pressure: a six-day assumption the plan's §0 inventory missed; a "zero diff" file that cannot stay zero-diff; a week whose Sunday is double-counted or dropped between two screens; month, year and clock-change edges; acceptance checks whose expected values are wrong for the stated fixture.

### Suggested agent count: 2

Rationale: the formula gives 3 (two layers, plus one for cross-system reach); the cross-system reach here is read-only with no contract change, so it is folded into angle 2 rather than staffed on its own, and with no new mechanism a third reviewer would re-read the same files.
