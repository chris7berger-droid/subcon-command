// Office saves use the signed-in desktop session and apply_time_punch_correction.
// The server requires an active Admin or Manager and sets the actor from
// auth.uid(). A hosted page never takes the isolated test sign-in.

import { isolatedTimeClockEnabled } from "./timeClockIsolated.js";

export const TIME_CLOCK_WRITES_AVAILABLE = true;

export const TIME_CLOCK_WRITES_REASON = "Saving is unavailable.";

export function timeClockWritesAvailable() {
  return isolatedTimeClockEnabled() || TIME_CLOCK_WRITES_AVAILABLE;
}

export function timePunchCorrectionArgs({ action, draft, loaded }) {
  const voiding = action === "void";
  return {
    p_action: action,
    p_punch_id: action === "add" ? null : loaded?.id ?? null,
    p_employee_id: voiding ? loaded?.employeeId ?? null : draft.employeeId,
    p_job_id: voiding ? (loaded?.jobId ? Number(loaded.jobId) : null) : Number(draft.jobId),
    p_punch_type: voiding ? loaded?.punchType ?? null : draft.punchType,
    p_punch_time: voiding ? loaded?.punchTimeIso ?? null : draft.stamp,
    p_punch_date: voiding ? loaded?.storedPunchDate ?? null : draft.date,
    p_reason: draft.reason,
    p_expected_employee_id: loaded?.employeeId || null,
    p_expected_job_id: loaded?.jobId ? Number(loaded.jobId) : null,
    p_expected_punch_type: loaded?.punchType || null,
    p_expected_punch_time: loaded?.punchTimeIso || null,
    p_expected_punch_date: loaded?.storedPunchDate || null,
  };
}

export async function applyTimePunchCorrection(args) {
  if (!timeClockWritesAvailable()) {
    return { data: null, error: { message: TIME_CLOCK_WRITES_REASON, code: "TIME_CLOCK_WRITES_OFF" } };
  }
  const { supabase } = await import("../../lib/supabase.js");
  return supabase.rpc("apply_time_punch_correction", args);
}
