import { crewLeadNames } from "./crewLeads.js";
import {
  activeScheduleCrew,
  canUnarchiveFromScheduler,
  isActiveScheduleCrew,
  isTeamLinkedCrew,
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

console.log("scheduleCrew tests passed");
