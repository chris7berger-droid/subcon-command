## Status

Build complete for the converged Schedule and Field ownership plan (`docs/plans/schedule_field_ownership.md`, commit `55d2b06`). Stopped at the Build gate. Do not merge.

## Summary

Field Jobs opens one job detail. That page shows production-report history, links to Daily Logs and Office Time Clock for the job’s call log, and shows load-out progress that opens the existing Load-Out modal.

Daily Logs `?job=` reads that call log inside the existing 7-day window, including jobs outside the active-stage set. Unfiltered Daily Logs is unchanged. Office Time Clock still uses `fetchTimeClockReview`, From/To, review hours, and office corrections. `?job=` filters that screen and stays empty when the job has no punches in the selected range.

The Schedule job card keeps planning (including Load-Out) and puts the existing notes editor on Details. Management, Budget, PRT, Logs, PROP, BILLING, DEPOSIT, FILES, and the collapsed dollar amount are removed.

## Files Changed

- `src/field/FieldLayout.jsx` — `/field/jobs/:jobId`
- `src/field/views/JobDetail.jsx` — new job detail
- `src/field/views/Jobs.jsx` — Job # links to the detail
- `src/field/views/DailyLogs.jsx` — `?job=` read
- `src/field/views/TimeClock.jsx` — `?job=` on the existing Office Time Clock
- `src/field/lib/queries.js` — call-log Daily Logs read and material-check counts
- `src/schedule/components/PRTModal.jsx` — inline `embedded` view
- `src/schedule/components/StageJobCard.jsx` — notes on Details; planning Load-Out; removed panels and tiles
- `src/schedule/views/Jobs.jsx` — dropped the card-only log and PRT loads
- `src/schedule/components/LogsModal.jsx` — deleted
- `docs/agent-handoffs/BUILD-REPORT.md`

## Important Implementation Decisions

- The branch started at the converged plan commit, then merged `origin/main` (`abad440`) so Office Time Clock stayed `fetchTimeClockReview`. The plan commit itself did not contain that screen.
- `/field/timeclock` does not call `fetchFieldPunches` or `fetchActiveFieldJobs`. A `?job=` id that is missing from the loaded range stays selected. The job dropdown still clears an id that is not pinned by the URL.
- Daily Logs `?job=` queries `daily_log_entries` for that call log inside the same 7-day window. It does not filter the active-stage list.
- Load-out counts use the same checked-vs-total rule as `fetchLoadOutJobs`. Opening the modal calls `loadJobWithWTCs`, the same door as `/field/loadouts`.
- Home still loads its own production reports. Schedule Jobs no longer loads `daily_log_entries` or `loadPRTsForCallLogIds` for the card.

## Verification Performed

- `npx eslint` on the changed application files — passed
- `npm run build` — passed

## Visual Verification

Authenticated Field and Schedule screens were not walked. This environment has no logged-in session.

## Deviations From Handoff

None.

## Issues / Follow-up

- Preview walk and Chris acceptance are later gates.
- No new table, grant, or migration.
