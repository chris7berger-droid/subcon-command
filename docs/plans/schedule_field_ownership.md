# Schedule and Field ownership

Planning artifact. Locked 2026-09-24. Schedule Command owns planning and readiness. Field Command owns execution and what actually happened. No new tables, migrations, or data paths.

Revision 5, Chris acceptance correction. Field Jobs uses the Schedule Jobs compact-row language. **NOT CONVERGED. Not build-ready.** Do not build from this revision.

Office Time Clock is the desktop screen at `/field/timeclock`. Mobile Time Clock is crew punching on the phone. This slice does not redesign or expand either.

## Ownership boundary

- Schedule Command owns planning and readiness.
- Field Command owns execution and what actually happened.
- PROP stays on Sales Proposals. The removed card figure is `jobs.amount`, the proposal total sent to Schedule. Finance Contract is a different figure: `authoritativeTotal` (`billing_schedule.contract_sum` when it is greater than 0, otherwise `proposal.total`). Those can diverge. Removing the card dollar does not leave that same number on Contract. The removal is intentional.
- BILLING stays on Schedule Finance / Billing (`/schedule/billing`).
- DEPOSIT stays on Sales Invoices (`invoices.is_deposit`).
- FILES stay on Sales Call Log Attachments. The card FILES tile was never wired.
- NOTES stay on the Schedule job. Move the existing `NotesPanel` into Details before Management is removed. The parent trip already shows `jobs.notes` and is not the editor. Billing notes stay on Finance / Billing (`billing_worklist.chris_notes`).

## Schedule job card

Keep:

- SOW score, Field SOW editor, and the manual trip Scope / SOW
- Crew tile (opens Crew Schedule) and the Details crew readout
- Materials (MTRL)
- Dates, trips, and mobilizations (DAYS, MOBS, TRIPS)
- Details readout of the SOW
- Readiness
- Load-Out, moved into Planning. It still opens `LoadOutModal`. Desktop Field Load-Outs opens this same modal.
- The existing `NotesPanel`, moved into Details before Management is removed. Details today only prints `job.notes`. Do not add another notes editor. Do not treat that read-only row as the save path.

Remove:

- Management panel, only after `NotesPanel` is on Details
- Budget tab. This tab is the only view of the frozen `job_wtcs.bid_breakdown` (hours, labor, materials, travel, cost, margin, burden). Actual and Δ there are the literals `pending` and `—`, not live execution actuals. Removing the tab drops that bid view. That removal is intentional. This slice does not add a replacement Budget screen.
- PRT tile, active-banner PRT label, and PRT modal
- Logs tile and `LogsModal`
- PROP, BILLING, and DEPOSIT tiles, and the collapsed-row dollar amount (`jobs.amount`)
- FILES stub

`billingWorklist` on the Schedule Jobs page stays. It still feeds the nothing-to-bill filter, not the removed tile.

## Field Jobs

The canonical UI is Schedule Jobs: `JobsToPrepare` and the compact `StageJobCard` (`variant="home-compact"`). Field Jobs matches that list in spacing, type, badges, information hierarchy, and interaction. Do not mount `StageJobCard` or `JobsToPrepare`. Those components carry Schedule planning actions (BUILD SCHEDULE, Promote, Kickoff, Resume, Send to Billing, PLANNING / DETAILS / TRIPS, SOW, materials, days, mobilizations, notes). Reuse their classes and the list interaction. Wrap the list in `.schedule-root` so `src/schedule/App.css` applies: `.jtp-search`, `.jtp-chips`, `.jtp-chip`, `.jtp-stage-select`, `.jtp-row`, `.jtp-badge`, `.jtp-jobname`, `.jtp-cell`, `.jtp-pill`, `.jtp-collapse`, `.sjc-card`, `.sjc-card-home-expanded`.

The screen title stays Jobs. Do not copy "Jobs to Prepare", its planning subtitle, or "View All Jobs". Today, Daily Logs, Office Time Clock, and Load-Outs stay the screens they are. Mobile Time Clock stays the phone punch path. No new Field nav item.

### Search and filters

Reuse the `JobsToPrepare` toolbar on the Field job population. Do not keep the Live / Scheduled / No crew stat strip and filter chips on this screen. Do not add a second search.

- The search input uses `jtp-search` and the placeholder "Search jobs by name, number, or work type…". Match `matchesSearch` on `job_num`, `job_name`, and `work_type`. The work-type pill uses `_wtcs` the same way the Schedule compact row does. Load the list with `loadJobs({ withWTCs: true })`, the read Schedule Jobs already uses, and pass `customer_name`, `jobsite_city`, `jobsite_state`, `work_type`, and `_wtcs` through `buildFieldJobs`. Do not add a table or a new query.
- Date chips are This Week, This Month, This Quarter, and All Time. Default is This Month. Auto-widen week → month → quarter → all when the window is empty, unless the user picked a chip. Use the same window rules as `rangeForKey`, `jobInRange`, `effectiveStart`, and `effectiveEnd`. Do not invent another date model.
- The stage control uses `jtp-stage-select`. Options are Field workflow status from `getJobStatus`: All, Scheduled, In Progress, On Hold, Complete, Ongoing. Do not use Schedule `stageOf` (staged / ready / active).
- Cap the list at 25 and show "Showing N of M". Empty copy is "No jobs match the current filters."
- The population stays `fetchFieldJobs`: every non-deleted, non-merged schedule job, including Complete.

A deep link clears search, sets the date chip and the status control to All, pins that job first, and auto-opens it. That is the same widen / pin / auto-open behavior as `/schedule/jobs?job=`.

### Compact row

One `jtp-row` per job. Click the row, or Enter / Space, expands that job inline. Close ✕ collapses that row back into the list. Expanding does not leave `/field/jobs`.

Row contents, in the Schedule order, with no planning actions:

- Status badge (`jtp-badge`). The label is `getJobStatus`. Scheduled uses `jtp-badge-staged`. In Progress and Ongoing use `jtp-badge-active`. On Hold uses `jtp-badge-on-hold`. Complete uses `jtp-badge-complete`. Do not add a badge class. Do not show Staged, Ready, Promote, Kickoff, or Send to Billing.
- Job number and name (`jtp-jobname`).
- Customer (`customer_name`).
- Work-type pill, using the same single-versus-many label as the Schedule compact row.
- Location (`jobsite_city`, `jobsite_state`).
- Start (`effectiveStart`) and the same time signal: day N of M when status is In Progress, otherwise overdue / today / in Nd.
- Crew count for the current or next trip, the count Field Jobs already computes. Do not show the planning required denominator.

Omit the actions column. No BUILD SCHEDULE, Promote, Kickoff, Resume, Send to Billing, or dollar amount.

### Expanded Field card

The expanded shell matches the compact Schedule card: `sjc-card sjc-card-home-expanded`, header title (display job number and name), and Close ✕ (`jtp-collapse`). A deep link uses the same focus ring the Schedule card uses when `autoOpen` is set, and scrolls the card into view.

The identity line uses the `sjc-identity` bubbles for job, customer, and work type. Do not show the Dates TBD planning chip. Do not render `StageBanner`, the PLANNING / DETAILS / TRIPS toggles, `NotesPanel`, or any Schedule action.

The body is Field execution only. Load it when the row expands, including when a deep link auto-opens it.

- Production reports live on this card, not on Today and not on a second screen. Reuse `PRTModal` inline (`embedded`, no overlay). It already calls `loadPRTsForJob(call_log_id)` and compares reports to that job’s SOW. Pass the job from `loadJobWithWTCs` so `_wtcs` is present. Wrap with `.schedule-root` the way Load-Outs wraps `LoadOutModal`.
- Daily Logs is one link to `/field/dailylogs?job=<callLogId>`. The card does not host a second log list.
- Office Time Clock is one link to `/field/timeclock?job=<callLogId>`. That filters the existing Office Time Clock to that call log. The card does not host a second punch list. Do not rebuild that screen. Do not change Mobile Time Clock.
- Load-Out status on the card is loaded of total from `job_material_checks` for that call log, counted the same way `fetchLoadOutJobs` counts (checked vs total). Open calls `loadJobWithWTCs` and `LoadOutModal`, the same door `/field/loadouts` uses.
- Unknown `?job=`: stay on `/field/jobs` with no expanded card. No writes.

`src/field/views/JobDetail.jsx` is retired as the page. Its PRT history, Daily Logs link, Office Time Clock link, and Load-Out move onto this card.

Today (`/field/today`) stays a today/status screen and keeps only today’s PRT flag.

## Routes and filtering

The primary Field Jobs experience is `/field/jobs`. A deep link is `/field/jobs?job=<jobPk>`, the same query style as Schedule Jobs (`/schedule/jobs?job=<id>`). It lands on the list with that job expanded inline.

`/field/jobs/:jobId` is no longer the primary page. In `src/field/FieldLayout.jsx` that route redirects to `/field/jobs?job=<jobId>`.

`jobPk` / `jobId` is `jobs.job_id` (the Jobs list `jobPk`). Child rows stay keyed by call log: `daily_log_entries.job_id`, `time_punches.job_id`, and `daily_production_reports.job_id` are `call_log.id`. Do not put the call log id in the jobs query. `loadJobWithWTCs(jobId)` already returns both. The Daily Logs and Office Time Clock links still pass `callLogId`.

`/field/jobs` lists every non-deleted, non-merged schedule job, including Complete. Unfiltered Daily Logs does not. `fetchFieldLogs` starts from `fetchActiveFieldJobs`, which keeps only call logs whose stage is in `ACTIVE_FIELD_STAGE_KEYS`. Complete is outside that set.

When Daily Logs has `?job=<callLogId>`, read that call log inside the existing 7-day window. Include Complete jobs and any other job outside the active-stage set. Do not filter the active-stage result and then drop the job. Unfiltered Daily Logs stays on `fetchActiveFieldJobs`. Do not widen that list.

Daily Logs stat strip and chip counts are computed from the rows on screen. With `?job=`, they match that job. Without it, they match the current list.

A Daily Logs `?job=` that has no rows inside the 7 days uses the existing empty state, not the unfiltered list. Empty means nothing in that window, not that the stage gate excluded the job.

`/field/timeclock` stays the current Office Time Clock. Keep `fetchTimeClockReview`, the From/To date range, review hours, office corrections, and the existing UI. Do not use `fetchFieldPunches` or `fetchActiveFieldJobs` for this screen. Do not replace the range, the review hours, or the corrections. Do not redesign or expand Office Time Clock or Mobile Time Clock.

`/field/timeclock?job=<callLogId>` filters that existing Office Time Clock to that call log (`time_punches.job_id`, already what `filterTimeClockRows` uses). Keep the selected From/To range. If that job has no punches in the selected range, show an empty result for that job. Do not clear the filter and fall back to all jobs. An id that is missing from the punches already loaded for the range must stay filtered, not be cleared the way the job dropdown clears an id that is not in `jobOptions`. No stat strip or chip requirement for Office Time Clock.

## Reuse

- `JobsToPrepare` toolbar and compact-row interaction: search, date chips, auto-widen, 25 cap, "Showing N of M", deep-link widen / pin / auto-open, click to expand, Close ✕ to collapse. Do not import `JobsToPrepare` or `StageJobCard`.
- The `.jtp-*` and `.sjc-*` classes above, inside `.schedule-root`. `effectiveStart` and `effectiveEnd` for the date chips and the row date. `getJobStatus` for the Field badge and the status control.
- `loadJobWithWTCs`, `loadPRTsForJob`, `PRTModal` (`embedded`)
- `fetchFieldLogs` for unfiltered Daily Logs. The Daily Logs `?job=` read uses the same table and the same 7-day window, without the active-stage gate.
- Office Time Clock: `fetchTimeClockReview`, `filterTimeClockRows`, From/To, review hours, and the existing correction UI. Do not call `fetchFieldPunches` or `fetchActiveFieldJobs` from `/field/timeclock`. Mobile Time Clock is unchanged. This revision only links and filters into that screen.
- `LoadOutModal` and the Load-Outs open path
- `job_material_checks` checked/total rule inside `fetchLoadOutJobs`
- The existing `NotesPanel` and `updateJobField` for `jobs.notes`, placed on the Schedule Details panel
- `FieldScreen` for the Jobs screen chrome. The job list itself is the compact rows, not `PlainTable`.

Modify:

- `src/field/FieldLayout.jsx` — `jobs/:jobId` redirects to `/field/jobs?job=`.
- `src/field/views/Jobs.jsx` — compact list replaces the table, stat strip, and filter chips on this screen.
- `src/field/lib/fieldJobs.js` and `fetchFieldJobs` — `loadJobs({ withWTCs: true })`, then pass through `customer_name`, `jobsite_city`, `jobsite_state`, `work_type`, and `_wtcs`. No new query.
- `src/field/views/DailyLogs.jsx` — `?job=` behavior from Revision 2. Unchanged by this revision.
- `src/field/views/TimeClock.jsx` — `?job=` on the existing Office Time Clock. Do not replace `fetchTimeClockReview`. Do not edit Mobile Time Clock. Unchanged by this revision.
- `src/field/lib/queries.js` — Daily Logs `?job=` read. Do not point Time Clock at `fetchFieldPunches`.
- `src/schedule/components/PRTModal.jsx` — keep the embedded path used on the Field card.
- `src/schedule/components/StageJobCard.jsx` — Schedule ownership removals stay. Do not add Field content here, and do not render this component on Field Jobs.
- `src/schedule/views/Jobs.jsx` — the card-only `daily_log_entries` and `loadPRTsForCallLogIds` drops stay. Home keeps its own PRT read. Do not change this page to serve Field.

Create:

- `src/field/components/FieldJobCard.jsx` — Field-owned compact row and expanded card. Shared classes only. It does not import `StageJobCard`.

Retire:

- `src/field/views/JobDetail.jsx`, after the expanded card owns PRT history, the Daily Logs link, the Office Time Clock link, and Load-Out.

`LogsModal` stays deleted. Card list files may keep passing `logsByCallLog` and `prtMap`. Unused props are ignored. Do not edit the `PlainTable` component. Daily Logs, Office Time Clock, and Crews still use it.

## Implementation order

Schedule card removals, Daily Logs `?job=`, and Office Time Clock `?job=` stay as Revisions 2–4 locked them. This revision replaces the separate Field job page with the inline card.

1. Field Jobs list: search, date chips, Field status control, compact rows. Stop using `PlainTable`, `StatStrip`, and `FilterChips` on this screen.
2. Click expands the Field card inline. Close collapses it. `/field/jobs?job=<jobPk>` widens filters, pins the job, auto-opens it, and scrolls it into view. Redirect `/field/jobs/:jobId` to that query. Retire `JobDetail`.
3. Expanded card: PRT history, Daily Logs link, Office Time Clock link, Load-Out status and the existing modal.
4. Daily Logs `?job=`, including jobs outside the active-stage set. Filtered Daily Logs stat and chip counts use the filtered rows. Office Time Clock `?job=` filters the existing Office Time Clock to that call log and does not fall back to all jobs. No Office Time Clock stat strip or chips. Mobile Time Clock is not in this step. Do not redesign either Time Clock.
5. Schedule card: `NotesPanel` is on Details. Management, the Budget tab, PRT, Logs, PROP, BILLING, DEPOSIT, FILES, and the collapsed `jobs.amount` stay removed. No replacement Budget screen.

## Acceptance criteria

- `/field/jobs` uses the Schedule search bar, date chips, status control, and compact rows. Clicking a row expands that job inline. Close collapses it back to the list. The row shows Field status, job number and name, customer, work type, location, start, and crew count. It does not show BUILD SCHEDULE, Promote, Kickoff, Resume, Send to Billing, or `jobs.amount`.
- `/field/jobs?job=<jobPk>` lands on `/field/jobs` with that job expanded. `/field/jobs/:jobId` redirects there and is not a separate page. PRT history on the expanded card matches `loadPRTsForJob` for its call log. The card links to Daily Logs and Office Time Clock for that call log, and shows Load-Out loaded of total. Today still shows only today’s PRT flag.
- Daily Logs with `?job=` shows that call log’s rows inside the existing 7 days, including a Complete job and any other job outside `ACTIVE_FIELD_STAGE_KEYS`. Empty means nothing in those 7 days. Without `?job=`, Daily Logs matches current behavior. With `?job=`, its stat strip and chip counts match the filtered job. Without it, they match the unfiltered list.
- `/field/timeclock` still uses `fetchTimeClockReview`, From/To, review hours, office corrections, and the existing Office Time Clock UI. `?job=<callLogId>` filters that screen to that call log. A job with no punches in the selected range shows an empty result for that job and does not fall back to all jobs. Office Time Clock has no stat-strip or chip requirement. Without `?job=`, Office Time Clock matches the current screen. Mobile Time Clock is unchanged.
- Load-Out on the expanded card shows loaded of total and opens the same `LoadOutModal` as `/field/loadouts`.
- Schedule card still has SOW, crew, materials, days, trips, mobilizations, readiness, and Load-Out under Planning. `NotesPanel` is on Details and notes still save after Management is gone. Management, Budget, PRT, Logs, PROP, BILLING, DEPOSIT, FILES, and the collapsed `jobs.amount` are gone. No replacement Budget screen exists. Finance Contract still uses its own authoritative total.
- No new table, grant, or migration. Home’s production figure still loads on its own.

## Out of scope

- A second Field screen for PRT history, Daily Logs, Office Time Clock, or Load-Out.
- Changing Today into a report archive, or changing its PRT flag.
- A Field budget screen, a replacement Schedule Budget screen, or relocating `job_wtcs.bid_breakdown` in this slice.
- Redesigning or expanding Office Time Clock or Mobile Time Clock. That includes replacing Office Time Clock, removing From/To, review hours, or office corrections, adding an Office Time Clock stat strip or chips, or loading `/field/timeclock` through `fetchFieldPunches` or `fetchActiveFieldJobs`.
- Retargeting Home’s production KPI.
- Changing Finance / Billing, Sales proposals, Sales invoices, or Call Log attachments, including making Contract equal `jobs.amount`.
- A new notes editor. Billing notes stay where they are.
- New tables, grants, or migrations.
- Widening unfiltered Daily Logs beyond the active-stage set.
- A new Field nav item, or an edit to the `PlainTable` component. Field Jobs stops using it for this list. Other screens keep it.
- Mounting `StageJobCard` or `JobsToPrepare` on Field, or copying Schedule planning actions onto the Field card.
- A second Field Jobs visual language, search, or filter system.
- Wiring the unwired FILES stub onto the Schedule card.

## Audit manifest

Plan Audit, round 1, against `9ace6bc`. Reviewed the plan against current `main` (`689d43c`); the plan commit adds only this file. **NOT CONVERGED. Not build-ready.** Do not build from this revision. Scope sections above are unchanged.

### F1 — High. Job-detail links cannot see the Jobs list

`/field/jobs` is `fetchFieldJobs` → `loadJobs()` (`src/field/lib/queries.js` 284–287, `src/field/lib/fieldJobs.js` 54–58, `src/field/views/Jobs.jsx` 24–72). That list is every non-deleted, non-merged schedule job, including Complete (`src/schedule/lib/jobStatus.js` 8–16).

`fetchFieldLogs` and `fetchFieldPunches` do not load that population. Both start from `fetchActiveFieldJobs` (`src/field/lib/queries.js` 104–117, 424–435, 450–456), which keeps only rows with a `call_log_id` whose `call_log.stage` is in `ACTIVE_FIELD_STAGE_KEYS` (15–23). Complete is not in that set. They then drop `job_id` while shaping rows (438–445, 464–470).

Adding `callLogId` and filtering those rows, and not adding a query, leaves a Jobs-list detail with an empty Daily Logs or Time Clock whenever the job is outside the active-stage set — including a Complete job that has logs inside the last 7 days or punches today. The empty copy ("No log entries in the last 7 days." / "No punches today.") reads as no history. The plan's "windows they already use" names the 7-day read and today's punches, not this stage gate.

Related gap: `DailyLogs.jsx` 31–38 and `TimeClock.jsx` 36–39 compute the stat strip and chips from the full list. Acceptance does not say those counts are limited to `?job=`.

Revision: state the stage gate, or let `?job=` read that call log inside the existing date window. Acceptance must say what a Complete job shows, and that strip/chip counts match the filtered rows.

### F2 — High. The Budget tab is the bid, not execution actuals

`BudgetPanel` (`src/schedule/components/StageJobCard.jsx` 391–449, 501–523) renders the frozen `job_wtcs.bid_breakdown` (hours, labor, materials, travel, cost, margin, burden rates). Actual and Δ are the literals `pending` and `—`. No other screen renders that breakdown. Finance → Budget is still the placeholder at `src/schedule/views/Billing.jsx` 226–231. Field is out of scope for a budget screen.

Deleting the tab removes Schedule's only bid-cost view. That is planning data. The ownership boundary says Schedule keeps planning. The remove line describes the tab as execution actuals.

Revision: keep the bid breakdown on the card, or name the other screen that will show it before the tab is deleted. Do not describe the placeholder Actual/Δ columns as live execution actuals.

### F3 — High. NotesPanel is not on Details

Details only prints `job.notes` (`StageJobCard.jsx` 381–386). `NotesPanel` (533–564) is a separate editor. The only control that opens it is the Management NOTES tile (349–352, 777). The parent trip already shows `job.notes` in `TripsPanel` and is not the editor.

"NotesPanel on Details, which already shows `jobs.notes`" and "Do not add another notes editor" tell Build to remove Management and leave Details as it is. That drops the save path. Acceptance still says notes save.

Revision: move the existing `NotesPanel` onto Details, and say that in the implementation steps. Do not treat the read-only Details row as the editor.

### F4 — Medium. The card dollar is not Finance Contract

PROP and the collapsed row (`StageJobCard.jsx` 274–282, 706–719; the Jobs list uses `variant="home-compact"` in `JobsToPrepare.jsx` 161) show `jobs.amount`. That column is the proposal total sent to Schedule (`src/lib/jobsAmount.js`). Finance Contract is `authoritativeTotal`: `billing_schedule.contract_sum` when it is > 0, otherwise `proposal.total` (`src/schedule/lib/billingForecast.js` 30–52, `BillingCard.jsx` 120–122). Those figures diverge when the SOV sum is stale (`docs/BACKLOG.md` B70).

Removing the card figure does not leave that same number on Contract. Sales proposals still hold the proposal total. The plan's "already shows it as Contract" is the wrong equivalence.

Revision: say the card figure is `jobs.amount`, and that Contract is the billing authoritative total. Keep the removal only if that difference is accepted.

### Held

Checked and not findings: `jobId` is `jobs.job_id` (`jobPk`); child rows are `call_log.id`; `loadJobWithWTCs` returns `call_log_id` and `_wtcs`; `PRTModal` calls `loadPRTsForJob(job.call_log_id)` and reads `job._wtcs`; Load-Outs already opens `LoadOutModal` inside `.schedule-root`; FILES is an unwired stub; `billingWorklist` feeds the ready-to-bill count, not only the tile; Home's production KPI loads `loadPRTsForCallLogIds` on its own (`src/schedule/views/Home.jsx` 82–88); `LogsModal` is imported only by the card; `PlainTable` already renders a cell `render`, so the Job # link does not require editing that component. `invoices.is_deposit` and `billing_worklist.chris_notes` match the ownership lines.

## Revision 2

Recorded after Plan Audit round 1. The round-1 manifest above stays as written. This revision changes the scope sections. **NOT CONVERGED. Not build-ready.**

- F1. `?job=` reads that call log inside the existing date window, including Complete and any other job outside the active-stage set. Unfiltered Daily Logs and Time Clock stay on the active-stage list. Filtered stat and chip counts match the filtered job. Empty means nothing in the window.
- F2. The Budget tab still comes off the Schedule job card. It is the only bid-cost breakdown, and Actual / Δ are placeholders, not live execution actuals. Removal is intentional. This slice does not create a replacement Budget screen.
- F3. The existing `NotesPanel` moves into Details before Management is removed. The read-only Details row is not the editor.
- F4. The removed card dollar is `jobs.amount`. Finance Contract keeps its own authoritative total. Removal is intentional.

## Audit manifest — round 2

Plan Audit, round 2, against `bff636f`, compared with current `main` (`680a600`). Scope sections above are unchanged. **NOT CONVERGED. Not build-ready.** Do not build from this revision.

### Round-1 findings

- F1. Daily Logs is resolved. `DailyLogs.jsx` on `main` still uses `fetchFieldLogs` (7 days, active-stage list, stat strip, chips). The revision tells `?job=` to read that call log inside those 7 days, including Complete, and to keep the unfiltered list on the active-stage set. That matches this screen.
- F1. Time Clock is not resolved. See R2-F1.
- F2. Resolved. The Budget tab is described as the frozen bid, Actual / Δ as placeholders, and the removal as intentional with no replacement screen. `BudgetPanel` on `main` still matches that description.
- F3. Resolved. The revision moves the existing `NotesPanel` onto Details before Management is removed. On `main` the editor is still opened only from the Management NOTES tile (`StageJobCard.jsx` 349, 533, 777).
- F4. Resolved. The removed figure is `jobs.amount`. Contract stays `authoritativeTotal`. The revision does not make them the same number.

### R2-F1 — High. The Time Clock steps describe a screen that is gone

`/field/timeclock` on `main` is the office Time Clock (`src/field/views/TimeClock.jsx`). It loads `fetchTimeClockReview` (`src/field/lib/queries.js`), which reads `time_punches` for a date range. The comment on that read says identity comes from the punches, not from the active Schedule job list. `fetchFieldPunches` is still defined and still stage-gated, and nothing calls it.

The screen already filters by `time_punches.job_id`, which is `call_log.id` (`filterTimeClockRows` in `src/field/lib/timeClock.js`). The range defaults to today (`pacificToday`) and can be changed. There is no stat strip and no chip row. The count line is `shownPunches`.

The revision still says unfiltered Time Clock stays on `fetchActiveFieldJobs`, punches stay today, and filtered stat and chip counts match the job. Following that replaces the office range, the review hours, and the punch corrections with the retired today-list, or it narrows the live screen back to the active-stage set.

A second trap if `?job=` is written into the existing dropdown state: `jobOptions` is only jobs that already have punches in the loaded range, and an id that is not in that list is cleared (`TimeClock.jsx`, the effect that calls `setJobId("")`). The table then shows every job in the range. That is the full list, which this plan says not to show.

Revision: leave `fetchTimeClockReview` and the From / To controls in place. Do not route this screen through `fetchFieldPunches` or `fetchActiveFieldJobs`. `?job=<callLogId>` selects that call log on the current office screen. A call log with no punches in the open range stays empty and does not fall through to all jobs. Do not require a stat strip or chips on Time Clock. Daily Logs stays as this revision already says.

## Revision 3

Recorded after Plan Audit round 2. The round-1 manifest, Revision 2, and the round-2 manifest stay as written. This revision changes the Time Clock scope. **NOT CONVERGED. Not build-ready.**

- R2-F1. `/field/timeclock` stays the office Time Clock: `fetchTimeClockReview`, From/To, review hours, office corrections, and the existing UI. Do not use `fetchFieldPunches` or `fetchActiveFieldJobs` for that screen. `?job=<callLogId>` filters that screen to that call log. No punches in the selected range shows an empty result for that job and does not fall back to all jobs. No stat strip or chip requirement for Time Clock. Daily Logs stays as Revision 2 already says.

## Revision 4

Recorded after Plan Audit round 2. The round-1 manifest, Revision 2, the round-2 manifest, and Revision 3 stay as written. This revision names the two Time Clock systems. **NOT CONVERGED. Not build-ready.**

- R2-F1. Office Time Clock is the desktop function at `/field/timeclock`: `fetchTimeClockReview`, From/To, review hours, office corrections, and the existing UI. Mobile Time Clock is crew punching on the phone. This slice does not redesign or expand either. Do not use `fetchFieldPunches` or `fetchActiveFieldJobs` for `/field/timeclock`. `?job=<callLogId>` filters Office Time Clock to that call log. No punches in the selected range shows an empty result for that job and does not fall back to all jobs. No stat strip or chip requirement for Office Time Clock. Daily Logs stays as Revision 2 already says.

## Audit manifest — round 3

Plan Audit, round 3, against `233acc7`, compared with current `main` (`abad440`). Scope sections above are unchanged. **CONVERGED. BUILD-READY.**

R2-F1 is resolved. Office Time Clock stays `fetchTimeClockReview` with From/To, review hours, and office corrections. `?job=<callLogId>` filters `time_punches.job_id` through the existing screen and must stay empty instead of falling back to all jobs. `fetchFieldPunches` and `fetchActiveFieldJobs` stay off this screen. No stat strip or chips. Mobile Time Clock is out of the slice. On `main`, `/field/timeclock` still loads `fetchTimeClockReview`, `filterTimeClockRows` still keys the job on `time_punches.job_id`, and a fresh visit still opens today through today without reading a date range from the URL.

No remaining material gap. Daily Logs `?job=`, the bid-tab removal, the `NotesPanel` move, and `jobs.amount` versus Contract stay as the earlier rounds closed them.

## Revision 5

Recorded after Chris acceptance. The round-1 manifest, Revision 2, the round-2 manifest, Revisions 3 and 4, and the round-3 manifest stay as written. Round 3 converged the previous text. This revision changes the Field Jobs UI. **NOT CONVERGED. Not build-ready.** Do not build from this revision. Ownership, Daily Logs `?job=`, and Office Time Clock `?job=` are unchanged.

- Field Jobs matches Schedule Jobs (`JobsToPrepare` / compact `StageJobCard`) in search, compact rows, and inline expand / collapse. Reuse those classes and interaction patterns. Do not mount `StageJobCard` or `JobsToPrepare`.
- The search bar, date chips, auto-widen, 25 cap, and deep-link widen / pin / auto-open are the Schedule list behavior. The list uses `loadJobs({ withWTCs: true })`. The status control uses `getJobStatus`, not Schedule `stageOf`.
- Compact row: Field status, job number and name, customer, work type, location, start and time signal, crew count for the current or next trip. No planning actions and no dollar amount.
- Expanded card: PRT history, Daily Logs link, Office Time Clock link, Load-Out status and the existing modal. Close returns to the list. No Schedule planning panels.
- Primary route is `/field/jobs`. Deep link is `/field/jobs?job=<jobs.job_id>`. `/field/jobs/:jobId` redirects there. `JobDetail.jsx` is retired. `FieldJobCard.jsx` is the Field card. `PlainTable` is not edited and is not the Field Jobs list.
