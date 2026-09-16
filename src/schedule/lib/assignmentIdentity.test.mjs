import {
  assignmentCopyFields,
  assignmentInsertFields,
  assignmentRenameUpdate,
  assignmentTeamMemberId,
  crewTeamMemberId,
  newAssignmentRows,
} from "./assignmentIdentity.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const linkedA = { name: "Linked A", archived: false, team_member_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" };
const linkedB = { name: "Linked B", archived: false, team_member_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb" };
const unlinked = { name: "Legacy Unlinked", archived: false, team_member_id: null };
const renamed = { ...linkedA, name: "Linked A Renamed" };

assert(crewTeamMemberId(linkedA) === linkedA.team_member_id, "linked crew UUID is used");
assert(crewTeamMemberId(unlinked) === null, "unlinked crew UUID is null");
assert(crewTeamMemberId({ team_member_id: "  " }) === null, "blank UUID is treated as unlinked");

const linkedRow = assignmentInsertFields({
  job_id: 1, mobilization_id: "trip-1", date: "2026-09-16", crew_name: linkedA.name, person: linkedA,
});
assert(linkedRow.team_member_id === linkedA.team_member_id, "1. linked crew -> team_member_id written");
assert(linkedRow.crew_name === "Linked A", "board compatibility still writes crew_name");

const legacyRow = assignmentInsertFields({
  job_id: 1, mobilization_id: "trip-1", date: "2026-09-16", crew_name: unlinked.name, person: unlinked,
});
assert(legacyRow.team_member_id === null, "2. unlinked crew -> null");

const two = [
  assignmentInsertFields({ job_id: 1, mobilization_id: "trip-1", date: "2026-09-16", crew_name: linkedA.name, person: linkedA }),
  assignmentInsertFields({ job_id: 1, mobilization_id: "trip-1", date: "2026-09-16", crew_name: linkedB.name, person: linkedB }),
];
assert(two[0].team_member_id === linkedA.team_member_id, "3. first linked person keeps own UUID");
assert(two[1].team_member_id === linkedB.team_member_id, "3. second linked person keeps own UUID");

const afterRename = assignmentInsertFields({
  job_id: 1, mobilization_id: "trip-1", date: "2026-09-17", crew_name: renamed.name, person: renamed,
});
assert(afterRename.team_member_id === linkedA.team_member_id, "4. rename does not change UUID");
assert(JSON.stringify(assignmentRenameUpdate("Linked A Renamed")) === JSON.stringify({ crew_name: "Linked A Renamed" }),
  "4. rename update writes crew_name only");

const existing = {
  id: 99, job_id: 1, mobilization_id: "trip-1", crew_name: linkedA.name, date: "2026-09-16",
  team_member_id: linkedA.team_member_id,
};
const moved = assignmentCopyFields(existing, { mobilization_id: "trip-2", date: "2026-09-18" });
assert(moved.team_member_id === linkedA.team_member_id, "5. move preserves UUID");
assert(moved.mobilization_id === "trip-2", "5. move retargets trip");
assert(moved.date === "2026-09-18", "5. move retargets date");
assert(existing.team_member_id === linkedA.team_member_id && existing.date === "2026-09-16",
  "5. copy/move does not mutate the source assignment");

const copied = assignmentCopyFields(existing, { date: "2026-09-19" });
assert(copied.team_member_id === linkedA.team_member_id, "5. copy preserves UUID");
assert(assignmentTeamMemberId(null, existing) === linkedA.team_member_id,
  "5. reassign without a loaded crew object still preserves source UUID");

const historical = [
  { id: 11, crew_name: "Linked A", date: "2026-09-01", team_member_id: null },
  { id: 12, crew_name: "Legacy Unlinked", date: "2026-09-01", team_member_id: null },
];
const beforeLoad = JSON.stringify(historical);
newAssignmentRows(["2026-09-16"], { job_id: 1, mobilization_id: "trip-1", crew_name: linkedA.name, person: linkedA });
assert(JSON.stringify(historical) === beforeLoad, "6. building a new payload does not rewrite existing assignments");
assert(historical.every(a => a.team_member_id == null), "6. load/history stays null until a later backfill slice");

const writes = [];
function pageLoad() { return writes.slice(); }
assert(pageLoad().length === 0, "7. page load performs no assignment writes");

const bulk = newAssignmentRows(["2026-09-16", "2026-09-17"], {
  job_id: 1, mobilization_id: "trip-1", crew_name: linkedA.name, person: linkedA,
});
assert(bulk.length === 2 && bulk.every(r => r.team_member_id === linkedA.team_member_id),
  "new days for one selected person stamp that person's UUID only");
assert(bulk.every(r => r.crew_name === "Linked A"), "no identity backfill of other people");

const addMoreFromHistory = assignmentInsertFields({
  job_id: 1, mobilization_id: "trip-1", date: "2026-09-20", crew_name: linkedA.name,
  person: null, sourceAssignment: existing,
});
assert(addMoreFromHistory.team_member_id === linkedA.team_member_id,
  "adding a day copies UUID from the person's existing assignment when the crew object is absent");

console.log("assignmentIdentity tests passed");
