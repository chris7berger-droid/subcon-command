import { isTeamLinkedCrew } from './scheduleCrew.js'

/**
 * IDENT-4: stamp assignments.team_member_id on NEW Schedule assignment inserts.
 * Read the UUID off the selected crew row (or a source assignment being
 * copied/moved). Never name-matches Team. Never rewrites existing rows.
 */
export function crewTeamMemberId(person) {
  if (!isTeamLinkedCrew(person)) return null
  return String(person.team_member_id).trim()
}

export function assignmentTeamMemberId(person, sourceAssignment) {
  if (person) return crewTeamMemberId(person)
  return crewTeamMemberId(sourceAssignment)
}

export function assignmentInsertFields({
  job_id,
  mobilization_id,
  date,
  crew_name,
  person,
  sourceAssignment,
}) {
  return {
    job_id,
    mobilization_id,
    crew_name,
    date,
    team_member_id: assignmentTeamMemberId(person, sourceAssignment),
  }
}

export function assignmentCopyFields(source, overrides = {}) {
  return assignmentInsertFields({
    job_id: overrides.job_id ?? source.job_id,
    mobilization_id: overrides.mobilization_id ?? source.mobilization_id,
    date: overrides.date ?? source.date,
    crew_name: overrides.crew_name ?? source.crew_name,
    person: overrides.person,
    sourceAssignment: source,
  })
}

export function assignmentRenameUpdate(newName) {
  return { crew_name: newName }
}

export function newAssignmentRows(dates, ctx) {
  return (dates || []).map(date => assignmentInsertFields({ ...ctx, date }))
}
