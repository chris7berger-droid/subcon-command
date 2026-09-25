## Status

Phase: Build — implementation is on `feat/deductive-change-orders`. This file is the Build gate record. Build vs Plan, Code Review, and Security Review are not written here.

Not merged. Production data was not changed. The migration was not applied. No QuickBooks record was created. No preview URL: a sales-command preview uses production Supabase, and Send to Schedule now reads `cancels_proposal_wtc_id`. That column does not exist in production yet, so a preview would break Send to Schedule.

## Summary

A deductive change order cancels one whole sold work type.

The original proposal stays at its sold total. The original `proposal_wtc` row stays. The change-order line points at that row with `cancels_proposal_wtc_id` and carries the negative of the locked sold line price. For the locked example that price is `locked_line_total` 575, so the CO line is −575, the parent current contract is 4334 + −575 = 3759, billed stays 3759, remaining is 0, and percent invoiced is 100.

## Files Changed

sales-command:

- `src/lib/deductiveCo.js` — new. Sold-line amount, validation, schedule filter, approve effects, contract chain, sold-job count.
- `src/lib/deductiveCo.test.mjs` — new. Cases A–K.
- `src/components/ProposalDetail.jsx` — remove-sold-work-type authoring, lock bypass for a cancellation line, Send to Schedule filter, negative-CO button hide, QuickBooks skip, conditional `job_wtcs` removal.
- `src/components/CallLogDetail.jsx` — parent Job Totals chain.
- `src/lib/followUp.js` — sold count excludes a negative value; sold dollars keep it.
- `src/lib/subconSummary.js` — Jobs YTD excludes a negative CO; Sold YTD keeps the dollars.
- `src/pages/CallLog.jsx` — Sold tile job filter uses the same count rule.
- `docs/BACKLOG.md` — F65 In Progress.
- `docs/agent-handoffs/BUILD-REPORT.md` — this file.

command-suite-db:

- `supabase/migrations/20260925120000_proposal_wtc_cancels_proposal_wtc_id.sql`

Not included: pre-existing time-clock edits in `scripts/check-time-clock.mjs`, `src/field/lib/timeClock.js`, and `src/field/views/TimeClock.jsx`.

## Important Implementation Decisions

The authoritative per-WTC sold value is `proposal_wtc.locked_line_total`. `WTCCalculator.handleLock` and `ProposalDetail.toggleWtcLock` both set `proposals.total` from `calcProposalTotal` and snapshot that same `calcWtcPrice` onto `locked_line_total`. Unlock is blocked after Sent, Signed, or Sold. Rate cards contribute 0 to the proposal total, so they cannot be canceled this way. A missing snapshot stops the deduction. It is not replaced with a live recompute.

The CO line stores the positive snapshot in `discount`, with hours, materials, and travel at zero, so `calcWtcPrice` equals −`locked_line_total`. `discount_reason` holds the cancellation sentence only. The parent id is only in `cancels_proposal_wtc_id`. `cloned_from_wtc_id` is not used.

Cancellation for execution is derived: a non-deleted Sold line whose `cancels_proposal_wtc_id` equals the original WTC id. There is no status column.

A live non-deleted pointer, including a draft, blocks a second deduction of the same WTC. Only a Sold non-deleted pointer hides the original from Schedule.

`job_wtcs` has no inbound foreign key. `daily_production_reports.wtc_id` and `invoice_lines.proposal_wtc_id` point at `proposal_wtc`, which is never deleted. On approve, a matching `job_wtcs` row is deleted only when `sow_revision_count` is 0 and no `pull_tickets.day_keys` entry names that row's id. Otherwise the sale still completes, the row stays, and the screen reports the stop. If no remaining `job_wtcs` row on that job has field-SOW days, `jobs.field_sow` is set null so the legacy fallback cannot show the canceled scope. `jobs.amount` is not rewritten.

When the approved total is negative, `qb-create-job` is not called. Positive totals still call it, except the existing test-job and sister-cohort skips. Approve does not write invoices. Create Invoice and Send to Schedule are hidden when the proposal total is negative.

Parent Job Totals still use the family sum as the current contract. When the viewed job is not itself a change order and a Sold child change order exists, the ledger shows Original Contract, Change Orders, and Current Contract. Billed, remaining, and percent invoiced use that current contract. A non-CO family sold proposal (a go-back) stays inside the family sum and is shown as its own line only when that amount is not zero, so the displayed lines still add up.

Sold dollars include the negative total in the period `approved_at` credits. Sold-job count and Jobs YTD do not count a negative value. A positive CO still counts. Average quoted margin still skips non-positive lines; that filter was already there.

## Verification Performed

`node src/lib/deductiveCo.test.mjs` — passed (A–K, missing locked price, SOW-revision stop, no-CO contract stays 4334).

`node src/lib/jobsAmount.test.mjs` — passed.

`node src/lib/nextCoNumber.test.mjs` — passed.

Schema check against `command-suite-db` baseline and migrations: `proposal_wtc.id` is uuid; no SQL foreign key references `job_wtcs(id)`; `pull_tickets.day_keys` is the only non-FK payload that can name a schedule WTC.

No browser pass. The new column is not in the database this app talks to.

## Visual Verification

Not run. The authoring panel and the Job Totals lines were not opened in a browser. A production-connected preview is the wrong place to open them before the migration is applied somewhere that is not production.

## Deviations From Handoff

None on the locked result.

One display line beyond the three named totals: "Other sold family work" appears only when a sold family proposal is neither the parent job nor a change order. Without it, Current Contract would include that amount and would not equal Original Contract + Change Orders. The real 4334 / −575 / 3759 example has no such proposal, so the line stays hidden.

A second deduction is blocked by any non-deleted pointer, not only a Sold one. A draft cannot be duplicated and then both sold.

## Issues / Follow-up

F65 stays In Progress. Do not apply `20260925120000_proposal_wtc_cancels_proposal_wtc_id.sql` to production from this slice. Do not merge. Build vs Plan, Code Review, and Security Review are still open. Preview waits until that migration can be applied somewhere other than production, or until a preview database has the column.
