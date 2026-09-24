// Review-only shift hours. Screen and CSV both use this module.
// Nothing here writes hours_regular, hours_ot, or hours_drive.

import { pacificDate } from "./timeClock.js";

export const LUNCH_DEDUCTION_MS = 30 * 60 * 1000;

export const STATUS_CLASSIFICATION_PENDING = "Classification pending";
export const STATUS_INCOMPLETE = "Incomplete shift";
export const STATUS_AMBIGUOUS = "Ambiguous sequence";
export const STATUS_DRIVE_ONLY = "Drive only — pay status pending";

function eventMs(row) {
  if (!row?.punchTimeIso) return null;
  const ms = new Date(row.punchTimeIso).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function typeOf(row) {
  return String(row?.punchType || "").toLowerCase();
}

function byTime(a, b) {
  const am = eventMs(a);
  const bm = eventMs(b);
  if (am == null && bm == null) return String(a?.id).localeCompare(String(b?.id));
  if (am == null) return 1;
  if (bm == null) return -1;
  return am - bm || String(a?.id).localeCompare(String(b?.id));
}

function blankClassifications() {
  return { regularHours: "", otHours: "", doubleTimeHours: "" };
}

function baseRow(event) {
  return {
    employeeId: event?.employeeId || "",
    employee: event?.employee || "",
    jobId: event?.jobId || "",
    jobNumber: event?.jobNumber || "",
    jobName: event?.jobName || "",
    job: event?.job || "",
    customerId: event?.customerId || "",
    customer: event?.customer || "",
    workMs: null,
    driveMs: null,
    driveFlag: "",
    ...blankClassifications(),
  };
}

function startShift(event, ms) {
  return {
    ...baseRow(event),
    kind: "shift",
    key: `shift:${event.id}`,
    startMs: ms,
    endMs: null,
    startDay: pacificDate(event.punchTimeIso),
    punches: [event],
    lunchStart: null,
    lunchEnd: null,
    spoiled: false,
    status: "incomplete",
    statusLabel: STATUS_INCOMPLETE,
  };
}

function markAmbiguous(shift) {
  shift.spoiled = true;
  shift.workMs = null;
  shift.status = "ambiguous";
  shift.statusLabel = STATUS_AMBIGUOUS;
}

function sameJob(shift, event) {
  return String(shift.jobId || "") === String(event?.jobId || "");
}

function closeShift(shift, event, outMs) {
  shift.punches.push(event);
  shift.endMs = outMs;
  if (shift.spoiled || !sameJob(shift, event)) {
    markAmbiguous(shift);
    return;
  }
  const span = outMs - shift.startMs;
  if (!Number.isFinite(span) || span < 0) {
    markAmbiguous(shift);
    return;
  }
  let deduct = 0;
  if (shift.lunchStart) {
    const lunchMs = eventMs(shift.lunchStart);
    if (lunchMs == null || lunchMs < shift.startMs || lunchMs > outMs || !sameJob(shift, shift.lunchStart)) {
      markAmbiguous(shift);
      return;
    }
    if (shift.lunchEnd) {
      const endMs = eventMs(shift.lunchEnd);
      if (endMs == null || endMs < lunchMs || endMs > outMs || !sameJob(shift, shift.lunchEnd)) {
        markAmbiguous(shift);
        return;
      }
    }
    deduct = LUNCH_DEDUCTION_MS;
  }
  const work = span - deduct;
  if (work < 0) {
    markAmbiguous(shift);
    return;
  }
  shift.workMs = work;
  shift.status = "classification_pending";
  shift.statusLabel = STATUS_CLASSIFICATION_PENDING;
}

function employeeKey(row) {
  return row?.employeeId ? `employee:${row.employeeId}` : `punch:${row?.id}`;
}

function walkEmployee(events) {
  const shifts = [];
  const drives = [];
  let open = null;
  let drive = null;

  function parkShift() {
    if (!open) return;
    if (open.spoiled) markAmbiguous(open);
    else {
      open.workMs = null;
      open.status = "incomplete";
      open.statusLabel = STATUS_INCOMPLETE;
    }
    shifts.push(open);
    open = null;
  }

  function parkDrive() {
    if (!drive) return;
    drive.coherent = false;
    drive.durationMs = null;
    drives.push(drive);
    drive = null;
  }

  for (const event of events) {
    const type = typeOf(event);
    const ms = eventMs(event);
    if (ms == null) continue;
    if (type === "clock_in") {
      const overlapped = !!open;
      if (open) {
        markAmbiguous(open);
        shifts.push(open);
        open = null;
      }
      open = startShift(event, ms);
      if (!open.startDay || overlapped) markAmbiguous(open);
    } else if (type === "clock_out") {
      if (!open) continue;
      closeShift(open, event, ms);
      shifts.push(open);
      open = null;
    } else if (type === "lunch_start") {
      if (!open || open.lunchStart || !sameJob(open, event)) {
        if (open) {
          open.punches.push(event);
          markAmbiguous(open);
          shifts.push(open);
          open = null;
        }
      } else {
        open.lunchStart = event;
        open.punches.push(event);
      }
    } else if (type === "lunch_end") {
      if (!open || !open.lunchStart || open.lunchEnd || !sameJob(open, event)) {
        if (open) {
          open.punches.push(event);
          markAmbiguous(open);
          shifts.push(open);
          open = null;
        }
      } else {
        open.lunchEnd = event;
        open.punches.push(event);
      }
    } else if (type === "drive_start") {
      const overlapped = !!drive;
      if (drive) parkDrive();
      drive = {
        ...baseRow(event),
        kind: "drive",
        key: `drive:${event.id}`,
        startMs: ms,
        startDay: pacificDate(event.punchTimeIso),
        punches: [event],
        coherent: true,
        durationMs: null,
        overlapped,
      };
    } else if (type === "drive_end") {
      if (!drive || !sameJob(drive, event)) {
        parkDrive();
        continue;
      }
      drive.punches.push(event);
      const duration = ms - drive.startMs;
      if (!drive.startDay || duration < 0 || drive.overlapped) {
        drive.coherent = false;
        drive.durationMs = null;
      } else {
        drive.durationMs = duration;
      }
      drives.push(drive);
      drive = null;
    } else if (open) {
      open.punches.push(event);
      markAmbiguous(open);
      shifts.push(open);
      open = null;
    }
  }
  parkShift();
  parkDrive();
  return { shifts, drives };
}

function findShift(drive, shifts) {
  const candidates = shifts.filter(
    (shift) =>
      shift.kind === "shift" &&
      shift.employeeId === drive.employeeId &&
      String(shift.jobId || "") === String(drive.jobId || "") &&
      shift.startDay &&
      shift.startDay === drive.startDay
  );
  if (!candidates.length) return null;
  const containing = candidates.find(
    (shift) => shift.startMs != null && shift.endMs != null && drive.startMs >= shift.startMs && drive.startMs <= shift.endMs
  );
  if (containing) return containing;
  const prior = candidates.filter((shift) => shift.startMs != null && shift.startMs <= drive.startMs);
  if (prior.length) return prior[prior.length - 1];
  return candidates[0];
}

function attachDrives(shifts, drives) {
  const loose = [];
  for (const drive of drives) {
    const match = findShift(drive, shifts);
    if (match) {
      match.punches.push(...drive.punches);
      match.punches.sort(byTime);
      if (drive.coherent && drive.durationMs != null && drive.durationMs >= 0 && !match.driveSpoiled) {
        match.driveMs = (match.driveMs || 0) + drive.durationMs;
      } else {
        match.driveMs = null;
        match.driveSpoiled = true;
        match.driveFlag = "Incomplete drive";
      }
    } else if (drive.coherent && drive.durationMs != null && drive.startDay) {
      loose.push({
        ...drive,
        punches: drive.punches.slice().sort(byTime),
        workMs: null,
        driveMs: drive.durationMs,
        status: "drive_only",
        statusLabel: STATUS_DRIVE_ONLY,
      });
    } else if (drive.startDay) {
      loose.push({
        ...drive,
        punches: drive.punches.slice().sort(byTime),
        workMs: null,
        driveMs: null,
        driveFlag: "Incomplete drive",
        status: "ambiguous",
        statusLabel: STATUS_AMBIGUOUS,
      });
    }
  }
  return loose;
}

function unassignedRow(event) {
  const day = pacificDate(event.punchTimeIso) || event.storedPunchDate || "";
  return {
    ...baseRow(event),
    kind: "unassigned",
    key: `punch:${event.id}`,
    startMs: eventMs(event),
    endMs: null,
    startDay: day,
    punches: [event],
    status: "ambiguous",
    statusLabel: STATUS_AMBIGUOUS,
  };
}

function inDisplayRange(day, from, to) {
  return typeof day === "string" && day >= from && day <= to;
}

export function formatDurationHours(ms) {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return "";
  return (Math.round(ms / 36000) / 100).toFixed(2);
}

export function reviewTimePunches(rows, { from, to } = {}) {
  const groups = new Map();
  for (const row of rows || []) {
    const key = employeeKey(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  const built = [];
  for (const events of groups.values()) {
    const ordered = events.slice().sort(byTime);
    const walked = walkEmployee(ordered);
    const loose = attachDrives(walked.shifts, walked.drives);
    built.push(...walked.shifts, ...loose);
  }
  const displayed = built.filter((row) => inDisplayRange(row.startDay, from, to));
  const covered = new Set();
  for (const row of displayed) {
    for (const punch of row.punches || []) covered.add(punch.id);
  }
  for (const row of rows || []) {
    if (!row?.id || covered.has(row.id)) continue;
    const stored = row.storedPunchDate;
    if (!inDisplayRange(stored, from, to)) continue;
    const extra = unassignedRow(row);
    displayed.push(extra);
    covered.add(row.id);
  }
  displayed.sort(
    (a, b) =>
      String(a.employee || "").localeCompare(String(b.employee || ""), undefined, { numeric: true }) ||
      String(a.startDay || "").localeCompare(String(b.startDay || "")) ||
      String(a.jobNumber || "").localeCompare(String(b.jobNumber || ""), undefined, { numeric: true }) ||
      String(a.key).localeCompare(String(b.key))
  );
  return { rows: displayed };
}
