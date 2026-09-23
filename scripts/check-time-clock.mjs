import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  MISSING_CUSTOMER,
  MISSING_EMPLOYEE,
  MISSING_JOB,
  TIME_PUNCH_ORDER,
  TIME_PUNCH_SELECT,
  assertPunchDateRange,
  createPunchRequestGuard,
  filterTimeClockRows,
  formatStoredHours,
  initialPunchLoad,
  loadTimeClockPunches,
  pacificToday,
  punchFilterOptions,
  punchTypeLabel,
  readAllOrderedPages,
  reducePunchLoad,
  shapeTimePunch,
} from "../src/field/lib/timeClock.js";

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
assert.equal(view.includes("fetchTimeClockPunches"), true);
assert.equal(queries.includes("export function fetchTimeClockPunches"), true);
assert.equal(queries.includes("export async function fetchTodayRows"), true);
assert.equal(queries.includes("async function fetchActiveFieldJobs"), true);
const todayBlock = queries.slice(queries.indexOf("export async function fetchTodayRows"), queries.indexOf("export async function fetchFieldJobs"));
assert.equal(todayBlock.includes("loadTimeClockPunches"), false);
const activeBlock = queries.slice(queries.indexOf("async function fetchActiveFieldJobs"), queries.indexOf("export async function fetchFieldThresholds"));
assert.equal(activeBlock.includes("loadTimeClockPunches"), false);

console.log("PASS Time Clock: inclusive range, historical and missing joins, duplicate ids, null vs zero hours, unfamiliar types, full pages, query failure, and stale ranges.");
