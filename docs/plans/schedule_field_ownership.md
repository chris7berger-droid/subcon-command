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
