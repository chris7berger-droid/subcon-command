# Schedule and Field ownership

Planning artifact. Locked 2026-09-24. Schedule Command owns planning and readiness. Field Command owns execution and what actually happened. No new tables, migrations, or data paths. One new view.

This file records the locked scope. It does not authorize a build.

## Ownership boundary

- Schedule Command owns planning and readiness.
- Field Command owns execution and what actually happened.
- PROP stays on Sales Proposals. The Schedule card figure is the synced proposal total. Schedule Finance / Billing already shows it as Contract.
- BILLING stays on Schedule Finance / Billing (`/schedule/billing`).
- DEPOSIT stays on Sales Invoices (`invoices.is_deposit`).
- FILES stay on Sales Call Log Attachments. The card FILES tile was never wired.
- NOTES stay on the Schedule job. Details and the parent trip show `jobs.notes`. Billing notes stay on Finance / Billing (`billing_worklist.chris_notes`).

## Schedule job card

Keep:

- SOW score, Field SOW editor, and the manual trip Scope / SOW
- Crew tile (opens Crew Schedule) and the Details crew readout
- Materials (MTRL)
- Dates, trips, and mobilizations (DAYS, MOBS, TRIPS)
- Details readout of the SOW
- Readiness
- Load-Out, moved into Planning. It still opens `LoadOutModal`. Desktop Field Load-Outs opens this same modal.
- `NotesPanel` on Details, which already shows `jobs.notes`. Do not add another notes editor.

Remove:

- Management panel
- Budget tab, including Actual / Δ and other execution actuals
- PRT tile, active-banner PRT label, and PRT modal
- Logs tile and `LogsModal`
- PROP, BILLING, and DEPOSIT tiles, and the collapsed-row dollar amount
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

`fetchFieldLogs` and `fetchFieldPunches` already load the rows those screens show. Add `callLogId` onto each shaped row (they drop `job_id` today). Do not add a second query.

- `/field/dailylogs?job=<callLogId>` keeps the current 7-day read and shows only that call log.
- `/field/timeclock?job=<callLogId>` keeps today’s punches and shows only that call log.
- No `job` param: both screens stay exactly as they are.
- A param that matches nothing: the existing empty state, not the full list.

## Reuse

- `loadJobWithWTCs`, `loadPRTsForJob`, `PRTModal`
- `fetchFieldLogs`, `fetchFieldPunches`
- `LoadOutModal` and the Load-Outs open path
- `job_material_checks` checked/total rule inside `fetchLoadOutJobs`
- `NotesPanel` and `updateJobField` for `jobs.notes`
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
3. `?job=` on Daily Logs and Time Clock, and the two links.
4. Load-out status and the existing modal.
5. Schedule card edits, then delete `LogsModal` and the card-only Schedule fetches.

## Acceptance criteria

- `/field/jobs/:jobId` opens one job. PRT history is on that page and matches `loadPRTsForJob` for its call log. Today still shows only today’s PRT flag.
- Daily Logs and Time Clock with `?job=` show only that job, inside the windows they already use. Without `?job=`, they match current behavior.
- Load-Out on the detail shows loaded of total and opens the same `LoadOutModal` as `/field/loadouts`.
- Schedule card still has SOW, crew, materials, days, trips, mobilizations, readiness, and Load-Out under Planning. Notes still save. Management, Budget, PRT, Logs, PROP, BILLING, DEPOSIT, FILES, and the collapsed dollar amount are gone.
- No new table, grant, or migration. Home’s production figure still loads on its own.

## Out of scope

- A second Field screen for PRT history, Daily Logs, Time Clock, or Load-Out.
- Changing Today into a report archive, or changing its PRT flag.
- A Field budget screen, week timesheet, or manager punch-correction flow.
- Retargeting Home’s production KPI.
- Changing Finance / Billing, Sales proposals, Sales invoices, or Call Log attachments.
- A new notes editor. Billing notes stay where they are.
- New tables, grants, migrations, or a second query path for logs, punches, or production reports.
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
