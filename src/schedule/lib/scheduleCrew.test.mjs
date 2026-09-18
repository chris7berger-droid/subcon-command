import { crewLeadNames } from "./crewLeads.js";
import { crewWeekCapacity } from "./crewScheduleRows.js";
import {
  activeScheduleCrew,
  archivedOnOf,
  canAssignScheduleCrewOnDate,
  canUnarchiveFromScheduler,
  isActiveScheduleCrew,
  isScheduleCrewOnDate,
  isTeamLinkedCrew,
  scheduleCrewOnDate,
  scheduleCrewForWeek,
} from "./scheduleCrew.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const linkedActive = { name: "Eligible Linked", archived: false, team_member_id: "tm-eligible" };
const linkedArchived = { name: "Ineligible Linked", archived: true, team_member_id: "tm-archived" };
const legacyUnlinked = { name: "Legacy Unlinked", archived: false, team_member_id: null };
const legacyArchived = { name: "Legacy Archived", archived: true, team_member_id: null };

assert(isTeamLinkedCrew(linkedActive) === true, "uuid link counts as linked");
assert(isTeamLinkedCrew(legacyUnlinked) === false, "null team_member_id is legacy");
assert(isTeamLinkedCrew({ team_member_id: "" }) === false, "blank team_member_id is not linked");

assert(isActiveScheduleCrew(linkedActive) === true, "1. LINKED + UNARCHIVED is an active choice");
assert(isActiveScheduleCrew(linkedArchived) === false, "2. LINKED + ARCHIVED is not an active choice");
assert(isActiveScheduleCrew(legacyUnlinked) === true, "3. LEGACY UNLINKED stays visible");
assert(isActiveScheduleCrew(legacyArchived) === false, "legacy archived stays hidden as before");

const mixed = activeScheduleCrew([linkedActive, linkedArchived, legacyUnlinked, legacyArchived]);
assert(mixed.map((p) => p.name).join("|") === "Eligible Linked|Legacy Unlinked", "4. mixed roster");
assert(
  crewLeadNames([linkedActive, linkedArchived, legacyUnlinked, legacyArchived]).join("|") === "Eligible Linked|Legacy Unlinked",
  "lead picker uses the same active roster",
);

const assignments = [
  { id: 11, crew_name: "Ineligible Linked", date: "2026-09-16", team_member_id: null },
  { id: 12, crew_name: "Legacy Unlinked", date: "2026-09-16", team_member_id: null },
];
const before = JSON.stringify(assignments);
activeScheduleCrew([linkedActive, linkedArchived, legacyUnlinked]);
assert(JSON.stringify(assignments) === before, "5. filtering does not mutate assignments");
assert(assignments.every((a) => a.team_member_id == null), "6. does not write assignments.team_member_id");
assert(linkedArchived.team_member_id === "tm-archived", "6. does not write crew.team_member_id");
assert(linkedArchived.archived === true, "7. does not archive/unarchive while filtering");
assert(canUnarchiveFromScheduler(linkedArchived) === false, "Team owns unarchive for linked crew");
assert(canUnarchiveFromScheduler(legacyArchived) === true, "legacy unarchive stays scheduler-owned");

// ── Chris's three archive-effective-date cases ─────────────────────────────
const adam = { name: "Little, Adam", archived: true, archived_on: "2026-09-17", team_member_id: null };
const jose = { name: "Jose", archived: true, archived_on: "2026-09-17", team_member_id: null };
const jesse = { name: "Ary, Jesse", archived: true, archived_on: "2026-09-18", team_member_id: null };
const ricky = { name: "Zorn, Ricky", archived: false, archived_on: null, team_member_id: null };

assert(isActiveScheduleCrew(adam) === false, "Adam is off the current roster");
assert(isActiveScheduleCrew(jose) === false, "Jose is off the current roster");
assert(isActiveScheduleCrew(jesse) === false, "Jesse is off the current roster");
assert(isActiveScheduleCrew(ricky) === true, "Ricky stays on the current roster");

assert(isScheduleCrewOnDate(adam, "2026-09-16", false) === true, "Adam visible before archive");
assert(isScheduleCrewOnDate(adam, "2026-09-17", true) === true, "Adam visible on 2026-09-17 with history");
assert(isScheduleCrewOnDate(adam, "2026-09-17", false) === false, "Adam not invented on archive day without history");
assert(isScheduleCrewOnDate(adam, "2026-09-18", true) === false, "Adam not on 2026-09-18+ roster");
assert(canAssignScheduleCrewOnDate(adam, "2026-09-16") === true, "Adam can still be assigned before archive");
assert(canAssignScheduleCrewOnDate(adam, "2026-09-17") === false, "Adam cannot take new assignments on/after archive");

assert(isScheduleCrewOnDate(jose, "2026-09-16", false) === true, "Jose visible before archive");
assert(isScheduleCrewOnDate(jose, "2026-09-17", true) === true, "Jose visible on 2026-09-17 with history");
assert(isScheduleCrewOnDate(jose, "2026-09-18", false) === false, "Jose not on 2026-09-18+ roster");

assert(isScheduleCrewOnDate(jesse, "2026-09-17", true) === true, "Jesse visible through 2026-09-17");
assert(isScheduleCrewOnDate(jesse, "2026-09-18", false) === false, "Jesse not on 2026-09-18 without history");
assert(isScheduleCrewOnDate(jesse, "2026-09-18", true) === true, "Jesse kept on archive day if he had history");
assert(isScheduleCrewOnDate(jesse, "2026-09-19", false) === false, "Jesse not on future roster");
assert(canAssignScheduleCrewOnDate(jesse, "2026-09-17") === true, "Jesse assignable before 2026-09-18");
assert(canAssignScheduleCrewOnDate(jesse, "2026-09-18") === false, "Jesse not assignable on/after archive");

assert(archivedOnOf({ name: "Little, Adam", archived: true }) === "2026-09-17", "known-date fallback for Adam");
assert(archivedOnOf({ name: "Jose", archived: true }) === "2026-09-17", "known-date fallback for Jose");
assert(archivedOnOf({ name: "Ary, Jesse", archived: true }) === "2026-09-18", "known-date fallback for Jesse");
assert(archivedOnOf({ name: "Ary, Jesse", archived: true, archived_on: "2026-09-18" }) === "2026-09-18", "stored date wins");
assert(archivedOnOf(legacyArchived) == null, "unknown legacy archive has no date");
assert(isScheduleCrewOnDate(legacyArchived, "2026-09-17", true) === false, "undated archive stays hidden");

const weekDates = ["2026-09-14", "2026-09-15", "2026-09-16", "2026-09-17", "2026-09-18", "2026-09-19"];
const history = {
  assignments: [
    { crew_name: "Little, Adam", date: "2026-09-17" },
    { crew_name: "Jose", date: "2026-09-17" },
    { crew_name: "Ary, Jesse", date: "2026-09-17" },
    { crew_name: "Zorn, Ricky", date: "2026-09-17" },
    { crew_name: "Zorn, Ricky", date: "2026-09-18" },
  ],
  statusMap: {},
};
const people = [adam, jose, jesse, ricky];

const sep17 = scheduleCrewOnDate(people, "2026-09-17", history).map((p) => p.name);
assert(sep17.includes("Little, Adam") && sep17.includes("Jose") && sep17.includes("Ary, Jesse") && sep17.includes("Zorn, Ricky"),
  "2026-09-17 roster includes Adam, Jose, Jesse, Ricky");
const sep18 = scheduleCrewOnDate(people, "2026-09-18", history).map((p) => p.name);
assert(sep18.join("|") === "Zorn, Ricky", "2026-09-18 current roster is Ricky only");
const weekUnion = scheduleCrewForWeek(people, weekDates, history).map((p) => p.name);
assert(weekUnion.includes("Little, Adam") && weekUnion.includes("Jose") && weekUnion.includes("Ary, Jesse"),
  "week union still lists the three for historical days this week");

const cap = crewWeekCapacity(
  [{ assignments: history.assignments, job: { job_num: "10079" }, trip: { label: "Trip" }, dates: [] }],
  people,
  {},
  weekDates,
  "2026-09-18",
);
const day17 = cap.capacityDays.find((d) => d.date === "2026-09-17");
const day18 = cap.capacityDays.find((d) => d.date === "2026-09-18");
assert(day17.assigned === 4, "capacity 2026-09-17 counts all four scheduled people");
assert(day18.assigned === 1 && day18.detail.assigned[0].name === "Zorn, Ricky",
  "capacity 2026-09-18 does not count archived people");

console.log("scheduleCrew tests passed");
