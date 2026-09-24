// Office add/edit/void stays off in this build.
// A server guard can keep a stale upload from replacing the database row, but
// the phone uploads a batch. A skipped void is a failed upload, and the phone
// retries that whole batch, which can block a new punch. A silent skip also
// leaves the phone's own copy unchanged. This preview reads production data,
// and the correction migration is not applied there.

export const TIME_CLOCK_WRITES_AVAILABLE = false;

export const TIME_CLOCK_WRITES_REASON =
  "Add, edit, and void are unavailable. A queued phone upload can still overwrite an office change or restore a voided punch. The phone sends punches in a batch, and a skipped void comes back as a failed upload that the phone retries, which can block new punches. Ignoring that upload also does not update the copy on the phone. This preview reads production data, and the correction migration is not applied.";
