/**
 * Crew Scheduler consumption of Team-controlled eligibility (IDENT-3).
 * Read-only. Does not link, backfill, archive, or write assignments.
 *
 * Linked crew (team_member_id set): Team's archived flag is the authority.
 * Legacy unlinked crew: keep the scheduler's existing boolean archived filter.
 */
export function isTeamLinkedCrew(person) {
  const id = person?.team_member_id;
  return id != null && String(id).trim() !== "";
}

export function isActiveScheduleCrew(person) {
  if (!person) return false;
  if (isTeamLinkedCrew(person)) return person.archived !== true;
  return !person.archived;
}

export function activeScheduleCrew(people) {
  return (people || []).filter(isActiveScheduleCrew);
}

export function canUnarchiveFromScheduler(person) {
  return !isTeamLinkedCrew(person);
}
