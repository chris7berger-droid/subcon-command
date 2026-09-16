import {
  applyCrewEligibility,
  crewPatchFromPlan,
  defaultCrewScheduleEligibility,
  findSafeUnlinkedMatches,
  inviteNeedsEmail,
  namesMatchSafely,
  planCrewEligibility,
} from "./crewEligibility.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(defaultCrewScheduleEligibility("Field") === true, "Field role defaults schedule eligibility ON");
assert(defaultCrewScheduleEligibility("Sales Rep") === false, "Sales Rep defaults OFF");
assert(defaultCrewScheduleEligibility("Admin") === false, "Admin defaults OFF");
assert(defaultCrewScheduleEligibility("Office Staff") === false, "Office Staff defaults OFF");

assert(inviteNeedsEmail(true, "") === true, "invite without email is blocked");
assert(inviteNeedsEmail(true, "   ") === true, "invite with blank email is blocked");
assert(inviteNeedsEmail(true, "pat@example.com") === false, "invite with email is allowed");
assert(inviteNeedsEmail(false, "") === false, "save without invite does not require email");

assert(namesMatchSafely("Chris Berger", "Berger, Chris") === true, "flip match is safe");
assert(namesMatchSafely("Chris Berger", "Chris Berger") === true, "exact match is safe");
assert(namesMatchSafely("Chris Berger", "Pat Berger") === false, "different person is not a match");
assert(namesMatchSafely("Chris", "Chris Berger") === false, "partial name is not a match");

const tm = "team-pat";
const rows = [
  { name: "Nguyen, Amy", phone: "1", archived: false, team_member_id: null },
  { name: "Diaz, Pat", phone: "2", archived: false, team_member_id: "someone-else" },
];

assert(findSafeUnlinkedMatches("Amy Nguyen", rows).length === 1, "exactly one unlinked flip match");
assert(findSafeUnlinkedMatches("Pat Diaz", rows).length === 0, "linked other person is not an unlinked match");

const createPlan = planCrewEligibility({
  available: true,
  teamMemberId: tm,
  teamName: "Jordan Lee",
  teamPhone: "555-0100",
  crewRows: rows,
});
assert(createPlan.ok && createPlan.action === "create", "eligibility ON creates when no match");
assert(crewPatchFromPlan(createPlan, { teamMemberId: tm }).insert.team_member_id === tm, "create writes team_member_id");
assert(crewPatchFromPlan(createPlan, { teamMemberId: tm }).insert.archived === false, "create is unarchived");

const reuseRows = [
  { name: "Old Name", phone: "1", archived: true, team_member_id: tm },
];
const reusePlan = planCrewEligibility({
  available: true,
  teamMemberId: tm,
  teamName: "Jordan Lee",
  teamPhone: "555-0100",
  crewRows: reuseRows,
});
assert(reusePlan.ok && reusePlan.action === "update", "eligibility ON reuses linked row");
assert(reusePlan.nextName === "Jordan Lee", "reuse updates name from Team");
const reusePatch = crewPatchFromPlan(reusePlan, { teamMemberId: tm }).update.patch;
assert(reusePatch.archived === false, "reuse unarchives");
assert(reusePatch.name === "Jordan Lee", "reuse renames from Team");
assert(reusePatch.team_member_id === tm, "reuse keeps link");

const linkPlan = planCrewEligibility({
  available: true,
  teamMemberId: tm,
  teamName: "Amy Nguyen",
  teamPhone: "555-0101",
  crewRows: rows,
});
assert(linkPlan.ok && linkPlan.action === "link", "eligibility ON links the one obvious unlinked match");
assert(linkPlan.crewName === "Nguyen, Amy", "link targets the existing crew PK");

const archivePlan = planCrewEligibility({
  available: false,
  teamMemberId: tm,
  teamName: "Jordan Lee",
  crewRows: reuseRows,
});
assert(archivePlan.ok && archivePlan.action === "archive", "eligibility OFF archives");
assert(crewPatchFromPlan(archivePlan, { teamMemberId: tm }).update.patch.archived === true, "archive sets archived true");
assert(!("delete" in (crewPatchFromPlan(archivePlan, { teamMemberId: tm }) || {})), "archive does not delete");

const noopPlan = planCrewEligibility({
  available: false,
  teamMemberId: tm,
  teamName: "Jordan Lee",
  crewRows: rows,
});
assert(noopPlan.ok && noopPlan.action === "noop", "OFF with no linked row is a no-op");

const renamePlan = planCrewEligibility({
  available: true,
  teamMemberId: tm,
  teamName: "Jordan Lee",
  teamPhone: "555-0100",
  crewRows: [{ name: "Lee, Jordan", phone: "1", archived: false, team_member_id: tm }],
});
assert(renamePlan.ok && renamePlan.nextName === "Jordan Lee", "rename uses Team name");
assert(renamePlan.crewName === "Lee, Jordan", "rename starts from linked crew PK");

const assignments = [{ id: 1, crew_name: "Lee, Jordan" }];
const crewStatus = [{ crew_name: "Lee, Jordan", date: "2099-01-01" }];
const fake = makeFakeCrewDb([
  { name: "Lee, Jordan", phone: "1", archived: false, team_member_id: tm },
]);
const renameResult = await applyCrewEligibility(fake.client, renamePlan, { teamMemberId: tm });
assert(renameResult.ok && renameResult.wroteAssignments === false, "rename apply does not write assignments");
assert(fake.tables.assignments.length === 1 && fake.tables.assignments[0].crew_name === "Lee, Jordan", "helper leaves assignments to IDENT-1 CASCADE");
assert(fake.tables.crew_status.length === 1, "helper does not touch crew_status");
assert(fake.tables.crew[0].name === "Jordan Lee", "linked crew.name follows Team");
assert(fake.ops.every((op) => op.table === "crew"), "only the crew table is written");

const ambiguousPlan = planCrewEligibility({
  available: true,
  teamMemberId: tm,
  teamName: "Chris Berger",
  crewRows: [
    { name: "Berger, Chris", team_member_id: null },
    { name: "Chris Berger", team_member_id: null },
  ],
});
assert(ambiguousPlan.ok === false && ambiguousPlan.code === "ambiguous", "ambiguous legacy name does not auto-link");

const conflictPlan = planCrewEligibility({
  available: true,
  teamMemberId: tm,
  teamName: "Pat Diaz",
  crewRows: rows,
});
assert(conflictPlan.ok === false && conflictPlan.code === "conflict", "name owned by a different person fails clearly");

const createResult = await applyCrewEligibility(
  makeFakeCrewDb([]).client,
  createPlan,
  { teamMemberId: tm, tenantId: "tenant-1" },
);
assert(createResult.ok && createResult.action === "create" && createResult.wroteAssignments === false, "create does not write assignments");

const archiveFake = makeFakeCrewDb([
  { name: "Old Name", phone: "1", archived: false, team_member_id: tm },
]);
const archiveResult = await applyCrewEligibility(archiveFake.client, archivePlan, { teamMemberId: tm });
assert(archiveResult.ok && archiveFake.tables.crew.length === 1, "OFF keeps the crew row");
assert(archiveFake.tables.crew[0].archived === true, "OFF archives the linked row");

console.log("crewEligibility tests passed");

function makeFakeCrewDb(crewRows) {
  const tables = {
    crew: crewRows.map((row) => ({ ...row })),
    assignments: assignments.map((row) => ({ ...row })),
    crew_status: crewStatus.map((row) => ({ ...row })),
  };
  const ops = [];
  const client = {
    from(table) {
      return {
        insert(row) {
          ops.push({ table, op: "insert", row });
          if (table === "crew") tables.crew.push({ ...row });
          return Promise.resolve({ error: null });
        },
        update(patch) {
          return {
            eq(col, val) {
              ops.push({ table, op: "update", patch, col, val });
              if (table === "crew") {
                tables.crew = tables.crew.map((row) => (row[col] === val ? { ...row, ...patch } : row));
              }
              return Promise.resolve({ error: null });
            },
          };
        },
      };
    },
  };
  return { client, tables, ops };
}
