// Review-only shift hours. Screen and CSV both use this module.
// Nothing here writes hours_regular, hours_ot, or hours_drive.

import { formatPacificPunch, formatWorkDate, mondayOf, pacificDate, sundayOf } from "./timeClock.js";

export const LUNCH_DEDUCTION_MS = 30 * 60 * 1000;
export const WEEKLY_REGULAR_MS = 40 * 60 * 60 * 1000;

export const STATUS_INCOMPLETE = "Missing clock-out";
export const STATUS_IN_PROGRESS = "In progress";
export const STATUS_OVERLAP = "Overlapping clock-ins";
export const STATUS_WEEK_INCOMPLETE = "Week has a missing punch";

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
  return { regularHours: "", otHours: "", holidayHours: "" };
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

function markAmbiguous(shift, label) {
  if (!shift.spoiled && label) shift.statusLabel = label;
  shift.spoiled = true;
  shift.workMs = null;
  shift.status = "ambiguous";
}

function sameJob(shift, event) {
  return String(shift.jobId || "") === String(event?.jobId || "");
}

function closeShift(shift, event, outMs) {
  shift.punches.push(event);
  shift.endMs = outMs;
  if (shift.spoiled) {
    markAmbiguous(shift, shift.statusLabel);
    return;
  }
  if (!sameJob(shift, event)) {
    markAmbiguous(shift, "Clock-out is on a different job");
    return;
  }
  const span = outMs - shift.startMs;
  if (!Number.isFinite(span) || span < 0) {
    markAmbiguous(shift, "Clock-out is before clock-in");
    return;
  }
  let deduct = 0;
  if (shift.lunchStart) {
    const lunchMs = eventMs(shift.lunchStart);
    if (lunchMs == null || lunchMs < shift.startMs || lunchMs > outMs || !sameJob(shift, shift.lunchStart)) {
      markAmbiguous(shift, "Lunch is outside the shift");
      return;
    }
    if (shift.lunchEnd) {
      const endMs = eventMs(shift.lunchEnd);
      if (endMs == null || endMs < lunchMs || endMs > outMs || !sameJob(shift, shift.lunchEnd)) {
        markAmbiguous(shift, "Lunch end is outside the shift");
        return;
      }
    }
    deduct = LUNCH_DEDUCTION_MS;
  }
  const work = span - deduct;
  if (work < 0) {
    markAmbiguous(shift, "Lunch is longer than the shift");
    return;
  }
  shift.workMs = work;
  shift.status = "ready";
  shift.statusLabel = "";
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
    if (open.spoiled) markAmbiguous(open, open.statusLabel);
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
      const previous = open;
      if (open) {
        shifts.push(open);
        open = null;
      }
      open = startShift(event, ms);
      if (!open.startDay) markAmbiguous(open, "Missing punch time");
      if (previous) {
        markAmbiguous(previous, STATUS_OVERLAP);
        markAmbiguous(open, STATUS_OVERLAP);
        previous.statusLabel = STATUS_OVERLAP;
        open.statusLabel = STATUS_OVERLAP;
        previous.overlapKey = open.key;
        open.overlapKey = previous.key;
      }
    } else if (type === "clock_out") {
      if (!open) continue;
      closeShift(open, event, ms);
      shifts.push(open);
      open = null;
    } else if (type === "lunch_start") {
      if (!open || open.lunchStart || !sameJob(open, event)) {
        if (open) {
          open.punches.push(event);
          markAmbiguous(open, !sameJob(open, event) ? "Lunch out is on a different job" : "Another lunch out is already recorded");
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
          const label = !open.lunchStart
            ? "Lunch in without a lunch out"
            : !sameJob(open, event)
              ? "Lunch in is on a different job"
              : "Another lunch in is already recorded";
          open.punches.push(event);
          markAmbiguous(open, label);
          shifts.push(open);
          open = null;
        }
      } else {
        open.lunchEnd = event;
        open.punches.push(event);
      }
    } else if (type === "drive_start") {
      const overlapped = !!drive;
      if (drive) {
        drive.reason = "Another drive is still open";
        parkDrive();
      }
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
        drive.reason = drive.overlapped ? "Another drive is still open" : "Drive end is before drive start";
      } else {
        drive.durationMs = duration;
      }
      drives.push(drive);
      drive = null;
    } else if (open) {
      open.punches.push(event);
      markAmbiguous(open, "Unrecognized punch in the shift");
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
        match.driveFlag = drive.reason || "Missing drive end";
      }
    } else if (drive.coherent && drive.durationMs != null && drive.startDay) {
      loose.push({
        ...drive,
        punches: drive.punches.slice().sort(byTime),
        workMs: null,
        driveMs: drive.durationMs,
        status: "drive_only",
        statusLabel: "",
      });
    } else if (drive.startDay) {
      loose.push({
        ...drive,
        punches: drive.punches.slice().sort(byTime),
        workMs: null,
        driveMs: null,
        driveFlag: drive.reason || "Missing drive end",
        status: "ambiguous",
        statusLabel: drive.reason || "Missing drive end",
      });
    }
  }
  return loose;
}

function loosePunchLabel(type) {
  if (type === "clock_out") return "Clock-out without a clock-in";
  if (type === "lunch_start") return "Lunch out without a clock-in";
  if (type === "lunch_end") return "Lunch in without a clock-in";
  if (type === "drive_end") return "Drive end without a drive start";
  if (type === "clock_in") return "Missing clock-out";
  return "Punch is not part of a shift";
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
    statusLabel: loosePunchLabel(typeOf(event)),
  };
}

function isClassifiable(row) {
  if (row.driveFlag || row.driveSpoiled) return false;
  if (row.kind === "drive" || row.status === "drive_only") return row.driveMs != null;
  if (row.workMs == null) return false;
  return row.status === "ready";
}

function paidMs(row) {
  if (row.kind === "drive" || row.status === "drive_only") return row.driveMs || 0;
  return (row.workMs || 0) + (row.driveMs || 0);
}

function classifyWeeks(rows, weekFrom, weekTo) {
  const groups = new Map();
  for (const row of rows) {
    const stored = row.punches?.[0]?.storedPunchDate || "";
    const day = row.startDay >= weekFrom && row.startDay <= weekTo
      ? row.startDay
      : (stored >= weekFrom && stored <= weekTo ? stored : "");
    if (!day) continue;
    const key = `${row.employeeId}|${mondayOf(day)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  for (const group of groups.values()) {
    if (group.some((row) => !isClassifiable(row))) {
      for (const row of group) {
        row.regularHours = "";
        row.otHours = "";
        row.holidayHours = "";
        if (isClassifiable(row)) row.statusLabel = STATUS_WEEK_INCOMPLETE;
      }
      continue;
    }
    group.sort((a, b) => (a.startMs || 0) - (b.startMs || 0) || String(a.key).localeCompare(String(b.key)));
    let regularLeft = WEEKLY_REGULAR_MS;
    for (const row of group) {
      const paid = paidMs(row);
      const regular = Math.min(regularLeft, paid);
      regularLeft -= regular;
      row.regularHours = formatDurationHours(regular);
      row.otHours = formatDurationHours(paid - regular);
      row.holidayHours = "";
      if (!row.statusLabel) row.statusLabel = "";
    }
  }
}

function inDisplayRange(day, from, to) {
  return typeof day === "string" && day >= from && day <= to;
}

function jobPhrase(row) {
  const parts = [row?.jobNumber, row?.jobName].filter(Boolean);
  return parts.length ? parts.join(" ") : "Unassigned job";
}

function punchOfType(row, type) {
  return (row?.punches || []).find((punch) => String(punch?.punchType || "").toLowerCase() === type) || null;
}

function recordedWhen(punch) {
  if (!punch?.punchTimeIso) return "";
  const parts = formatPacificPunch(punch.punchTimeIso);
  if (!parts?.time || parts.time === "—") return "";
  return `${parts.time} on ${formatWorkDate(parts.date)}`;
}

function startedAt(row) {
  return recordedWhen(punchOfType(row, "clock_in") || row?.punches?.[0]) || "an unknown time";
}

function overlapSentence(a, b) {
  const first = (a.startMs || 0) <= (b.startMs || 0) ? a : b;
  const second = first === a ? b : a;
  const firstJob = jobPhrase(first);
  const secondJob = jobPhrase(second);
  return `${STATUS_OVERLAP}: ${firstJob} started at ${startedAt(first)}; ${secondJob} started at ${startedAt(second)} before ${firstJob} was closed.`;
}

function explainRow(row, byKey, today) {
  const peer = row.overlapKey ? byKey.get(row.overlapKey) : null;
  if (peer) {
    row.statusLabel = STATUS_OVERLAP;
    row.statusDetail = overlapSentence(row, peer);
    row.reviewKeys = [row.key, peer.key];
    return;
  }
  if (row.status === "incomplete" && row.statusLabel === STATUS_INCOMPLETE) {
    const job = jobPhrase(row);
    const when = startedAt(row);
    if (today && row.startDay === today) {
      row.statusLabel = STATUS_IN_PROGRESS;
      row.statusDetail = `Clocked in at ${job} at ${when}. No clock-out yet.`;
    } else {
      row.statusDetail = `Clocked in at ${job} at ${when}. No clock-out was recorded.`;
    }
    return;
  }
  if (row.statusLabel === STATUS_WEEK_INCOMPLETE) {
    row.statusDetail = "Regular and overtime stay blank because another punch in this week is missing or conflicting.";
    return;
  }
  if (row.statusLabel === "Lunch is longer than the shift") {
    const when = recordedWhen(punchOfType(row, "lunch_start"));
    row.statusDetail = when
      ? `Lunch out at ${jobPhrase(row)} was recorded at ${when}. The 30-minute deduction is longer than the shift, so hours stay blank.`
      : row.statusLabel;
    return;
  }
  if (row.statusLabel === "Clock-out without a clock-in") {
    const when = recordedWhen(punchOfType(row, "clock_out") || row.punches?.[0]);
    row.statusDetail = when
      ? `Clock-out at ${jobPhrase(row)} was recorded at ${when} and has no clock-in.`
      : row.statusLabel;
    return;
  }
  if (row.statusLabel) row.statusDetail = row.statusDetail || row.statusLabel;
}

export function formatDurationHours(ms) {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return "";
  return (Math.round(ms / 36000) / 100).toFixed(2);
}

export function reviewTimePunches(rows, { from, to, today = "" } = {}) {
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
  const weekFrom = mondayOf(from);
  const weekTo = sundayOf(to);
  const covered = new Set();
  for (const row of built) {
    for (const punch of row.punches || []) covered.add(punch.id);
  }
  const weekPunches = [];
  for (const row of rows || []) {
    if (!row?.id || covered.has(row.id)) continue;
    const stored = row.storedPunchDate;
    if (!inDisplayRange(stored, weekFrom, weekTo)) continue;
    const extra = unassignedRow(row);
    weekPunches.push(extra);
    covered.add(row.id);
  }
  const weekRows = built.filter((row) => inDisplayRange(row.startDay, weekFrom, weekTo)).concat(weekPunches);
  classifyWeeks(weekRows, weekFrom, weekTo);
  const displayed = weekRows.filter((row) => {
    if (row.kind === "unassigned") return inDisplayRange(row.punches?.[0]?.storedPunchDate, from, to);
    return inDisplayRange(row.startDay, from, to);
  });
  displayed.sort(
    (a, b) =>
      String(a.employee || "").localeCompare(String(b.employee || ""), undefined, { numeric: true }) ||
      String(a.startDay || "").localeCompare(String(b.startDay || "")) ||
      String(a.jobNumber || "").localeCompare(String(b.jobNumber || ""), undefined, { numeric: true }) ||
      String(a.key).localeCompare(String(b.key))
  );
  const byKey = new Map(weekRows.map((row) => [row.key, row]));
  for (const row of displayed) explainRow(row, byKey, today);
  return { rows: displayed };
}
