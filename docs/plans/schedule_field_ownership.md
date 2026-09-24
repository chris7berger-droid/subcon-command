# Schedule and Field ownership

Planning artifact. Locked 2026-09-24. Schedule Command owns planning and readiness. Field Command owns execution and what actually happened. No new tables, migrations, or data paths. One new view.

Revision 2, after Plan Audit round 1. Resolves F1–F4 below. **NOT CONVERGED. Not build-ready.** Do not build from this revision.

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

## Field Command job detail

Field Jobs (`/field/jobs`) gets one new per-job detail. That detail is the only new view. Today, Daily Logs, Time Clock, and Load-Outs stay the screens they are.

`src/field/views/JobDetail.jsx`, using the existing `FieldScreen`.

- Back to `/field/jobs`.
- Title: display job number and name, the same fields the Jobs list already shows.
- Production reports live on this page, not on Today and not on a second screen. Reuse `PRTModal` inline (`embedded`, no overlay). It already calls `loadPRTsForJob(call_log_id)` and compares reports to that job’s SOW. Pass the job from `loadJobWithWTCs` so `_wtcs` is present. Wrap with `.schedule-root` the way Load-Outs wraps `LoadOutModal`.
- Daily Logs is one link to `/field/dailylogs?job=<callLogId>`. The detail does not host a second log list.
- Time Clock is one link to `/field/timeclock?job=<callLogId>`. The detail does not host a second punch list.
- Load-Out status on the detail is loaded of total from `job_material_checks` for that call log, counted the same way `fetchLoadOutJobs` counts (checked vs total). Open calls `loadJobWithWTCs` and `LoadOutModal`, the same door `/field/loadouts` uses.
- Unknown `jobId`: the existing empty state, plus the back link. No writes.
- Jobs list: the Job # cell links to `/field/jobs/<jobPk>`. Leave `PlainTable` as it is. No new Field nav item.

Today (`/field/today`) stays a today/status screen and keeps only today’s PRT flag.

## Routes and filtering

`/field/jobs/:jobId` in `src/field/FieldLayout.jsx`, beside the existing `/field/jobs` route.

`jobId` is `jobs.job_id` (the Jobs list `jobPk`). Child rows stay keyed by call log: `daily_log_entries.job_id`, `time_punches.job_id`, and `daily_production_reports.job_id` are `call_log.id`. Do not put the call log id in this path. `loadJobWithWTCs(jobId)` already returns both.

`/field/jobs` lists every non-deleted, non-merged schedule job, including Complete. Unfiltered `fetchFieldLogs` and `fetchFieldPunches` do not. They start from `fetchActiveFieldJobs`, which keeps only call logs whose stage is in `ACTIVE_FIELD_STAGE_KEYS`. Complete is outside that set.

When `?job=<callLogId>` is present, read that call log inside the existing date window. Include Complete jobs and any other job outside the active-stage set. Do not filter the active-stage result and then drop the job. Logs stay the last 7 days. Punches stay today.

Unfiltered Daily Logs and Time Clock stay on `fetchActiveFieldJobs`. Do not widen that list.

Stat strip and chip counts are computed from the rows on screen. With `?job=`, they match that job. Without it, they match the current list.

A `?job=` that has no rows inside the window uses the existing empty state, not the unfiltered list. Empty means nothing in that window, not that the stage gate excluded the job.

## Reuse

- `loadJobWithWTCs`, `loadPRTsForJob`, `PRTModal`
- `fetchFieldLogs`, `fetchFieldPunches` for the unfiltered screens. The `?job=` read uses the same tables and the same date windows, without the active-stage gate.
- `LoadOutModal` and the Load-Outs open path
- `job_material_checks` checked/total rule inside `fetchLoadOutJobs`
- The existing `NotesPanel` and `updateJobField` for `jobs.notes`, placed on Details
- `FieldScreen`

Modify:

- `src/field/FieldLayout.jsx`
- `src/field/views/Jobs.jsx`
- `src/field/views/DailyLogs.jsx`
- `src/field/views/TimeClock.jsx`
- `src/field/lib/queries.js`
- `src/schedule/components/PRTModal.jsx`
- `src/schedule/components/StageJobCard.jsx`
- `src/schedule/views/Jobs.jsx` — drop the `daily_log_entries` load and the `loadPRTsForCallLogIds` load that only fed the card. Home keeps its own PRT read.

Create:

- `src/field/views/JobDetail.jsx`

Delete after the card no longer imports it:

- `src/schedule/components/LogsModal.jsx`

Card list files may keep passing `logsByCallLog` and `prtMap`. Unused props are ignored.

## Implementation order

1. Route and job-detail shell (`loadJobWithWTCs`, identity, back link).
2. Inline PRT history.
3. `?job=` on Daily Logs and Time Clock, including jobs outside the active-stage set, and the two links. Filtered stat and chip counts use the filtered rows.
4. Load-out status and the existing modal.
5. Move the existing `NotesPanel` into Details. Then remove Management, the Budget tab, PRT, Logs, PROP, BILLING, DEPOSIT, FILES, and the collapsed `jobs.amount`. Then delete `LogsModal` and the card-only Schedule fetches.

## Acceptance criteria

- `/field/jobs/:jobId` opens one job. PRT history is on that page and matches `loadPRTsForJob` for its call log. Today still shows only today’s PRT flag.
- Daily Logs and Time Clock with `?job=` show that call log’s rows inside the windows they already use, including a Complete job and any other job outside `ACTIVE_FIELD_STAGE_KEYS`. A Complete job with a log in the last 7 days, or a punch today, shows that row. Empty means nothing in the window. Without `?job=`, both screens match current behavior.
- With `?job=`, the stat strip and chip counts match the filtered job. Without it, they match the unfiltered list.
- Load-Out on the detail shows loaded of total and opens the same `LoadOutModal` as `/field/loadouts`.
- Schedule card still has SOW, crew, materials, days, trips, mobilizations, readiness, and Load-Out under Planning. `NotesPanel` is on Details and notes still save after Management is gone. Management, Budget, PRT, Logs, PROP, BILLING, DEPOSIT, FILES, and the collapsed `jobs.amount` are gone. No replacement Budget screen exists. Finance Contract still uses its own authoritative total.
- No new table, grant, or migration. Home’s production figure still loads on its own.

## Out of scope

- A second Field screen for PRT history, Daily Logs, Time Clock, or Load-Out.
- Changing Today into a report archive, or changing its PRT flag.
- A Field budget screen, a replacement Schedule Budget screen, or relocating `job_wtcs.bid_breakdown` in this slice.
- A week timesheet, or a manager punch-correction flow.
- Retargeting Home’s production KPI.
- Changing Finance / Billing, Sales proposals, Sales invoices, or Call Log attachments, including making Contract equal `jobs.amount`.
- A new notes editor. Billing notes stay where they are.
- New tables, grants, or migrations.
- Widening unfiltered Daily Logs or Time Clock beyond the active-stage set.
- A new Field nav item, or a change to `PlainTable`.
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
