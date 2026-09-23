// Office Time Clock read. Punches are identified from time_punches itself.
// job_id → call_log.id, employee_id → team_members.id. Related rows are
// left-resolved for labels only. No duration, lunch, overtime, or paid-hours math.

export const MISSING_EMPLOYEE = "Missing employee";
export const MISSING_JOB = "Missing job";
export const MISSING_CUSTOMER = "Missing customer";

export const TIME_PUNCH_PAGE_SIZE = 1000;

export const TIME_PUNCH_SELECT = [
  "id",
  "punch_date",
  "punch_time",
  "punch_type",
  "hours_regular",
  "hours_ot",
  "job_id",
  "employee_id",
  "team_members:employee_id(id,name)",
  "call_log:job_id(id,display_job_number,job_number,job_name,customer_id,customer_name)",
].join(",");

// Stable page order. The punch id is last so a tie cannot skip or repeat a row.
export const TIME_PUNCH_ORDER = [
  ["punch_date", { ascending: true, nullsFirst: true }],
  ["punch_time", { ascending: true, nullsFirst: true }],
  ["id", { ascending: true }],
];

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function isIsoDate(value) {
  if (typeof value !== "string" || !ISO_DAY.test(value)) return false;
  const [, yearText, monthText, dayText] = value.match(ISO_DAY);
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function assertPunchDateRange(from, to) {
  if (from == null || from === "" || to == null || to === "") {
    throw new Error("Enter both a start date and an end date.");
  }
  if (!isIsoDate(from) || !isIsoDate(to)) {
    throw new Error("Enter real calendar dates.");
  }
  if (from > to) {
    throw new Error("Start date must be on or before the end date.");
  }
  return { from, to };
}

export function pacificToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function formatWorkDate(value) {
  if (!isIsoDate(value)) return value ? String(value) : "—";
  const [, , monthText, dayText] = value.match(ISO_DAY);
  const year = value.slice(0, 4);
  return `${MONTHS[Number(monthText) - 1]} ${Number(dayText)}, ${year}`;
}

export function formatPacificPunch(iso) {
  if (!iso) return { date: "—", time: "—" };
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { date: "—", time: "—" };
  return {
    date: new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date),
    time: new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      hour: "numeric",
      minute: "2-digit",
    }).format(date),
  };
}

export function formatStoredHours(value) {
  if (value == null || value === "") return "";
  return String(value);
}

export function punchTypeLabel(type) {
  if (type == null || type === "") return "—";
  const raw = String(type);
  const key = raw.toLowerCase();
  if (key === "clock_in") return "Clock in";
  if (key === "clock_out") return "Clock out";
  return raw.replace(/_/g, " ");
}

export function punchTypeTone(type) {
  const key = String(type || "").toLowerCase();
  if (key === "clock_in") return "teal";
  if (key === "clock_out") return "red";
  return "muted";
}

function idString(value) {
  if (value == null || value === "") return null;
  return String(value);
}

function trimmed(value) {
  return typeof value === "string" ? value.trim() : "";
}

function employeeLabel(name, employeeId) {
  const clean = trimmed(name);
  if (clean) return clean;
  return idString(employeeId) || MISSING_EMPLOYEE;
}

function jobLabel(callLog, jobId) {
  const number = trimmed(callLog?.display_job_number) || (callLog?.job_number == null ? "" : String(callLog.job_number));
  const name = trimmed(callLog?.job_name);
  const parts = [number, name].filter(Boolean);
  if (parts.length) return parts.join(" — ");
  return idString(jobId) || idString(callLog?.id) || MISSING_JOB;
}

function customerLabel(callLog) {
  const name = trimmed(callLog?.customer_name);
  if (name) return name;
  return idString(callLog?.customer_id) || MISSING_CUSTOMER;
}

export function shapeTimePunch(row) {
  const callLog = row?.call_log || null;
  const member = row?.team_members || null;
  const pacific = formatPacificPunch(row?.punch_time);
  return {
    id: row?.id,
    workDate: formatWorkDate(row?.punch_date),
    punchDate: isIsoDate(pacific.date) ? formatWorkDate(pacific.date) : pacific.date,
    punchTime: pacific.time,
    employeeId: idString(row?.employee_id),
    employee: employeeLabel(member?.name, row?.employee_id),
    jobId: idString(row?.job_id),
    job: jobLabel(callLog, row?.job_id),
    customerId: idString(callLog?.customer_id),
    customer: customerLabel(callLog),
    punchType: row?.punch_type ?? "",
    hoursRegular: formatStoredHours(row?.hours_regular),
    hoursOt: formatStoredHours(row?.hours_ot),
  };
}

export function filterTimeClockRows(rows, { jobId = "", employeeId = "", customerId = "" } = {}) {
  const job = idString(jobId);
  const employee = idString(employeeId);
  const customer = idString(customerId);
  return (rows || []).filter((row) => {
    if (job && row.jobId !== job) return false;
    if (employee && row.employeeId !== employee) return false;
    if (customer && row.customerId !== customer) return false;
    return true;
  });
}

export function punchFilterOptions(rows, idKey, labelKey) {
  const byId = new Map();
  for (const row of rows || []) {
    const id = idString(row?.[idKey]);
    if (!id || byId.has(id)) continue;
    byId.set(id, trimmed(row?.[labelKey]) || id);
  }
  const counts = new Map();
  for (const label of byId.values()) counts.set(label, (counts.get(label) || 0) + 1);
  return [...byId.entries()]
    .map(([id, label]) => ({
      id,
      label: counts.get(label) > 1 ? `${label} · ${id}` : label,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }) || a.id.localeCompare(b.id));
}

export function timePunchPageQuery(client, { from, to, pageFrom, pageTo }) {
  const range = assertPunchDateRange(from, to);
  let query = client.from("time_punches").select(TIME_PUNCH_SELECT);
  query = query.gte("punch_date", range.from).lte("punch_date", range.to);
  for (const [column, options] of TIME_PUNCH_ORDER) query = query.order(column, options);
  return query.range(pageFrom, pageTo);
}

export async function readAllOrderedPages(fetchPage, { pageSize = TIME_PUNCH_PAGE_SIZE } = {}) {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new Error("Time punch query failed");
  }
  const all = [];
  let from = 0;
  for (;;) {
    const page = await fetchPage({ from, to: from + pageSize - 1 });
    if (!page || page.error) {
      throw new Error(page?.error?.message || "Time punch query failed");
    }
    if (!Array.isArray(page.data)) throw new Error("Time punch query failed");
    all.push(...page.data);
    if (page.data.length < pageSize) return all;
    from += pageSize;
  }
}

export async function loadTimeClockPunches(client, { from, to, pageSize = TIME_PUNCH_PAGE_SIZE } = {}) {
  assertPunchDateRange(from, to);
  const raw = await readAllOrderedPages(
    ({ from: pageFrom, to: pageTo }) => timePunchPageQuery(client, { from, to, pageFrom, pageTo }),
    { pageSize }
  );
  return raw.map(shapeTimePunch);
}

export const initialPunchLoad = {
  requestId: 0,
  rangeKey: "",
  rows: [],
  error: null,
  loading: false,
  publishedRangeKey: null,
};

// Older range responses are ignored. A new range clears published rows first.
export function reducePunchLoad(state, action) {
  if (action.type === "start") {
    return {
      requestId: action.requestId,
      rangeKey: action.rangeKey,
      rows: [],
      error: null,
      loading: true,
      publishedRangeKey: null,
    };
  }
  if (action.requestId !== state.requestId) return state;
  if (action.type === "success") {
    return {
      ...state,
      loading: false,
      error: null,
      rows: action.rows,
      publishedRangeKey: state.rangeKey,
    };
  }
  if (action.type === "failure") {
    return {
      ...state,
      loading: false,
      error: action.error || "Time punch query failed",
      rows: [],
      publishedRangeKey: null,
    };
  }
  return state;
}

export function createPunchRequestGuard() {
  let current = 0;
  return {
    start() {
      current += 1;
      return current;
    },
  };
}
