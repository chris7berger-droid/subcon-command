import { reviewTimePunches, STATUS_IN_PROGRESS, timeClockScoreboard } from "./timeClockHours.js";
import { filterTimeClockRows } from "./timeClock.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

let seq = 0;
function punch(employeeId, day, time, punchType, jobId = "j1") {
  seq += 1;
  return {
    id: `p${seq}`,
    employeeId,
    employee: employeeId.toUpperCase(),
    jobId,
    customerId: jobId === "j1" ? "c1" : "c2",
    punchType,
    punchTimeIso: `${day}T${time}:00-07:00`,
    storedPunchDate: day,
  };
}

function fullDay(employeeId, day, jobId) {
  return [
    punch(employeeId, day, "07:00", "clock_in", jobId),
    punch(employeeId, day, "12:00", "lunch_start", jobId),
    punch(employeeId, day, "12:30", "lunch_end", jobId),
    punch(employeeId, day, "16:00", "clock_out", jobId),
  ];
}

const days = ["2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24", "2026-09-25"];
const punches = [
  // a: 5 × 8.5 paid = 42.5 → 40 regular, 2.5 OT
  ...days.flatMap((day) => fullDay("a", day, "j1")),
  // b: one complete shift, then a clock-in with no clock-out → whole week blank
  ...fullDay("b", "2026-09-21", "j2"),
  punch("b", "2026-09-22", "07:00", "clock_in", "j2"),
  // c: clocked in today, no clock-out yet
  punch("c", "2026-09-25", "06:30", "clock_in", "j1"),
];

const { rows } = reviewTimePunches(punches, { from: "2026-09-21", to: "2026-09-25", today: "2026-09-25" });
const all = timeClockScoreboard(rows);
assert(all.crewCount === 3, `crew count 3, got ${all.crewCount}`);
assert(all.punchedIn === 1, `punched in 1, got ${all.punchedIn}`);
assert(rows.some((row) => row.statusLabel === STATUS_IN_PROGRESS && row.employeeId === "c"), "c is in progress");
assert(all.crewOnOt === 1, `crew on OT 1, got ${all.crewOnOt}`);
assert(all.regularHours === "40.00", `regular 40.00, got ${all.regularHours}`);
assert(all.otHours === "2.50", `OT 2.50, got ${all.otHours}`);
assert(all.notCounted === 3, `3 shifts not counted (b ×2, c ×1), got ${all.notCounted}`);

// Totals equal the displayed column sums.
const colSum = (key) => rows.reduce((sum, row) => sum + Number(row[key] || 0), 0).toFixed(2);
assert(colSum("regularHours") === all.regularHours, "regular matches column sum");
assert(colSum("otHours") === all.otHours, "OT matches column sum");

// Same filters as the table: job j2 → only b.
const j2 = timeClockScoreboard(filterTimeClockRows(rows, { jobId: "j2", employeeId: "", customerId: "" }));
assert(j2.crewCount === 1 && j2.punchedIn === 0 && j2.crewOnOt === 0, "job filter narrows crew");
assert(j2.regularHours === "0.00" && j2.otHours === "0.00" && j2.notCounted === 2, "job filter narrows hours");

// Narrower date range keeps the weekly classification: Friday alone is a's OT day.
const fri = timeClockScoreboard(reviewTimePunches(punches, { from: "2026-09-25", to: "2026-09-25", today: "2026-09-25" }).rows);
assert(fri.crewOnOt === 1 && fri.regularHours === "6.00" && fri.otHours === "2.50", `Friday split 6.00/2.50, got ${fri.regularHours}/${fri.otHours}`);

const empty = timeClockScoreboard([]);
assert(empty.crewCount === 0 && empty.regularHours === "0.00" && empty.notCounted === 0, "empty rows");

console.log("timeClockScoreboard assertions passed");
