// Review CSV. Same shift rows as the screen. Classifications stay blank.

import { formatDurationHours } from "./timeClockHours.js";

export const REVIEW_CSV_HEADERS = [
  "employee_id",
  "employee_name",
  "shift_start_date",
  "job_id",
  "job_number",
  "job_name",
  "customer",
  "calculated_work_hours",
  "drive_duration",
  "regular_hours",
  "ot_hours",
  "double_time_hours",
  "status",
];

const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export function csvCell(value) {
  const raw = value == null ? "" : String(value);
  const safe = FORMULA_PREFIX.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function reviewShiftCsvFields(shift) {
  return [
    shift?.employeeId || "",
    shift?.employee || "",
    shift?.startDay || "",
    shift?.jobId || "",
    shift?.jobNumber || "",
    shift?.jobName || "",
    shift?.customer || "",
    formatDurationHours(shift?.workMs),
    formatDurationHours(shift?.driveMs),
    "",
    "",
    "",
    shift?.statusLabel || "",
  ];
}

export function reviewRowsToCsv(shifts) {
  const lines = [REVIEW_CSV_HEADERS.map(csvCell).join(",")];
  for (const shift of shifts || []) {
    lines.push(reviewShiftCsvFields(shift).map(csvCell).join(","));
  }
  return lines.join("\r\n");
}
