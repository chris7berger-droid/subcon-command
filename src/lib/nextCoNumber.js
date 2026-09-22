/**
 * New Inquiry CO allocation.
 *
 * Go Back children live in the same parent_job_id family with co_number NULL.
 * Postgres ORDER BY co_number DESC uses NULLS FIRST, so a GB row can win
 * limit(1) and the old `(null || 0) + 1` formula mints a duplicate CO1.
 *
 * Real COs determine the next number. Go Backs and NULL co_number are ignored.
 */

export const JOB_CO_UNIQUE_INDEX = "idx_call_log_unique_job_number";

export function nextCoNumberFromRows(rows) {
  let max = 0;
  for (const row of rows || []) {
    if (!row || row.is_go_back === true) continue;
    const n = Number(row.co_number);
    if (!Number.isFinite(n) || n < 1) continue;
    if (n > max) max = n;
  }
  return max + 1;
}

export function nextCoNumberFromQuery({ data, error } = {}) {
  if (error) return { ok: false, error };
  return { ok: true, coNumber: nextCoNumberFromRows(data) };
}

export function isJobCoUniqueViolation(err) {
  if (!err || err.code !== "23505") return false;
  const blob = `${err.message || ""} ${err.details || ""} ${err.hint || ""}`;
  return blob.includes(JOB_CO_UNIQUE_INDEX);
}

export function changeOrderInsertErrorMessage(err) {
  if (isJobCoUniqueViolation(err)) {
    return "Couldn't create this change order — that job/CO number is already in use. Reload and try again.";
  }
  if (err?.code === "23505") {
    return err.message
      ? `Couldn't create this change order: ${err.message}`
      : "Couldn't create this change order — a unique constraint was violated.";
  }
  return err?.message || "Couldn't create this change order.";
}
