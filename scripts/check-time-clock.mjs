import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  MISSING_CUSTOMER,
  MISSING_EMPLOYEE,
  MISSING_JOB,
  TIME_PUNCH_ORDER,
  TIME_PUNCH_SELECT,
  assertPunchDateRange,
  cleanJobName,
  contextBounds,
  employeeChoices,
  createPunchRequestGuard,
  filterTimeClockRows,
  formatShiftDate,
  formatStoredHours,
  punchClockLabel,
  recordedPunch,
  initialPunchLoad,
  loadTimeClockPunches,
  mondayOf,
  pacificLocalToIso,
  pacificTimeValue,
  pacificToday,
  reviewFetchBounds,
  sundayOf,
  punchFilterOptions,
  punchesInRange,
  punchTypeLabel,
  readAllOrderedPages,
  reducePunchLoad,
  shapeTimePunch,
} from "../src/field/lib/timeClock.js";
import { csvCell, reviewRowsToCsv, reviewShiftCsvFields } from "../src/field/lib/timeClockCsv.js";
import {
  STATUS_IN_PROGRESS,
  STATUS_INCOMPLETE,
  STATUS_OVERLAP,
  STATUS_WEEK_INCOMPLETE,
  formatDurationHours,
  reviewTimePunches,
} from "../src/field/lib/timeClockHours.js";
import { isolatedTimeClockEnabledFrom } from "../src/field/lib/timeClockIsolated.js";
import { TIME_CLOCK_WRITES_AVAILABLE, TIME_CLOCK_WRITES_REASON, timeClockWritesAvailable, timePunchCorrectionArgs } from "../src/field/lib/timeClockWrites.js";

assert.throws(() => assertPunchDateRange("", "2026-09-23"), /both a start date and an end date/i);
assert.throws(() => assertPunchDateRange("2026-09-23", ""), /both a start date and an end date/i);
assert.throws(() => assertPunchDateRange("2026-02-29", "2026-03-01"), /real calendar dates/i);
assert.throws(() => assertPunchDateRange("09/23/2026", "2026-09-23"), /real calendar dates/i);
assert.throws(() => assertPunchDateRange("2026-09-24", "2026-09-23"), /on or before/i);
assert.deepEqual(assertPunchDateRange("2026-09-23", "2026-09-23"), { from: "2026-09-23", to: "2026-09-23" });
assert.deepEqual(assertPunchDateRange("2026-09-01", "2026-09-30"), { from: "2026-09-01", to: "2026-09-30" });

// 2026-09-24 06:30Z is still Sep 23 in Pacific (PDT, UTC-7). 07:00Z is Sep 24.
assert.equal(pacificToday(new Date("2026-09-24T06:30:00.000Z")), "2026-09-23");
assert.equal(pacificToday(new Date("2026-09-24T07:00:00.000Z")), "2026-09-24");

assert.equal(formatStoredHours(null), "");
assert.equal(formatStoredHours(undefined), "");
assert.equal(formatStoredHours(0), "0");
assert.equal(formatStoredHours("0.00"), "0.00");
assert.equal(formatStoredHours("8.50"), "8.50");

const historical = shapeTimePunch({
  id: "punch-old",
  punch_date: "2024-04-02",
  punch_time: "2024-04-03T07:15:00.000Z",
  punch_type: "clock_out",
  hours_regular: "8.00",
  hours_ot: 0,
  job_id: 900,
  employee_id: "emp-1",
  team_members: { id: "emp-1", name: "Historical Crew" },
  call_log: {
    id: 900,
    display_job_number: "10009",
    job_name: "Closed deck",
    customer_id: "cust-9",
    customer_name: "Old Customer",
  },
});
assert.equal(historical.workDate, "Apr 2, 2024");
assert.equal(historical.punchDate, "Apr 3, 2024");
assert.equal(historical.punchTime, "12:15 AM");
assert.equal(historical.job, "10009 — Closed deck");
assert.equal(historical.jobNumber, "10009");
assert.equal(historical.jobName, "Closed deck");
assert.equal(historical.customer, "Old Customer");
assert.equal(historical.hoursRegular, "8.00");
assert.equal(historical.hoursOt, "0");

const missing = shapeTimePunch({
  id: "punch-missing",
  punch_date: "2026-09-23",
  punch_time: null,
  punch_type: "clock_in",
  hours_regular: null,
  hours_ot: null,
  job_id: 77,
  employee_id: "emp-raw",
  team_members: null,
  call_log: null,
});
assert.equal(missing.employee, "emp-raw");
assert.equal(missing.job, "77");
assert.equal(missing.jobNumber, "77");
assert.equal(missing.jobName, "");
assert.equal(missing.customer, MISSING_CUSTOMER);
assert.equal(missing.hoursRegular, "");
assert.equal(missing.hoursOt, "");
assert.equal(missing.punchDate, "—");

const blankIds = shapeTimePunch({
  id: "punch-blank",
  punch_date: "2026-09-23",
  punch_type: "clock_in",
  job_id: null,
  employee_id: null,
  team_members: { name: "   " },
  call_log: { customer_name: "", customer_id: null, job_name: "" },
});
assert.equal(blankIds.employee, MISSING_EMPLOYEE);
assert.equal(blankIds.job, MISSING_JOB);
assert.equal(blankIds.customer, MISSING_CUSTOMER);

const namedById = shapeTimePunch({
  id: "punch-id-label",
  punch_date: "2026-09-23",
  punch_type: "clock_out",
  job_id: 12,
  employee_id: "emp-2",
  call_log: { id: 12, customer_id: "cust-2", customer_name: "" },
});
assert.equal(namedById.customer, "cust-2");
assert.equal(namedById.job, "12");

// Stored hours stay on non-clock-out rows. Unfamiliar types are kept.
const lunch = shapeTimePunch({
  id: "punch-lunch",
  punch_date: "2026-09-23",
  punch_time: "2026-09-23T18:00:00.000Z",
  punch_type: "meal_start",
  hours_regular: 0,
  hours_ot: "1.25",
  job_id: 12,
  employee_id: "emp-2",
  team_members: { name: "Victor" },
  call_log: { id: 12, display_job_number: "7215", job_name: "STY 4", customer_id: "cust-1", customer_name: "Acme" },
});
assert.equal(lunch.punchType, "meal_start");
assert.equal(punchTypeLabel(lunch.punchType), "meal start");
assert.equal(punchTypeLabel("clock_in"), "Clock in");
assert.equal(lunch.hoursRegular, "0");
assert.equal(lunch.hoursOt, "1.25");
assert.equal(shapeTimePunch({ id: "x", punch_type: null }).punchType, "");
assert.equal(punchTypeLabel(""), "—");

const victorA = { ...lunch, id: "a", employeeId: "emp-2", employee: "Victor", jobId: "12", customerId: "cust-1" };
const victorB = {
  ...lunch,
  id: "b",
  employeeId: "emp-3",
  employee: "Victor",
  jobId: "13",
  job: "7215 — STY 4",
  customerId: "cust-4",
  customer: "Acme",
};
const unmatched = {
  ...missing,
  id: "c",
  employeeId: "emp-raw",
  employee: "emp-raw",
  jobId: "77",
  customerId: null,
  customer: MISSING_CUSTOMER,
};
const roster = [historical, victorA, victorB, unmatched];
assert.equal(filterTimeClockRows(roster, {}).length, 4);
assert.deepEqual(
  filterTimeClockRows(roster, { employeeId: "emp-3" }).map((row) => row.id),
  ["b"]
);
assert.deepEqual(
  filterTimeClockRows(roster, { jobId: "77" }).map((row) => row.id),
  ["c"]
);
assert.deepEqual(
  filterTimeClockRows(roster, { customerId: "cust-1" }).map((row) => row.id),
  ["a"]
);
assert.equal(filterTimeClockRows(roster, { customerId: "cust-1" }).some((row) => row.customerId == null), false);
assert.equal(filterTimeClockRows(roster, {}).some((row) => row.id === "c"), true);

const jobs = punchFilterOptions(roster, "jobId", "job");
assert.deepEqual(
  jobs.filter((option) => option.label.startsWith("7215")).map((option) => option.id),
  ["12", "13"]
);
const employees = punchFilterOptions(roster, "employeeId", "employee");
assert.deepEqual(
  employees.filter((option) => option.label.startsWith("Victor")).map((option) => option.label),
  [`Victor · emp-2`, `Victor · emp-3`]
);
const customers = punchFilterOptions(roster, "customerId", "customer");
assert.equal(customers.some((option) => option.id === "cust-9"), true);
assert.equal(customers.some((option) => option.label === MISSING_CUSTOMER), false);
assert.deepEqual(
  customers.filter((option) => option.label.startsWith("Acme")).map((option) => option.id).sort(),
  ["cust-1", "cust-4"]
);

function fakeClient(pages) {
  const calls = [];
  const queue = [...pages];
  return {
    calls,
    from(table) {
      const state = { table, select: null, filters: [], orders: [] };
      const api = {
        select(value) {
          state.select = value;
          return api;
        },
        gte(column, value) {
          state.filters.push(["gte", column, value]);
          return api;
        },
        lte(column, value) {
          state.filters.push(["lte", column, value]);
          return api;
        },
        order(column, options) {
          state.orders.push([column, options]);
          return api;
        },
        range(from, to) {
          calls.push({
            table: state.table,
            select: state.select,
            filters: [...state.filters],
            orders: state.orders.map(([column, options]) => [column, { ...options }]),
            range: [from, to],
          });
          const page = queue.shift();
          if (!page) return Promise.resolve({ data: [], error: null });
          return Promise.resolve(page);
        },
      };
      return api;
    },
  };
}

const pageSize = 2;
const client = fakeClient([
  {
    data: [
      { id: "p1", punch_date: "2020-01-01", punch_type: "clock_in", job_id: 1, employee_id: "e1", hours_regular: null, hours_ot: null },
      { id: "p2", punch_date: "2020-01-01", punch_type: "clock_out", job_id: 1, employee_id: "e1", hours_regular: "4", hours_ot: null, call_log: { id: 1, job_name: "Old job", customer_id: "c1", customer_name: "Then" } },
    ],
    error: null,
  },
  {
    data: [
      { id: "p3", punch_date: "2020-01-02", punch_type: "site_walk", job_id: 2, employee_id: "e2", hours_regular: 0, hours_ot: "0" },
    ],
    error: null,
  },
]);
const loaded = await loadTimeClockPunches(client, { from: "2020-01-01", to: "2020-01-02", pageSize });
assert.deepEqual(loaded.map((row) => row.id), ["p1", "p2", "p3"]);
assert.equal(loaded[2].punchType, "site_walk");
assert.equal(loaded[2].hoursRegular, "0");
assert.equal(loaded[2].hoursOt, "0");
assert.deepEqual(client.calls.map((call) => call.table), ["time_punches", "time_punches"]);
assert.deepEqual(client.calls[0].filters, [
  ["gte", "punch_date", "2020-01-01"],
  ["lte", "punch_date", "2020-01-02"],
]);
assert.deepEqual(
  client.calls[0].orders.map(([column]) => column),
  TIME_PUNCH_ORDER.map(([column]) => column)
);
assert.equal(client.calls[0].orders.at(-1)[0], "id");
assert.equal(client.calls[0].select, TIME_PUNCH_SELECT);
assert.equal(client.calls[0].select.includes("jobs"), false);
assert.deepEqual(client.calls.map((call) => call.range), [
  [0, 1],
  [2, 3],
]);

const failing = fakeClient([
  { data: [{ id: "only-page" }], error: null },
  { data: null, error: { message: "statement timeout" } },
]);
await assert.rejects(
  () => loadTimeClockPunches(failing, { from: "2026-09-01", to: "2026-09-02", pageSize: 1 }),
  /statement timeout/
);
assert.equal(failing.calls.length, 2);

await assert.rejects(
  () => readAllOrderedPages(async () => { throw new Error("network down"); }, { pageSize: 1 }),
  /network down/
);

const guard = createPunchRequestGuard();
let state = initialPunchLoad;
const first = guard.start();
state = reducePunchLoad(state, { type: "start", requestId: first, rangeKey: "2026-09-01|2026-09-01" });
state = reducePunchLoad(state, { type: "success", requestId: first, rows: [{ id: "monday" }] });
assert.equal(state.publishedRangeKey, "2026-09-01|2026-09-01");
const second = guard.start();
state = reducePunchLoad(state, { type: "start", requestId: second, rangeKey: "2026-09-02|2026-09-05" });
assert.deepEqual(state.rows, []);
assert.equal(state.publishedRangeKey, null);
state = reducePunchLoad(state, { type: "success", requestId: first, rows: [{ id: "monday-late" }] });
assert.deepEqual(state.rows, []);
assert.equal(state.publishedRangeKey, null);
assert.equal(state.loading, true);
state = reducePunchLoad(state, { type: "success", requestId: second, rows: [{ id: "later-range" }] });
assert.deepEqual(state.rows.map((row) => row.id), ["later-range"]);
assert.equal(state.publishedRangeKey, "2026-09-02|2026-09-05");
state = reducePunchLoad(state, { type: "failure", requestId: first, error: "stale failure" });
assert.equal(state.error, null);
assert.equal(state.rows[0].id, "later-range");
const third = guard.start();
state = reducePunchLoad(state, { type: "start", requestId: third, rangeKey: "2026-09-06|2026-09-06" });
state = reducePunchLoad(state, { type: "failure", requestId: third, error: "statement timeout" });
assert.deepEqual(state.rows, []);
assert.equal(state.publishedRangeKey, null);
assert.equal(state.error, "statement timeout");

const view = readFileSync(new URL("../src/field/views/TimeClock.jsx", import.meta.url), "utf8");
const queries = readFileSync(new URL("../src/field/lib/queries.js", import.meta.url), "utf8");
assert.equal(view.includes("fetchFieldPunches"), false);
assert.equal(view.includes("fetchActiveFieldJobs"), false);
assert.equal(view.includes("useAsync"), false);
assert.equal(view.includes("reducePunchLoad"), true);
assert.equal(view.includes("fetchTimeClockReview"), true);
assert.equal(view.includes("StatStrip"), false);
assert.equal(view.includes("jobNumber"), true);
assert.equal(view.includes(".rpc("), false);
assert.equal(view.includes("apply_time_punch_correction"), false);
assert.equal(view.includes("TIME_CLOCK_WRITES_REASON"), true);
assert.equal(view.includes("timeClockWritesAvailable"), true);
assert.equal(queries.includes("export function fetchTimeClockPunches"), true);
assert.equal(queries.includes("export async function fetchTimeClockReview"), true);
assert.equal(queries.includes("reviewFetchBounds"), true);
assert.equal(view.includes("Add punch"), true);
assert.equal(view.includes("Edit punch"), true);
assert.equal(view.includes("Review changes"), true);
assert.equal(view.includes("You're about to add a time record."), true);
assert.equal(view.includes("You're about to change an existing time record."), true);
assert.equal(view.includes("You're about to void this time record."), true);
assert.equal(view.includes("Confirm add"), true);
assert.equal(view.includes("Confirm changes"), true);
assert.equal(view.includes("Confirm void"), true);
assert.equal(view.includes("Review punches"), true);
assert.equal(view.includes("Lunch out"), true);
assert.equal(view.includes("Quick"), true);
assert.equal(view.includes("Expanded"), true);
assert.equal(view.includes("queued phone"), false);
assert.equal(queries.includes("export async function fetchTodayRows"), true);
assert.equal(queries.includes("async function fetchActiveFieldJobs"), true);
const todayBlock = queries.slice(queries.indexOf("export async function fetchTodayRows"), queries.indexOf("export async function fetchFieldJobs"));
assert.equal(todayBlock.includes("loadTimeClockPunches"), false);
const activeBlock = queries.slice(queries.indexOf("async function fetchActiveFieldJobs"), queries.indexOf("export async function fetchFieldThresholds"));
assert.equal(activeBlock.includes("loadTimeClockPunches"), false);

assert.deepEqual(contextBounds("2026-03-01", "2026-03-01"), {
  from: "2026-02-27",
  to: "2026-03-03",
  displayFrom: "2026-03-01",
  displayTo: "2026-03-01",
});
assert.equal(contextBounds("2026-12-31", "2026-12-31").to, "2027-01-02");
assert.equal(
  punchesInRange(
    [
      { storedPunchDate: "2026-09-22" },
      { storedPunchDate: "2026-09-23" },
      { storedPunchDate: null },
    ],
    "2026-09-23",
    "2026-09-23"
  ).length,
  1
);

state = reducePunchLoad(state, { type: "start", requestId: guard.start(), rangeKey: "2026-09-07|2026-09-07" });
assert.deepEqual(state.contextRows, []);
const contextRequest = state.requestId;
state = reducePunchLoad(state, {
  type: "success",
  requestId: contextRequest,
  rows: [{ id: "in-range" }],
  contextRows: [{ id: "overnight" }],
});
assert.equal(state.contextRows[0].id, "overnight");
const ignored = guard.start();
state = reducePunchLoad(state, { type: "start", requestId: ignored, rangeKey: "2026-09-08|2026-09-08" });
state = reducePunchLoad(state, {
  type: "success",
  requestId: contextRequest,
  rows: [{ id: "stale" }],
  contextRows: [{ id: "stale-context" }],
});
assert.deepEqual(state.rows, []);
assert.deepEqual(state.contextRows, []);

function punch(partial) {
  return {
    id: partial.id,
    employeeId: partial.employeeId || "e1",
    employee: partial.employee || "Ada",
    jobId: partial.jobId || "10",
    jobNumber: partial.jobNumber || "100",
    jobName: partial.jobName || "Deck",
    job: partial.job || "100 — Deck",
    customerId: partial.customerId || "c1",
    customer: partial.customer || "Acme",
    punchType: partial.punchType,
    punchTimeIso: partial.punchTimeIso,
    storedPunchDate: partial.storedPunchDate,
    hoursRegular: partial.hoursRegular ?? "",
    hoursOt: partial.hoursOt ?? "",
    hoursDrive: partial.hoursDrive ?? "",
    workDate: partial.storedPunchDate || "",
    pacificStamp: partial.punchTimeIso || "",
  };
}

const day = reviewTimePunches(
  [
    punch({ id: "in", punchType: "clock_in", punchTimeIso: "2026-09-23T15:00:00.000Z", storedPunchDate: "2026-09-23", hoursRegular: "0" }),
    punch({ id: "ls", punchType: "lunch_start", punchTimeIso: "2026-09-23T19:00:00.000Z", storedPunchDate: "2026-09-23", hoursRegular: "" }),
    punch({ id: "le", punchType: "lunch_end", punchTimeIso: "2026-09-23T21:00:00.000Z", storedPunchDate: "2026-09-23" }),
    punch({ id: "out", punchType: "clock_out", punchTimeIso: "2026-09-23T23:30:00.000Z", storedPunchDate: "2026-09-23", hoursOt: "0" }),
  ],
  { from: "2026-09-23", to: "2026-09-23" }
);
assert.equal(day.rows.length, 1);
assert.equal(day.rows[0].statusLabel, "");
assert.equal(formatDurationHours(day.rows[0].workMs), "8.00");
assert.equal(day.rows[0].regularHours, "8.00");
assert.equal(day.rows[0].otHours, "0.00");
assert.equal(day.rows[0].holidayHours, "");
assert.equal(day.rows[0].punches.find((row) => row.id === "in").hoursRegular, "0");
assert.equal(day.rows[0].punches.find((row) => row.id === "ls").hoursRegular, "");
assert.equal(day.rows[0].punches.find((row) => row.id === "out").hoursOt, "0");

const missingLunchEnd = reviewTimePunches(
  [
    punch({ id: "in2", punchType: "clock_in", punchTimeIso: "2026-09-23T15:00:00.000Z", storedPunchDate: "2026-09-23" }),
    punch({ id: "ls2", punchType: "lunch_start", punchTimeIso: "2026-09-23T19:00:00.000Z", storedPunchDate: "2026-09-23" }),
    punch({ id: "out2", punchType: "clock_out", punchTimeIso: "2026-09-23T23:30:00.000Z", storedPunchDate: "2026-09-23" }),
  ],
  { from: "2026-09-23", to: "2026-09-23" }
);
assert.equal(formatDurationHours(missingLunchEnd.rows[0].workMs), "8.00");
assert.equal(missingLunchEnd.rows[0].punches.some((row) => row.punchType === "lunch_end"), false);
assert.equal(recordedPunch(missingLunchEnd.rows[0], "lunch_end"), null);
assert.equal(punchClockLabel(recordedPunch(missingLunchEnd.rows[0], "lunch_end")?.punchTimeIso, "2026-09-23"), "");

const tooShort = reviewTimePunches(
  [
    punch({ id: "s-in", punchType: "clock_in", punchTimeIso: "2026-09-23T15:00:00.000Z", storedPunchDate: "2026-09-23" }),
    punch({ id: "s-ls", punchType: "lunch_start", punchTimeIso: "2026-09-23T15:05:00.000Z", storedPunchDate: "2026-09-23" }),
    punch({ id: "s-out", punchType: "clock_out", punchTimeIso: "2026-09-23T15:20:00.000Z", storedPunchDate: "2026-09-23" }),
  ],
  { from: "2026-09-23", to: "2026-09-23" }
);
assert.equal(tooShort.rows[0].statusLabel, "Lunch is longer than the shift");
assert.equal(formatDurationHours(tooShort.rows[0].workMs), "");

const overnight = reviewTimePunches(
  [
    punch({ id: "n-in", punchType: "clock_in", punchTimeIso: "2026-09-23T06:00:00.000Z", storedPunchDate: "2026-09-22" }),
    punch({ id: "n-out", punchType: "clock_out", punchTimeIso: "2026-09-23T14:00:00.000Z", storedPunchDate: "2026-09-23" }),
  ],
  { from: "2026-09-22", to: "2026-09-22" }
);
assert.equal(overnight.rows.length, 1);
assert.equal(overnight.rows[0].startDay, "2026-09-22");
assert.equal(formatDurationHours(overnight.rows[0].workMs), "8.00");
const nextMorning = reviewTimePunches(
  [
    punch({ id: "n-in", punchType: "clock_in", punchTimeIso: "2026-09-23T06:00:00.000Z", storedPunchDate: "2026-09-22" }),
    punch({ id: "n-out", punchType: "clock_out", punchTimeIso: "2026-09-23T14:00:00.000Z", storedPunchDate: "2026-09-23" }),
  ],
  { from: "2026-09-23", to: "2026-09-23" }
);
assert.equal(nextMorning.rows.length, 0);

const openShift = reviewTimePunches(
  [punch({ id: "open", punchType: "clock_in", punchTimeIso: "2026-09-23T15:00:00.000Z", storedPunchDate: "2026-09-23" })],
  { from: "2026-09-23", to: "2026-09-23" }
);
assert.equal(openShift.rows[0].statusLabel, STATUS_INCOMPLETE);
assert.match(openShift.rows[0].statusDetail, /No clock-out was recorded/);
assert.equal(formatDurationHours(openShift.rows[0].workMs), "");
const inProgress = reviewTimePunches(
  [punch({ id: "open-now", punchType: "clock_in", punchTimeIso: "2026-09-24T15:00:00.000Z", storedPunchDate: "2026-09-24" })],
  { from: "2026-09-24", to: "2026-09-24", today: "2026-09-24" }
);
assert.equal(inProgress.rows[0].statusLabel, STATUS_IN_PROGRESS);
assert.equal(formatDurationHours(inProgress.rows[0].workMs), "");
assert.equal(formatShiftDate("2026-09-24"), "Sep 24");
assert.equal(punchClockLabel("2026-09-23T14:00:00.000Z", "2026-09-22"), "7:00 AM · Sep 23");
assert.equal(punchClockLabel("2026-09-23T15:00:00.000Z", "2026-09-23"), "8:00 AM");

const overlap = reviewTimePunches(
  [
    punch({ id: "o1", punchType: "clock_in", punchTimeIso: "2026-09-23T15:00:00.000Z", storedPunchDate: "2026-09-23", employee: "Crew", jobNumber: "100", jobName: "Deck" }),
    punch({ id: "o2", punchType: "clock_in", punchTimeIso: "2026-09-23T16:00:00.000Z", storedPunchDate: "2026-09-23", employee: "Crew", jobId: "11", jobNumber: "200", jobName: "Roof" }),
    punch({ id: "o3", punchType: "clock_out", punchTimeIso: "2026-09-24T00:00:00.000Z", storedPunchDate: "2026-09-23" }),
  ],
  { from: "2026-09-23", to: "2026-09-23" }
);
assert.equal(overlap.rows.length, 2);
assert.equal(overlap.rows.every((row) => row.workMs == null), true);
assert.equal(overlap.rows.every((row) => row.statusLabel === STATUS_OVERLAP), true);
assert.equal(
  overlap.rows[0].statusDetail,
  "On September 23, Crew clocked into Job 100 — Deck at 8:00 AM, then Job 200 — Roof at 9:00 AM Pacific. No clock-out for Job 100 is recorded between those punches. Review the punches to check for a missing clock-out or duplicate clock-in."
);
assert.equal(recordedPunch(overlap.rows.find((row) => row.jobId === "10"), "clock_out"), null);
assert.equal(overlap.rows[0].key === overlap.rows[1].key, false);

const withDrive = reviewTimePunches(
  [
    punch({ id: "d1", punchType: "drive_start", punchTimeIso: "2026-09-23T14:00:00.000Z", storedPunchDate: "2026-09-23" }),
    punch({ id: "d2", punchType: "drive_end", punchTimeIso: "2026-09-23T14:45:00.000Z", storedPunchDate: "2026-09-23" }),
    punch({ id: "d3", punchType: "clock_in", punchTimeIso: "2026-09-23T15:00:00.000Z", storedPunchDate: "2026-09-23" }),
    punch({ id: "d4", punchType: "clock_out", punchTimeIso: "2026-09-23T23:00:00.000Z", storedPunchDate: "2026-09-23" }),
  ],
  { from: "2026-09-23", to: "2026-09-23" }
);
assert.equal(withDrive.rows.length, 1);
assert.equal(formatDurationHours(withDrive.rows[0].workMs), "8.00");
assert.equal(formatDurationHours(withDrive.rows[0].driveMs), "0.75");
assert.equal(withDrive.rows[0].regularHours, "8.75");
assert.equal(withDrive.rows[0].otHours, "0.00");
assert.equal(
  (Number(withDrive.rows[0].regularHours) + Number(withDrive.rows[0].otHours)).toFixed(2),
  (Number(formatDurationHours(withDrive.rows[0].workMs)) + Number(formatDurationHours(withDrive.rows[0].driveMs))).toFixed(2)
);

const driveOnly = reviewTimePunches(
  [
    punch({ id: "do1", punchType: "drive_start", punchTimeIso: "2026-09-23T14:00:00.000Z", storedPunchDate: "2026-09-23" }),
    punch({ id: "do2", punchType: "drive_end", punchTimeIso: "2026-09-23T14:45:00.000Z", storedPunchDate: "2026-09-23" }),
  ],
  { from: "2026-09-23", to: "2026-09-23" }
);
assert.equal(driveOnly.rows[0].statusLabel, "");
assert.equal(formatDurationHours(driveOnly.rows[0].workMs), "");
assert.equal(formatDurationHours(driveOnly.rows[0].driveMs), "0.75");
assert.equal(driveOnly.rows[0].regularHours, "0.75");
assert.equal(driveOnly.rows[0].otHours, "0.00");

const twoJobs = reviewTimePunches(
  [
    punch({ id: "j1", punchType: "clock_in", punchTimeIso: "2026-09-23T15:00:00.000Z", storedPunchDate: "2026-09-23", jobId: "10" }),
    punch({ id: "j2", punchType: "clock_out", punchTimeIso: "2026-09-23T19:00:00.000Z", storedPunchDate: "2026-09-23", jobId: "10" }),
    punch({ id: "j3", punchType: "clock_in", punchTimeIso: "2026-09-23T20:00:00.000Z", storedPunchDate: "2026-09-23", jobId: "11", jobNumber: "200", jobName: "Roof" }),
    punch({ id: "j4", punchType: "clock_out", punchTimeIso: "2026-09-23T23:00:00.000Z", storedPunchDate: "2026-09-23", jobId: "11", jobNumber: "200", jobName: "Roof" }),
  ],
  { from: "2026-09-23", to: "2026-09-23" }
);
const kept = filterTimeClockRows(twoJobs.rows, { jobId: "11" });
assert.equal(kept.length, 1);
assert.equal(formatDurationHours(kept[0].workMs), "3.00");
assert.equal(formatDurationHours(twoJobs.rows.find((row) => row.jobId === "11").workMs), "3.00");
assert.equal(formatDurationHours(twoJobs.rows.find((row) => row.jobId === "10").workMs), "4.00");
assert.equal(twoJobs.rows.find((row) => row.jobId === "10").regularHours === twoJobs.rows.find((row) => row.jobId === "11").regularHours, false);

const csvFields = reviewShiftCsvFields(day.rows[0]);
assert.equal(csvFields[7], "8.00");
assert.equal(csvFields[9], "8.00");
assert.equal(csvFields[10], "0.00");
assert.equal(csvFields[11], "");
assert.equal(csvFields[12], "");
const formulaName = punch({
  id: "f-in",
  punchType: "clock_in",
  punchTimeIso: "2026-09-23T15:00:00.000Z",
  storedPunchDate: "2026-09-23",
  employee: '=cmd|"Ada"',
  jobName: "+roof",
});
const formulaOut = punch({
  id: "f-out",
  punchType: "clock_out",
  punchTimeIso: "2026-09-23T23:00:00.000Z",
  storedPunchDate: "2026-09-23",
  employee: '=cmd|"Ada"',
  jobName: "+roof",
});
const formulaReview = reviewTimePunches([formulaName, formulaOut], { from: "2026-09-23", to: "2026-09-23" });
const csv = reviewRowsToCsv(formulaReview.rows);
assert.equal(csvCell('=cmd|"Ada"'), `"'=cmd|""Ada"""`);
assert.match(csv, /"'=cmd\|""Ada"""/);
assert.match(csv, /"'\+roof"/);
assert.equal(csv.includes("8.00"), true);
assert.doesNotMatch(csv, /regular_hours","8/);
assert.equal(TIME_CLOCK_WRITES_AVAILABLE, false);
assert.equal(TIME_CLOCK_WRITES_REASON, "Saving is unavailable.");
assert.equal(timeClockWritesAvailable(), false);
const loadedPunch = {
  id: "punch-1",
  employeeId: "emp-1",
  jobId: "10",
  punchType: "clock_out",
  punchTimeIso: "2026-09-22T23:00:00.000Z",
  storedPunchDate: "2026-09-22",
};
const edited = timePunchCorrectionArgs({
  action: "edit",
  loaded: loadedPunch,
  draft: {
    employeeId: "emp-1",
    jobId: "10",
    punchType: "clock_out",
    stamp: "2026-09-23T01:00:00.000Z",
    date: "2026-09-22",
    reason: "corrected the clock-out",
  },
});
assert.equal(edited.p_punch_time, "2026-09-23T01:00:00.000Z");
assert.equal(edited.p_expected_punch_time, "2026-09-22T23:00:00.000Z");
const voided = timePunchCorrectionArgs({
  action: "void",
  loaded: loadedPunch,
  draft: { stamp: "2026-09-23T01:00:00.000Z", date: "2026-09-23", reason: "void the duplicate", employeeId: "other", jobId: "99", punchType: "clock_in" },
});
assert.equal(voided.p_punch_time, loadedPunch.punchTimeIso);
assert.equal(voided.p_expected_punch_time, loadedPunch.punchTimeIso);
assert.equal(voided.p_employee_id, "emp-1");
assert.equal(isolatedTimeClockEnabledFrom({
  VITE_TIME_CLOCK_ISOLATED: "1",
  VITE_SUPABASE_URL: "https://www.scmybiz.com",
}), false);
assert.equal(isolatedTimeClockEnabledFrom({
  VITE_TIME_CLOCK_ISOLATED: "1",
  VITE_SUPABASE_URL: "http://127.0.0.1:54321",
}), true);

assert.equal(mondayOf("2026-09-24"), "2026-09-21");
assert.equal(sundayOf("2026-09-24"), "2026-09-27");
assert.equal(mondayOf("2026-09-27"), "2026-09-21");
assert.equal(reviewFetchBounds("2026-09-25", "2026-09-25").weekFrom, "2026-09-21");
assert.equal(reviewFetchBounds("2026-09-25", "2026-09-25").from, "2026-09-19");
assert.equal(pacificLocalToIso("2026-09-23", "08:00"), "2026-09-23T15:00:00.000Z");
assert.equal(pacificTimeValue("2026-09-23T15:00:00.000Z"), "08:00");
assert.equal(cleanJobName("7215", "7215 — STY 4"), "STY 4");
assert.deepEqual(
  employeeChoices(
    [{ id: "e-new", name: "Bea", active: true }, { id: "e-off", name: "Gone", active: false }],
    [{ employeeId: "e1", employee: "Ada" }]
  ).map((option) => option.id),
  ["e1", "e-new"]
);

function weekPunch(id, type, iso, day, jobId = "10") {
  return punch({
    id,
    punchType: type,
    punchTimeIso: iso,
    storedPunchDate: day,
    jobId,
    jobNumber: jobId === "11" ? "200" : "100",
    jobName: jobId === "11" ? "Roof" : "Deck",
  });
}
const week = reviewTimePunches(
  [
    weekPunch("m-in", "clock_in", "2026-09-21T15:00:00.000Z", "2026-09-21"),
    weekPunch("m-out", "clock_out", "2026-09-22T01:00:00.000Z", "2026-09-21"),
    weekPunch("t-in", "clock_in", "2026-09-22T15:00:00.000Z", "2026-09-22"),
    weekPunch("t-out", "clock_out", "2026-09-23T01:00:00.000Z", "2026-09-22"),
    weekPunch("w-in", "clock_in", "2026-09-23T15:00:00.000Z", "2026-09-23"),
    weekPunch("w-out", "clock_out", "2026-09-24T01:00:00.000Z", "2026-09-23"),
    weekPunch("h-in", "clock_in", "2026-09-24T15:00:00.000Z", "2026-09-24"),
    weekPunch("h-out", "clock_out", "2026-09-25T01:00:00.000Z", "2026-09-24"),
    weekPunch("f-in", "clock_in", "2026-09-25T15:00:00.000Z", "2026-09-25"),
    weekPunch("f-out", "clock_out", "2026-09-25T17:00:00.000Z", "2026-09-25"),
  ],
  { from: "2026-09-25", to: "2026-09-25" }
);
assert.equal(week.rows.length, 1);
assert.equal(formatDurationHours(week.rows[0].workMs), "2.00");
assert.equal(week.rows[0].regularHours, "0.00");
assert.equal(week.rows[0].otHours, "2.00");
const filteredWeek = filterTimeClockRows(week.rows, { jobId: "10" });
assert.equal(filteredWeek[0].otHours, "2.00");

const blockedWeek = reviewTimePunches(
  [
    weekPunch("b-out", "clock_out", "2026-09-21T23:00:00.000Z", "2026-09-21"),
    weekPunch("b2-in", "clock_in", "2026-09-22T15:00:00.000Z", "2026-09-22"),
    weekPunch("b2-out", "clock_out", "2026-09-22T23:00:00.000Z", "2026-09-22"),
  ],
  { from: "2026-09-22", to: "2026-09-22" }
);
assert.equal(formatDurationHours(blockedWeek.rows[0].workMs), "8.00");
assert.equal(blockedWeek.rows[0].regularHours, "");
assert.equal(blockedWeek.rows[0].otHours, "");
assert.equal(blockedWeek.rows[0].statusLabel, STATUS_WEEK_INCOMPLETE);

const paidDrive = reviewTimePunches(
  [
    weekPunch("pd1", "drive_start", "2026-09-21T14:00:00.000Z", "2026-09-21"),
    weekPunch("pd2", "drive_end", "2026-09-21T17:00:00.000Z", "2026-09-21"),
    weekPunch("pd3", "clock_in", "2026-09-21T17:00:00.000Z", "2026-09-21"),
    weekPunch("pd4", "clock_out", "2026-09-23T07:00:00.000Z", "2026-09-23"),
  ],
  { from: "2026-09-21", to: "2026-09-21" }
);
assert.equal(formatDurationHours(paidDrive.rows[0].workMs), "38.00");
assert.equal(formatDurationHours(paidDrive.rows[0].driveMs), "3.00");
assert.equal(paidDrive.rows[0].regularHours, "40.00");
assert.equal(paidDrive.rows[0].otHours, "1.00");
assert.equal(paidDrive.rows[0].holidayHours, "");

const storedOrphan = reviewTimePunches(
  [
    weekPunch("so-out", "clock_out", "2026-09-20T06:00:00.000Z", "2026-09-21"),
    weekPunch("so-in", "clock_in", "2026-09-22T15:00:00.000Z", "2026-09-22"),
    weekPunch("so-end", "clock_out", "2026-09-22T23:00:00.000Z", "2026-09-22"),
  ],
  { from: "2026-09-22", to: "2026-09-22" }
);
assert.equal(storedOrphan.rows[0].regularHours, "");
assert.equal(storedOrphan.rows[0].statusLabel, STATUS_WEEK_INCOMPLETE);

console.log("PASS Time Clock: inclusive range, historical and missing joins, duplicate ids, null vs zero hours, unfamiliar types, full pages, query failure, and stale ranges.");
console.log("PASS Time Clock hours: lunch, overnight, missing events, drive, filters, CSV, and unavailable writes.");
