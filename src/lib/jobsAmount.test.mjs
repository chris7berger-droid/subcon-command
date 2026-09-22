import {
  INVALID_PROPOSAL_TOTAL_MESSAGE,
  isBlankNumericSyntaxError,
  jobsAmountFromProposalTotal,
  scheduleSendErrorMessage,
} from "./jobsAmount.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const zero = jobsAmountFromProposalTotal(0);
assert(zero.ok === true && zero.amount === 0, "1. total 0 → jobs.amount 0");
assert(zero.amount !== "", "1. total 0 is not the empty string");

const zeroString = jobsAmountFromProposalTotal("0");
assert(zeroString.ok === true && zeroString.amount === 0, "1. string '0' → 0");

const positive = jobsAmountFromProposalTotal(33075);
assert(positive.ok === true && positive.amount === 33075, "2. positive number is unchanged");
const positiveString = jobsAmountFromProposalTotal("45342.22");
assert(positiveString.ok === true && positiveString.amount === 45342.22, "2. positive numeric string is unchanged");
const negative = jobsAmountFromProposalTotal(-34942);
assert(negative.ok === true && negative.amount === -34942, "2. negative finite total is sent as that number");

assert(jobsAmountFromProposalTotal(null).amount === null, "3. null → null");
assert(jobsAmountFromProposalTotal(undefined).amount === null, "3. undefined → null");
assert(jobsAmountFromProposalTotal("").amount === null, "3. blank string → null");
assert(jobsAmountFromProposalTotal("   ").amount === null, "3. whitespace → null");

for (const bad of ["abc", "12abc", Number.NaN, Number.POSITIVE_INFINITY]) {
  const result = jobsAmountFromProposalTotal(bad);
  assert(result.ok === false, `4. ${String(bad)} does not produce an amount`);
  assert(result.error === INVALID_PROPOSAL_TOTAL_MESSAGE, "4. invalid total names the proposal total");
  assert(!("amount" in result), "4. invalid total does not produce an insert value");
}

const duplicate = { code: "23505", message: "duplicate key value violates unique constraint" };
assert(isBlankNumericSyntaxError(duplicate) === false, "5. duplicate-send is not treated as a blank numeric");
assert(
  scheduleSendErrorMessage(duplicate).includes("duplicate key"),
  "5. duplicate message is left for the existing 23505 handler to own; fallback still includes the raw text",
);

const blankNumeric = {
  code: "22P02",
  message: 'invalid input syntax for type numeric: ""',
};
assert(isBlankNumericSyntaxError(blankNumeric) === true, "blank numeric syntax is recognized");
assert(
  scheduleSendErrorMessage(blankNumeric) === INVALID_PROPOSAL_TOTAL_MESSAGE,
  "blank numeric syntax does not show the raw Postgres message",
);
assert(
  !scheduleSendErrorMessage(blankNumeric).includes("invalid input syntax"),
  "user-facing blank-numeric message has no Postgres syntax text",
);

const other = { code: "42501", message: "new row violates row-level security policy" };
assert(
  scheduleSendErrorMessage(other) === "Error sending to Schedule: new row violates row-level security policy",
  "other insert errors keep their message",
);

console.log("jobsAmount tests passed");
