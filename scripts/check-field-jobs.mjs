import assert from 'node:assert/strict'
import { buildFieldJobs } from '../src/field/lib/fieldJobs.js'

const today = '2026-09-22'
const job = (job_id, overrides = {}) => ({ job_id, job_num: String(job_id), job_name: 'Normal job', status: 'Scheduled', call_log_id: 42, ...overrides })
const trip = (id, job_id, start_date, end_date, overrides = {}) => ({ id, job_id, seq: 1, label: id, start_date, end_date, ...overrides })
const crew = (job_id, mobilization_id, crew_name, date) => ({ job_id, mobilization_id, crew_name, date })
const project = (jobs, trips = [], assignments = []) => buildFieldJobs(jobs, trips, assignments, today)

// Real reported record shapes: Sales stage must not control Schedule lifecycle.
const rows = project([
  job(1270, { job_num: '10009 - Exterior Deck Waterproofing', status: 'Ongoing', stage: 'Scheduled', start_date: '2026-04-27', end_date: '2026-04-29' }),
  job(1298, { job_num: '6507 CO8 - T&M', job_name: 'T&M', status: 'Parked', stage: 'Parked', call_log_id: 3947 }),
], [trip('old', 1270, '2026-04-27', '2026-04-29'), trip('co', 1298, '2026-10-01', '2026-10-26')], [
  crew(1270, 'old', 'Past person', '2026-04-27'),
  ...['Axel', 'Luna, Daniel', 'Misa', 'Ramirez, Jorge', 'Victor'].map(n => crew(1298, 'co', n, '2026-10-01')),
])
assert.equal(rows.length, 2)
assert.equal(rows[0].jobNum, '6507 CO8 - T&M')
assert.equal(rows[0].stage, 'Scheduled')
assert.equal(rows[0].crewCount, 5)
assert.equal(rows[0].contexts[0].start_date, '2026-10-01')
assert.equal(rows[1].stage, 'Ongoing')
assert.equal(rows[1].period, 'past')
assert.equal(rows[1].crewCount, null)

// Saved identity, job scope and today onward: no sibling, old visit, off-trip,
// out-of-range, unlinked or earlier-in-the-current-trip crew can inflate a count.
const current = project([job(1, { status: 'In Progress' }), job(2)], [
  trip('current', 1, '2026-09-21', '2026-09-25'),
  trip('old', 1, '2026-09-01', '2026-09-04'),
  trip('later', 1, '2026-10-05', '2026-10-09'),
], [
  crew(1, 'current', 'Today', today), crew(1, 'current', 'Today', '2026-09-23'),
  crew(1, 'current', 'Tomorrow', '2026-09-23'), crew(1, 'current', 'Yesterday', '2026-09-21'),
  crew(1, 'current', 'Off date', '2026-10-01'), crew(1, 'old', 'Old trip', today),
  crew(1, 'later', 'Later trip', '2026-10-05'), crew(1, null, 'Unlinked', today),
  crew(2, 'current', 'Sibling', today),
]).find(r => r.jobPk === 1)
assert.deepEqual(current.crewNames, ['Today', 'Tomorrow'])
assert.equal(current.contexts.length, 1)
assert.equal(current.otherTripCount, 2)

// Do not bridge gaps using parent dates or flatten separate current trip spans.
const gaps = project([job(1, { start_date: '2026-01-01', end_date: '2026-12-31' })], [
  trip('past', 1, '2026-09-01', '2026-09-05'), trip('next', 1, '2026-10-01', '2026-10-03'),
  trip('later', 1, '2026-11-01', '2026-11-03'),
])[0]
assert.equal(gaps.period, 'upcoming')
assert.deepEqual(gaps.contexts.map(t => [t.start_date, t.end_date]), [['2026-10-01', '2026-10-03']])
const overlapping = project([job(1)], [trip('a', 1, '2026-09-21', '2026-09-23'), trip('b', 1, today, '2026-09-25')], [
  crew(1, 'a', 'Shared', today), crew(1, 'b', 'Shared', today), crew(1, 'b', 'Second', today),
])[0]
assert.equal(overlapping.contexts.length, 2)
assert.equal(overlapping.crewCount, 2)

// Job-only fallback is bounded to its dates; saved undated trips can use it,
// but incomplete/invalid dates never turn an unknown crew context into "None".
for (const saved of [[], [trip('undated', 1, null, null)]]) {
  const fallback = project([job(1, { start_date: today, end_date: '2026-09-23' })], saved, [
    crew(1, saved[0]?.id || null, 'Assigned', today), crew(1, null, 'Historical', '2026-09-01'),
  ])[0]
  assert.equal(fallback.contexts[0].parent, true)
  assert.deepEqual(fallback.crewNames, ['Assigned'])
}
for (const [start, end] of [[null, null], [today, null], [null, '2026-09-25'], ['2026-10-02', '2026-10-01']]) {
  assert.equal(project([job(1)], [trip('partial', 1, start, end)])[0].crewCount, null)
}
assert.equal(project([job(1)], [trip('next', 1, '2026-10-01', '2026-10-03')])[0].crewCount, 0)
assert.equal(project([job(1, { status: 'Completed' })])[0].stage, 'Complete')
assert.equal(project([job(1, { call_log_id: null, job_num: '⚠ Unlinked', status: null })])[0].stage, 'Ongoing')
console.log('PASS Field Jobs: CO identity, shared lifecycle, current/next/past contexts, exact trip/job ownership, historical exclusion, overlap deduplication, gaps, parent fallback and unknown dates.')
