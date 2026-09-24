// Office add/edit/void stays off in this build.
// A server guard can keep a stale upload from replacing the database row, but
// the phone uploads a batch. A skipped void is a failed upload, and the phone
// retries that whole batch, which can block a new punch. A silent skip also
// leaves the phone's own copy unchanged. This preview reads production data,
// and the correction migration is not applied there.

export const TIME_CLOCK_WRITES_AVAILABLE = false;

export const TIME_CLOCK_WRITES_REASON = "Saving is unavailable.";
