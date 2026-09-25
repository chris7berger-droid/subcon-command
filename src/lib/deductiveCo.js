/**
 * Deductive change orders — whole sold WTC cancellation.
 *
 * The sold per-WTC amount is proposal_wtc.locked_line_total.
 * WTCCalculator.handleLock and ProposalDetail.toggleWtcLock both
 * set proposals.total from calcProposalTotal (sum of calcWtcPrice,
 * rate cards excluded) and snapshot that same calcWtcPrice onto
 * locked_line_total. Unlock is blocked once the proposal is Sent,
 * Signed, or Sold, so the snapshot stays the figure that was added
 * into the sold proposal total.
 *
 * A rate card contributes 0 to that sum, not its locked_line_total.
 * A missing snapshot is not replaced with a live recompute.
 *
 * Cancellation is not a status column. A parent WTC is canceled for
 * execution when a non-deleted Sold change-order line has
 * cancels_proposal_wtc_id pointing at it.
 */

import { calcWtcPrice } from "./calc.js";

export function deductiveAmount(wtc) {
  if (!wtc) return { ok: false, reason: "missing" };
  if (wtc.is_rate_card) return { ok: false, reason: "rate_card_contributes_zero" };
  const n = Number(wtc.locked_line_total);
  if (!Number.isFinite(n)) return { ok: false, reason: "missing_locked_line_total" };
  if (!(n > 0)) return { ok: false, reason: "sold_line_not_positive" };
  return { ok: true, amount: -n };
}

export function validateCancellationReason(reason) {
  if (!String(reason || "").trim()) {
    return { ok: false, reason: "A cancellation reason is required." };
  }
  return { ok: true, reason: String(reason).trim() };
}

export function validateCancelTarget({ target, parentJobId, coTenantId, existingPointers }) {
  if (!target) return { ok: false, reason: "Select the sold work type being removed." };
  if (!coTenantId || target.tenant_id !== coTenantId) {
    return { ok: false, reason: "That work type is not in this company." };
  }
  if (String(target.call_log_id) !== String(parentJobId)) {
    return { ok: false, reason: "That work type is not on the parent job." };
  }
  if (target.is_change_order) {
    return { ok: false, reason: "Pick a work type from the original sold job, not from another change order." };
  }
  if (target.proposal_status !== "Sold" || target.proposal_deleted_at) {
    return { ok: false, reason: "Only a sold work type on the original job can be removed." };
  }
  const priced = deductiveAmount(target);
  if (!priced.ok) {
    if (priced.reason === "missing_locked_line_total") {
      return { ok: false, reason: "This work type has no locked sold price, so the deduction cannot be proven." };
    }
    if (priced.reason === "rate_card_contributes_zero") {
      return { ok: false, reason: "A T&M rate card is not a fixed contract line and cannot be removed this way." };
    }
    return { ok: false, reason: "This work type has no positive sold price to deduct." };
  }
  const taken = (existingPointers || []).some(p =>
    String(p.cancels_proposal_wtc_id) === String(target.id) && !p.deleted_at
  );
  if (taken) {
    return { ok: false, reason: "That work type is already on another change order." };
  }
  return { ok: true, amount: priced.amount };
}

/**
 * Row inserted on the change-order proposal. Does not include an update
 * of the original WTC. discount is the positive sold snapshot so
 * calcWtcPrice (labor 0 + materials 0 + travel 0 − discount) equals
 * the negative deduction.
 */
export function deductiveLinePayload({ proposalId, target, reason }) {
  const priced = deductiveAmount(target);
  if (!priced.ok) return priced;
  const why = validateCancellationReason(reason);
  if (!why.ok) return why;
  const sold = -priced.amount;
  const row = {
    proposal_id: proposalId,
    work_type_id: target.work_type_id ?? null,
    cancels_proposal_wtc_id: target.id,
    discount: sold,
    discount_reason: why.reason,
    locked: true,
    locked_line_total: priced.amount,
    regular_hours: 0,
    ot_hours: 0,
    materials: [],
    travel: {},
    field_sow: [],
    sales_sow: null,
    is_rate_card: false,
  };
  return { ok: true, amount: priced.amount, row };
}

export function lineMatchesSoldDeduction(row, exact) {
  if (!row) return false;
  const priced = calcWtcPrice(row, undefined, exact);
  return priced === row.locked_line_total && priced < 0;
}

export function isDeductiveTotal(total) {
  const n = Number(total);
  return Number.isFinite(n) && n < 0;
}

export function approveEffects(total) {
  const deductive = isDeductiveTotal(total);
  return {
    createQuickBooksJob: !deductive,
    createInvoice: false,
    createCreditMemo: false,
    sendToSchedule: !deductive,
  };
}

export function isCanceledBySoldCo(pointers) {
  return (pointers || []).some(p => p.status === "Sold" && !p.deleted_at);
}

export function wtcsForSchedule(wtcs, canceledIds) {
  const ids = canceledIds instanceof Set ? canceledIds : new Set(canceledIds || []);
  return (wtcs || []).filter(w => !w.cancels_proposal_wtc_id && !ids.has(w.id));
}

/**
 * No table has a foreign key to job_wtcs.id.
 * sow_revision_count is history stored on that row. Deleting it would
 * destroy that history, so the approval must stop with the row untouched.
 */
export function executionRemovalDecision(row) {
  if (!row) return { action: "none" };
  if ((Number(row.sow_revision_count) || 0) > 0) {
    return {
      action: "stop",
      reason: "This schedule work type has Field SOW revision history. The change order was not marked Sold. The schedule copy was not changed. Review that history before this cancellation can be approved.",
    };
  }
  return { action: "delete" };
}

export function pullTicketNamesRow(row, tickets) {
  if (!row) return false;
  return (tickets || []).some(t =>
    String(t.job_id) === String(row.job_id) &&
    (Array.isArray(t.day_keys) ? t.day_keys : []).some(k => String(k?.wtc_id) === String(row.id))
  );
}

/**
 * Inspect every execution copy before any Sold write and before any delete.
 * No rows: the cancellation may be finalized.
 * Safe rows: removeIds must be deleted and verified before Sold.
 * A dependency: proceed is false, removeIds is empty, and Sold is refused.
 */
export function planExecutionRetirement(rows, tickets) {
  const list = rows || [];
  if (!list.length) return { proceed: true, removeIds: [] };
  for (const row of list) {
    const decision = executionRemovalDecision(row);
    if (decision.action === "stop") {
      return { proceed: false, removeIds: [], message: decision.reason };
    }
    if (pullTicketNamesRow(row, tickets)) {
      return {
        proceed: false,
        removeIds: [],
        message: "A warehouse pull ticket still names this schedule work type. The change order was not marked Sold. The schedule copy was not changed. Review that ticket before this cancellation can be approved.",
      };
    }
  }
  return { proceed: true, removeIds: list.map(r => r.id) };
}

/** Sold is allowed only after a proceed plan whose removeIds are all confirmed deleted. */
export function mayFinalizeCancellation({ plan, deletedIds }) {
  if (!plan?.proceed) return { sold: false, executableRemains: true };
  const deleted = new Set((deletedIds || []).map(id => String(id)));
  const leftover = (plan.removeIds || []).filter(id => !deleted.has(String(id)));
  if (leftover.length) return { sold: false, executableRemains: true };
  return { sold: true, executableRemains: false };
}

export function proposalContractValue(proposal, contractSum) {
  const sov = Number(contractSum) || 0;
  if (sov > 0) return sov;
  const total = Number(proposal?.total);
  return Number.isFinite(total) ? total : 0;
}

export function parentContractChain(proposals, { parentJobId, contractSumById = {} } = {}) {
  let original = 0;
  let changeOrders = 0;
  let otherFamilySold = 0;
  for (const p of proposals || []) {
    if (p.status !== "Sold") continue;
    const value = proposalContractValue(p, contractSumById[p.id]);
    if (p.call_log?.is_change_order) changeOrders += value;
    else if (String(p.call_log_id) === String(parentJobId)) original += value;
    else otherFamilySold += value;
  }
  return {
    original,
    changeOrders,
    otherFamilySold,
    current: original + changeOrders + otherFamilySold,
  };
}

export function contractProgress({ current, contractBilled, tmBilled = 0 }) {
  const tm = Number(tmBilled) || 0;
  const contract = Number(contractBilled) || 0;
  const base = Number(current) || 0;
  const billed = contract + tm;
  const jobValue = base + tm;
  const remaining = base - contract;
  const pct = jobValue > 0 ? Math.round((billed / jobValue) * 100) : 0;
  return { billed, remaining, pct, jobValue };
}

export function countsAsSoldJob(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0;
}

export function soldReporting(proposals, valueOf) {
  const values = (proposals || []).map(p => valueOf(p));
  return {
    count: values.filter(v => countsAsSoldJob(v)).length,
    amount: values.reduce((s, v) => s + (Number(v) || 0), 0),
  };
}

export function distinctSoldJobCount(proposals, valueOf) {
  const ids = new Set();
  for (const p of proposals || []) {
    if (!countsAsSoldJob(valueOf(p))) continue;
    if (p.call_log_id != null && p.call_log_id !== "") ids.add(p.call_log_id);
  }
  return ids.size;
}
