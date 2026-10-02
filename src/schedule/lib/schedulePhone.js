// Presentation-only helpers for the Crew Schedule phone views (F66,
// docs/plans/crew_mobile_preview.md). They read the same rows, staffing and
// summary the board uses and restate no rule: no day list, no eligibility,
// conflict, staffing or identity logic of their own.
import { crewRowInRange, crewRowNames, crewRowStaffing } from './crewScheduleRows.js'
import { crewStatusUiLabel, isCrewStatusOut } from './crewStatus.js'

// A row desktop would accept a crew drop on (Schedule.jsx handleAssignCrew).
export function canTakeCrew(row) {
  return !!row && !row.unavailable && !row.trip.legacy && row.ranges.length > 0
}

// Same label the board's Job column shows for a row's trip.
export function tripLabel(trip) {
  return trip.legacy ? 'Crew assignments — trip not identified' : trip.label || `Trip ${trip.displayNumber}`
}

// A row has a Day card when its board cell for that day is not the empty "—":
// crew that day, or in range with a need that is not zero.
export function rowHasDayCell(row, date) {
  if (crewRowNames(row, date).length > 0) return true
  return crewRowInRange(row, date) && crewRowStaffing(row, date).needed !== 0
}

// The board cell's "need N" / "need ?" text, for a saved trip in range that day.
// Legacy and unavailable rows have no staffing line; their issue text flags them.
export function staffingLine(row, date) {
  if (row.unavailable || row.trip.legacy) return null
  const staffing = crewRowStaffing(row, date)
  if (!staffing.active) return null
  if (staffing.needed == null) return 'need ?'
  const count = crewRowNames(row, date).length
  return staffing.needed > 0 && count < staffing.needed ? `need ${staffing.needed - count}` : null
}

// One day's three Week counts. Short and unknown are that day's entries in
// crewWeekSummary (trips); double-booked is the board's 2X rule (people).
export function dayCounts(summary, crewDayJobs, date) {
  const onDay = groups => groups.flatMap(group => group.details).filter(detail => detail.date === date).length
  return {
    short: onDay(summary.needing),
    unknown: onDay(summary.unknown),
    doubleBooked: Object.values(crewDayJobs).filter(days => (days[date] || []).length > 1).length,
  }
}

// What the desktop day picker shows on one day for one person on one row:
// whether the day is inside the trip, and the status or other-job text.
export function assignDayNote(row, name, date, { assignments, jobs, status }) {
  const others = assignments
    .filter(a => a.crew_name === name && a.date === date && !row.assignments.some(own => own.id === a.id))
    .map(a => {
      const job = jobs.find(j => String(j.job_id) === String(a.job_id))
      return job ? `${job.job_num}${String(a.job_id) === String(row.job.job_id) ? ' (another trip)' : ''}` : `Job ${a.job_id}`
    })
  const out = isCrewStatusOut(status)
  return { inRange: crewRowInRange(row, date), warning: out ? crewStatusUiLabel(status) : others.length ? `Also on ${others.join(', ')}` : '' }
}

// Review: the row as it is now against the chosen days.
export function reviewChange(row, name, days) {
  const current = [...new Set(row.assignments.filter(a => a.crew_name === name).map(a => a.date))].sort()
  return {
    current,
    add: days.filter(d => !current.includes(d)).sort(),
    remove: current.filter(d => !days.includes(d)),
  }
}
