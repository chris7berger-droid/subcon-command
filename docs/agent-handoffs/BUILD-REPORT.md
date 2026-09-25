## Status

Build complete for the Field Jobs UI revision in `docs/plans/schedule_field_ownership.md` (Plan Audit CONVERGED / BUILD-READY at `15d27dd`). Ownership and data behavior from the earlier build stay. Stopped at the Build gate. Do not merge.

## Summary

`/field/jobs` is a compact job list in the Schedule Jobs visual language: search, date chips, Field status control, and rows that expand inline. The expanded card keeps Field execution only — production-report history, Daily Logs and Office Time Clock links, and Load-Out. Schedule planning actions are not on this screen.

`/field/jobs?job=<jobs.job_id>` clears search, sets the date and status controls to All, pins that job, and opens it. `/field/jobs/:jobId` redirects there. The separate job-detail page is retired. An unknown `?job=` stays on the list with no expanded card and no writes.

Daily Logs `?job=` and Office Time Clock `?job=` are unchanged. Office Time Clock still uses `fetchTimeClockReview`, From/To, review hours, and office corrections. Schedule card ownership removals stay.

## Files Changed

- `src/field/views/Jobs.jsx` — search, date chips, status control, 25-row cap, deep-link pin
- `src/field/components/FieldJobCard.jsx` — compact row and Field expanded card
- `src/field/FieldLayout.jsx` — `/field/jobs/:jobId` redirects to `?job=`
- `src/field/views/JobDetail.jsx` — deleted
- `src/field/lib/fieldJobs.js` — pass through the list fields the compact row reads
- `src/field/lib/queries.js` — `fetchFieldJobs` loads `loadJobs({ withWTCs: true })`
- `docs/agent-handoffs/BUILD-REPORT.md`

Unchanged in this revision: `DailyLogs.jsx`, `TimeClock.jsx`, `StageJobCard.jsx`, `PRTModal.jsx`, Schedule `Jobs.jsx`, `PlainTable`.

## Important Implementation Decisions

- Field Jobs reuses `.jtp-*` and `.sjc-*` classes inside `.schedule-root`. It does not mount `StageJobCard` or `JobsToPrepare`.
- Status options and the badge label come from `getJobStatus`. Badge classes already in the Schedule stylesheet are reused. No new badge class.
- Date windows use `rangeForKey`, `jobInRange`, `effectiveStart`, and `effectiveEnd`. Auto-widen is derived while rendering so a chip the user did not pick can move from week to month to quarter to all when the window is empty.
- The row omits the actions column, the dollar amount, and the planning box. Crew count is the existing current-or-next-trip count. A null count shows "—".
- Expanding loads `loadJobWithWTCs` and material-check counts. `PRTModal` is `embedded` inside `.schedule-root`. Load-Out opens `LoadOutModal` through that same job load.
- The header title is the display job number and name. Identity bubbles are job, customer, and work type. No Dates TBD chip, stage banner, planning toggles, or notes panel.

## Verification Performed

- `npx eslint` on `FieldLayout.jsx`, `Jobs.jsx`, `FieldJobCard.jsx`, `fieldJobs.js`, and `queries.js` — passed
- `node scripts/check-field-jobs.mjs` — passed
- `npm run build` — passed

## Visual Verification

Authenticated Field and Schedule screens were not walked. This environment has no logged-in session.

## Deviations From Handoff

None.

## Issues / Follow-up

- Preview walk and Chris acceptance are later gates.
- No new table, grant, or migration.
