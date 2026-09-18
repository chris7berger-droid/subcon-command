/**
 * Crew Scheduler eligibility (IDENT-3) plus archive-effective-date history.
 *
 * Current roster: linked crew follow Team's archived flag; legacy unlinked
 * keep the boolean archived filter.
 *
 * Historical dates: an archived person stays on the roster through dates
 * before archived_on, and on archived_on itself only if they already had
 * schedule/history that day. After that they are off the active roster.
 * Filtering never writes assignments.
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

/**
 * Authoritative archive dates from Chris, 2026-09-18.
 * Used when crew.archived_on is still null (column not backfilled yet).
 * A stored archived_on value always wins.
 */
export const KNOWN_CREW_ARCHIVED_ON = {
  "Little, Adam": "2026-09-17",
  "Jose": "2026-09-17",
  "Ary, Jesse": "2026-09-18",
};

export function archivedOnOf(person) {
  if (!person) return null;
  const stored = person.archived_on;
  if (stored) return String(stored).slice(0, 10);
  if (!isActiveScheduleCrew(person)) return KNOWN_CREW_ARCHIVED_ON[person.name] || null;
  return null;
}

export function crewHadHistoryOnDate(name, date, { assignments = [], statusMap = {} } = {}) {
  if (!name || !date) return false;
  if (statusMap[`${name}|${date}`]) return true;
  return (assignments || []).some((a) => a.crew_name === name && a.date === date);
}

/**
 * Historical visibility for one calendar date.
 * Archive day is kept only when they already had assignment or crew_status.
 * Currently active people are visible on every date.
 */
export function isScheduleCrewOnDate(person, date, hadHistory = false) {
  if (!person || !date) return false;
  if (isActiveScheduleCrew(person)) return true;
  const archivedOn = archivedOnOf(person);
  if (!archivedOn) return false;
  if (date < archivedOn) return true;
  if (date > archivedOn) return false;
  return Boolean(hadHistory);
}

/** New assignments after archive takes effect are not allowed. Existing history stays. */
export function canAssignScheduleCrewOnDate(person, date) {
  if (!person || !date) return false;
  if (isActiveScheduleCrew(person)) return true;
  const archivedOn = archivedOnOf(person);
  if (!archivedOn) return false;
  return date < archivedOn;
}

export function scheduleCrewOnDate(people, date, history = {}) {
  return (people || []).filter((p) =>
    isScheduleCrewOnDate(p, date, crewHadHistoryOnDate(p.name, date, history)),
  );
}

export function scheduleCrewForWeek(people, dates, history = {}) {
  return (people || []).filter((p) =>
    (dates || []).some((d) =>
      isScheduleCrewOnDate(p, d, crewHadHistoryOnDate(p.name, d, history)),
    ),
  );
}
