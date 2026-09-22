/**
 * jobs.amount for Send to Schedule.
 *
 * A proposal total of 0 is a real contract amount (rate cards store 0).
 * The old `p.total ? String(Number(p.total)) : ""` treated 0 as missing
 * and inserted "", which numeric rejects.
 */

export const INVALID_PROPOSAL_TOTAL_MESSAGE =
  "This proposal's total isn't a valid number, so it can't be sent to Schedule.";

export function jobsAmountFromProposalTotal(total) {
  if (total == null) return { ok: true, amount: null };
  if (typeof total === "string" && total.trim() === "") return { ok: true, amount: null };
  const n = typeof total === "number" ? total : Number(String(total).trim());
  if (!Number.isFinite(n)) {
    return { ok: false, error: INVALID_PROPOSAL_TOTAL_MESSAGE };
  }
  return { ok: true, amount: n };
}

export function isBlankNumericSyntaxError(err) {
  const message = err?.message || "";
  return err?.code === "22P02" && /invalid input syntax for type numeric:\s*""/.test(message);
}

export function scheduleSendErrorMessage(err) {
  if (isBlankNumericSyntaxError(err)) return INVALID_PROPOSAL_TOTAL_MESSAGE;
  return err?.message ? `Error sending to Schedule: ${err.message}` : "Error sending to Schedule.";
}
