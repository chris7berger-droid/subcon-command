// Production and the Vercel preview keep saving off.
// The disposable local database is the only place this returns true.

import { isolatedTimeClockEnabled } from "./timeClockIsolated.js";

export const TIME_CLOCK_WRITES_AVAILABLE = false;

export const TIME_CLOCK_WRITES_REASON = "Saving is unavailable.";

export function timeClockWritesAvailable() {
  return isolatedTimeClockEnabled();
}

export async function applyTimePunchCorrection(args) {
  if (!timeClockWritesAvailable()) {
    return { data: null, error: { message: TIME_CLOCK_WRITES_REASON, code: "TIME_CLOCK_WRITES_OFF" } };
  }
  const { supabase } = await import("../../lib/supabase.js");
  return supabase.rpc("apply_time_punch_correction", args);
}
