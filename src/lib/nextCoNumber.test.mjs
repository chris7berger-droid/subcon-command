import {
  changeOrderInsertErrorMessage,
  isJobCoUniqueViolation,
  nextCoNumberFromQuery,
  nextCoNumberFromRows,
} from "./nextCoNumber.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// Postgres ORDER BY co_number DESC uses NULLS FIRST — the confirmed failure.
const co1Through7PlusGb = [
  { co_number: null, is_go_back: true },
  { co_number: 7, is_go_back: false },
  { co_number: 6, is_go_back: false },
  { co_number: 5, is_go_back: false },
  { co_number: 4, is_go_back: false },
  { co_number: 3, is_go_back: false },
  { co_number: 2, is_go_back: false },
  { co_number: 1, is_go_back: false },
];
const oldLimit1Formula = (rows) =>
  rows && rows.length > 0 ? (rows[0].co_number || 0) + 1 : 1;

assert(oldLimit1Formula(co1Through7PlusGb) === 1,
  "confirmed bug: DESC NULLS FIRST + (null||0)+1 yields CO1");
assert(nextCoNumberFromRows(co1Through7PlusGb) === 8,
  "CO1–CO7 + GB1(NULL) → CO8");

assert(nextCoNumberFromRows([]) === 1, "no siblings → CO1");
assert(nextCoNumberFromRows(null) === 1, "null rows → CO1");
assert(
  nextCoNumberFromRows([{ co_number: null, is_go_back: true }]) === 1,
  "1. no existing COs + GB does not interfere with first real CO",
);

assert(
  nextCoNumberFromRows([
    { co_number: null, is_go_back: true },
    { co_number: null, is_go_back: true },
    { co_number: 7, is_go_back: false },
    { co_number: 1, is_go_back: false },
  ]) === 8,
  "3. multiple Go Backs still do not affect CO numbering",
);

assert(
  nextCoNumberFromRows([
    { co_number: null, is_go_back: false },
    { co_number: 2, is_go_back: false },
  ]) === 3,
  "NULL co_number on a non-GB row is ignored",
);

const failed = nextCoNumberFromQuery({ data: null, error: { message: "timeout", code: "57014" } });
assert(failed.ok === false, "allocation read failure must not look like 'no COs'");
assert(failed.error?.code === "57014", "read failure preserves the query error");

const emptyOk = nextCoNumberFromQuery({ data: [], error: null });
assert(emptyOk.ok === true && emptyOk.coNumber === 1,
  "successful empty read is CO1 — distinct from a failed read");

const gbOnlyOk = nextCoNumberFromQuery({
  data: [{ co_number: null, is_go_back: true }],
  error: null,
});
assert(gbOnlyOk.ok === true && gbOnlyOk.coNumber === 1,
  "successful GB-only read is CO1 after ignoring the GB row");

const jobCoDup = {
  code: "23505",
  message: 'duplicate key value violates unique constraint "idx_call_log_unique_job_number"',
  details: "Key (tenant_id, job_number, (COALESCE(co_number, 0)))=(aaa, 6814, 1) already exists.",
};
assert(isJobCoUniqueViolation(jobCoDup) === true, "4. job/CO unique index is recognized");
assert(
  !changeOrderInsertErrorMessage(jobCoDup).includes("another CO was created at the same time"),
  "job/CO 23505 does not claim a concurrent-allocation race",
);
assert(
  changeOrderInsertErrorMessage(jobCoDup).includes("already in use"),
  "job/CO 23505 says the number is already in use",
);

const otherDup = {
  code: "23505",
  message: 'duplicate key value violates unique constraint "customers_email_key"',
};
assert(isJobCoUniqueViolation(otherDup) === false, "other unique indexes are not job/CO collisions");
assert(
  !changeOrderInsertErrorMessage(otherDup).includes("another CO was created at the same time"),
  "non-job/CO 23505 does not claim a concurrent CO race",
);
assert(
  changeOrderInsertErrorMessage(otherDup).includes("customers_email_key"),
  "other 23505 surfaces the actual constraint error",
);

console.log("nextCoNumber tests passed");
