import { calcWtcPrice } from "./calc.js";
import {
  approveEffects,
  contractProgress,
  countsAsSoldJob,
  deductiveAmount,
  deductiveLinePayload,
  distinctSoldJobCount,
  executionRemovalDecision,
  mayFinalizeCancellation,
  planExecutionRetirement,
  isCanceledBySoldCo,
  lineMatchesSoldDeduction,
  parentContractChain,
  soldReporting,
  validateCancelTarget,
  wtcsForSchedule,
} from "./deductiveCo.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const parentWtc = {
  id: "wtc-575",
  tenant_id: "tenant-1",
  call_log_id: 100,
  proposal_status: "Sold",
  proposal_deleted_at: null,
  is_change_order: false,
  is_rate_card: false,
  work_type_id: 7,
  locked_line_total: 575,
};

const chain = parentContractChain([
  { id: "orig", status: "Sold", call_log_id: 100, total: 4334, call_log: { is_change_order: false } },
  { id: "co", status: "Sold", call_log_id: 200, total: -575, call_log: { is_change_order: true } },
  { id: "draft", status: "Draft", call_log_id: 100, total: 999, call_log: { is_change_order: false } },
], { parentJobId: 100 });

assert(chain.original === 4334, "A. original contract stays 4334");
assert(chain.changeOrders === -575, "A. deductive CO is -575");
assert(chain.current === 3759, "A. current contract is 3759");
assert(chain.original !== 3759, "C. original sold proposal is not rewritten to 3759");

const progress = contractProgress({ current: chain.current, contractBilled: 3759, tmBilled: 0 });
assert(progress.billed === 3759, "B. billed stays 3759");
assert(progress.remaining === 0, "B. remaining is 0");
assert(progress.pct === 100, "B. percent invoiced is 100");

const before = JSON.stringify(parentWtc);
const payload = deductiveLinePayload({
  proposalId: "co-proposal",
  target: parentWtc,
  reason: "Customer will not proceed",
});
assert(payload.ok === true, "deductive line builds");
assert(JSON.stringify(parentWtc) === before, "D. building the CO line does not change the original WTC");
assert(payload.row.cancels_proposal_wtc_id === "wtc-575", "D. CO line points at the original WTC");
assert(payload.row.proposal_id === "co-proposal", "D. the line belongs to the CO proposal");
assert(!("id" in payload.row), "D. the payload is not an update of the original row");
assert(payload.amount === -575, "CO line total is -575");
assert(lineMatchesSoldDeduction(payload.row, true), "exact pricing keeps the deduction at the locked sold price");
assert(lineMatchesSoldDeduction(payload.row, false), "legacy ceil keeps a whole-dollar deduction");
assert(calcWtcPrice(payload.row, undefined, true) === -575, "calcWtcPrice of the CO line is the deduction");

const originalWtcs = [{ id: "wtc-575" }, { id: "wtc-other" }];
assert(
  wtcsForSchedule(originalWtcs, new Set(["wtc-575"])).map(w => w.id).join() === "wtc-other",
  "E. a WTC canceled by a sold CO is left out of Send to Schedule",
);
assert(isCanceledBySoldCo([{ status: "Sold", deleted_at: null }]) === true, "E. Sold pointer cancels execution");
assert(isCanceledBySoldCo([{ status: "Draft", deleted_at: null }]) === false, "E. a draft CO does not cancel execution");
assert(isCanceledBySoldCo([{ status: "Sold", deleted_at: "2026-09-25" }]) === false, "E. a deleted CO does not cancel execution");
assert(
  wtcsForSchedule(originalWtcs, new Set()).length === 2,
  "J. without a sold cancellation, both WTCs still send",
);
assert(
  wtcsForSchedule([{ id: "ded", cancels_proposal_wtc_id: "wtc-575" }, { id: "add" }], new Set()).map(w => w.id).join() === "add",
  "F. a cancellation line is not itself sent to Schedule",
);

assert(approveEffects(-575).sendToSchedule === false, "F. negative CO is not sent to Schedule");
assert(approveEffects(-575).createQuickBooksJob === false, "G. negative CO does not create a QuickBooks job");
assert(approveEffects(-575).createInvoice === false, "H. negative CO approval does not create an invoice");
assert(approveEffects(-575).createCreditMemo === false, "H. negative CO approval does not create a credit memo");
assert(approveEffects(1200).createQuickBooksJob === true, "J. positive CO still creates a QuickBooks job");
assert(approveEffects(1200).sendToSchedule === true, "J. positive CO can still be sent to Schedule");
assert(approveEffects(0).createQuickBooksJob === true, "J. a zero total keeps the existing approve path");

const month = soldReporting(
  [{ call_log_id: 100 }, { call_log_id: 200 }],
  (p) => (p.call_log_id === 200 ? -575 : 4334),
);
assert(month.amount === 3759, "I. sold dollars include the -575 deduction");
assert(month.count === 1, "I. the negative CO does not add a sold job");
assert(countsAsSoldJob(1200) === true, "J. a positive CO still counts as a sold job");
assert(
  distinctSoldJobCount(
    [
      { call_log_id: 100, total: 4334 },
      { call_log_id: 200, total: -575 },
      { call_log_id: 300, total: 800 },
    ],
    (p) => p.total,
  ) === 2,
  "I/J. job count keeps the original and a positive CO, and drops the deduction",
);

const unrelated = { ...parentWtc, id: "other", tenant_id: "tenant-2", call_log_id: 999 };
assert(
  validateCancelTarget({
    target: unrelated,
    parentJobId: 100,
    coTenantId: "tenant-1",
    existingPointers: [],
  }).ok === false,
  "K. a different company cannot be linked",
);
assert(
  validateCancelTarget({
    target: { ...parentWtc, call_log_id: 999 },
    parentJobId: 100,
    coTenantId: "tenant-1",
    existingPointers: [],
  }).ok === false,
  "K. a WTC outside the parent job cannot be linked",
);
assert(
  validateCancelTarget({
    target: { ...parentWtc, is_change_order: true },
    parentJobId: 100,
    coTenantId: "tenant-1",
    existingPointers: [],
  }).ok === false,
  "K. another change order's WTC cannot be linked",
);
assert(
  validateCancelTarget({
    target: parentWtc,
    parentJobId: 100,
    coTenantId: "tenant-1",
    existingPointers: [{ cancels_proposal_wtc_id: "wtc-575", deleted_at: null, status: "Sold" }],
  }).ok === false,
  "K. a WTC already on a sold deductive CO cannot be linked again",
);
assert(
  validateCancelTarget({
    target: parentWtc,
    parentJobId: 100,
    coTenantId: "tenant-1",
    existingPointers: [],
  }).ok === true,
  "K. the parent sold WTC in the same company is allowed",
);
assert(
  deductiveAmount({ is_rate_card: false, locked_line_total: null }).ok === false,
  "a missing locked sold price is not guessed",
);

assert(executionRemovalDecision({ id: "jw", sow_revision_count: 0 }).action === "delete", "a schedule copy with no revision history can be removed");
assert(executionRemovalDecision({ id: "jw", sow_revision_count: 2 }).action === "stop", "SOW revision history blocks deletion");
assert(executionRemovalDecision(null).action === "none", "no schedule copy is a no-op");

const safeRow = { id: "jw-safe", job_id: 9, sow_revision_count: 0 };
const safePlan = planExecutionRetirement([safeRow], []);
const safeGate = mayFinalizeCancellation({ plan: safePlan, deletedIds: ["jw-safe"] });
assert(safePlan.proceed === true && safePlan.removeIds.join() === "jw-safe", "1. a safe schedule copy is the row to remove");
assert(safeGate.sold === true && safeGate.executableRemains === false, "1. after that row is removed, the negative CO may become Sold");

const nonePlan = planExecutionRetirement([], []);
const noneGate = mayFinalizeCancellation({ plan: nonePlan, deletedIds: [] });
assert(nonePlan.proceed === true && nonePlan.removeIds.length === 0, "2. no schedule copy means there is nothing to remove");
assert(noneGate.sold === true && noneGate.executableRemains === false, "2. the negative CO may become Sold when no schedule copy exists");

const revised = { id: "jw-rev", job_id: 9, sow_revision_count: 2 };
const revisedBefore = JSON.stringify(revised);
const revisedPlan = planExecutionRetirement([revised], []);
const revisedGate = mayFinalizeCancellation({ plan: revisedPlan, deletedIds: [] });
assert(revisedPlan.proceed === false && revisedPlan.removeIds.length === 0, "3. SOW revision history does not select the row for deletion");
assert(revisedGate.sold === false && revisedGate.executableRemains === true, "3. approval is blocked and the schedule copy stays executable");
assert(JSON.stringify(revised) === revisedBefore, "3. the schedule copy is not modified by the blocked plan");
assert(
  mayFinalizeCancellation({ plan: revisedPlan, deletedIds: ["jw-rev"] }).sold === false,
  "3. a blocked plan cannot be finalized even if a delete id is supplied",
);

const ticketRow = { id: "jw-ticket", job_id: 9, sow_revision_count: 0 };
const ticketBefore = JSON.stringify(ticketRow);
const ticketPlan = planExecutionRetirement(
  [ticketRow],
  [{ job_id: 9, day_keys: [{ wtc_id: "jw-ticket", slot: 1 }] }],
);
const ticketGate = mayFinalizeCancellation({ plan: ticketPlan, deletedIds: [] });
assert(ticketPlan.proceed === false && ticketPlan.removeIds.length === 0, "4. a pull ticket does not select the row for deletion");
assert(ticketGate.sold === false && ticketGate.executableRemains === true, "4. approval is blocked and the schedule copy stays executable");
assert(JSON.stringify(ticketRow) === ticketBefore, "4. the schedule copy is not modified by the blocked plan");

const failedPlan = planExecutionRetirement([safeRow], []);
const failedGate = mayFinalizeCancellation({ plan: failedPlan, deletedIds: [] });
assert(failedPlan.proceed === true, "5. a safe row is eligible for removal");
assert(failedGate.sold === false && failedGate.executableRemains === true, "5. a failed removal does not allow Sold while the schedule copy remains");

const plain = parentContractChain([
  { status: "Sold", call_log_id: 100, total: 4334, call_log: { is_change_order: false } },
], { parentJobId: 100 });
assert(plain.current === 4334 && plain.changeOrders === 0, "J. a job with no CO keeps its contract at the sold proposal");

console.log("deductiveCo tests passed");
