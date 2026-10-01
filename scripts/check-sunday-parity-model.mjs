// Sunday = Saturday parity (F60) — model checks M1–M6, docs/plans/sunday-scheduling.md §5.
// Pure functions only; no browser, no database.
//
//   TZ=America/Los_Angeles node scripts/check-sunday-parity-model.mjs
//   SUNDAY_PARITY_BASE=1 …   record the "matches base" values (M4–M6) instead of asserting
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import { makeFixture, P, SUN } from './sunday-parity-fixture.mjs'

assert.equal(process.env.TZ, 'America/Los_Angeles', 'Run with TZ=America/Los_Angeles')
process.env.VITE_SUPABASE_URL = 'https://schedule-fixture.supabase.co'
process.env.VITE_SUPABASE_ANON_KEY = 'codex-fixture-only'
const BASE = process.env.SUNDAY_PARITY_BASE === '1'
const OUT = resolve('docs/agent-handoffs/evidence/sunday-parity')
const SNAPSHOT = resolve(OUT, 'base-model-snapshot.json')
mkdirSync(OUT, { recursive: true })
const snapshot = BASE ? {} : JSON.parse(readFileSync(SNAPSHOT, 'utf8'))
const same = (key, actual, msg) => {
  const value = JSON.parse(JSON.stringify(actual))
  if (BASE) { snapshot[key] = value; return }
  assert.deepEqual(value, snapshot[key], `${msg} — differs from base (${key})`)
}

// queries.js imports the Supabase client, which needs Vite's import.meta.env.
const vite = await createServer({ root: resolve('.'), logLevel: 'error', server: { middlewareMode: true, ws: false }, appType: 'custom', optimizeDeps: { noDiscovery: true } })
try {
  const load = path => vite.ssrLoadModule(path)
  const weeks = await load('/src/schedule/lib/weeks.js')
  const text = await load('/src/schedule/lib/crewWeekText.js')
  const status = await load('/src/schedule/lib/crewStatus.js')
  const billing = await load('/src/schedule/lib/billingForecast.js')
  const queries = await load('/src/schedule/lib/queries.js')
  const card = await load('/src/schedule/lib/jobCardSchedule.js')
  const fx = makeFixture()
  const allocations = {}
  for (const t of fx.trips) (allocations[t.job_id] ||= {})[t.seq] = t

  if (!BASE) {
    // M1
    assert.equal(weeks.fmtWk('2026-09-28'), 'Sep 28 – Oct 4, 2026')
    assert.equal(weeks.fmtWk('2026-12-28'), 'Dec 28 – Jan 3, 2027')
    assert.equal(weeks.fmtWk(new Date('2026-09-28T00:00:00')), 'Sep 28 – Oct 4, 2026')
    console.log('PASS M1 week label runs Monday – Sunday, across a year end')

    // M2
    assert.deepEqual(text.crewMidweekDates('2026-10-01'), ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'])
    assert.deepEqual(text.crewMidweekDates('2026-10-04'), ['2026-10-04'])
    const midweek = (name, today = '2026-10-01', extra = {}) => text.buildCrewMidweekText({
      name, dates: text.crewMidweekDates(today), jobs: fx.jobs, allocations, assignments: fx.assignments, statuses: fx.statuses, ...extra })
    assert.equal(midweek(P.P7).days.at(-1), 'SUN 10/4 — JOB #8103 — with Uma Fir')
    assert.deepEqual(midweek(P.P7).days, ['SUN 10/4 — JOB #8103 — with Uma Fir'])
    assert.deepEqual(midweek(P.P7, '2026-10-04').days, ['SUN 10/4 — JOB #8103 — with Uma Fir'], 'On Sunday the range is that one day')
    // Alone on a trip that day: the line ends at the job number.
    const alone = midweek(P.P7, '2026-10-01', { assignments: fx.assignments.filter(a => a.crew_name !== P.P6) })
    assert.deepEqual(alone.days, ['SUN 10/4 — JOB #8103'])
    assert.equal(midweek(P.P1).days.length, 0, 'Nothing on Sunday gives no Sunday line')
    assert.deepEqual(midweek(P.P3).days, ['SUN 10/4 — (OFF — MAY CHANGE)'])
    console.log('PASS M2 Midweek Update runs today through Sunday; coworker, alone, empty and Scheduled Off lines')

    // M3
    assert.deepEqual(status.thisWeekMonSun('2026-10-01'), { from: '2026-09-28', to: '2026-10-04' })
    assert.deepEqual(status.nextWeekMonSun('2026-10-01'), { from: '2026-10-05', to: '2026-10-11' })
    assert.deepEqual(status.thisWeekMonSun('2026-10-04'), { from: '2026-09-28', to: '2026-10-04' })
    console.log('PASS M3 Scheduled Off presets fill Monday through Sunday')
  }

  // M4 — billing surface, today 2026-10-01, with job R (partly billed, Sunday dates).
  const today = new Date('2026-10-01T00:00:00')
  const surface = { invoices: fx.invoices.map(i => ({ ...i, _display_job_number: '8106', _billing_terms: 30, _requires_pay_app: false, _default_billing_terms: 30 })),
    proposals: fx.proposals, schedules: [], payApps: [], overrides: [] }
  const satJob = { ...fx.jobs.find(j => j.job_num === '8106'), job_id: 60, call_log_id: 160, job_num: '8160', end_date: '2026-10-03', partial_bill_date: '2026-10-03' }
  const satSurface = { ...surface,
    invoices: [...surface.invoices, { ...surface.invoices[0], id: 'inv-S1', call_log_id: 160, proposal_id: 'prop-S' }],
    proposals: [...surface.proposals, { ...fx.proposals[0], id: 'prop-S', call_log_id: 160 }] }
  const built = billing.buildBillingSurface([...fx.jobs, satJob], satSurface, today, weeks.getMonday)
  const rowR = built.rows.find(r => r.jobNum === '8106'), rowS = built.rows.find(r => r.jobNum === '8160')
  assert(rowR && rowS, 'Job R (Sunday-dated) and its Saturday-dated twin both have a worklist row')
  for (const key of ['status', 'historyLabel', 'billed', 'authoritative', 'remaining']) assert.deepEqual(rowR[key], rowS[key], `Sunday and Saturday rows agree on ${key}`)
  same('M4 billing surface', { rows: built.rows, toBill: built.toBill, forecast: built.forecast }, 'Billing rows, totals and forecast')
  console.log(`${BASE ? 'BASE' : 'PASS'} M4 billing rows, totals and forecast${BASE ? ' recorded' : ' deep-equal base; job R has a row'}`)

  // M5 — Jobs multi-week alert counts Sunday crew.
  const jobM = fx.jobs.find(j => j.job_name === 'Job M')
  const alertSun = queries.getJobMultiWeekAlert(jobM, [{ job_id: jobM.job_id, date: '2026-10-11' }], '2026-10-01')
  const alertSat = queries.getJobMultiWeekAlert(jobM, [{ job_id: jobM.job_id, date: '2026-10-10' }], '2026-10-01')
  same('M5 alert, only W+1 crew day on Saturday', alertSat, 'Multi-week alert with Saturday crew')
  if (BASE) snapshot['M5 alert, only W+1 crew day on Sunday (base)'] = alertSun
  else {
    assert.equal(alertSun, 0, 'Sunday crew in W+1 clears the alert')
    assert.equal(snapshot['M5 alert, only W+1 crew day on Sunday (base)'], 1, 'Base raised one alert for the same data')
  }
  console.log(`${BASE ? 'BASE' : 'PASS'} M5 multi-week alert ${BASE ? 'recorded' : 'counts Sunday crew; Saturday case matches base'}`)

  // M6 — job-card work-day counts follow the unchanged worked-day rule.
  const datesFor = jobId => new Set(fx.assignments.filter(a => a.job_id === jobId).map(a => a.date))
  const cardFor = name => { const j = fx.jobs.find(job => job.job_name === name); return card.jobCardSchedule(j, allocations[j.job_id], datesFor(j.job_id)) }
  same('M6 job N card', cardFor('Job N'), 'Job N card schedule')
  same('M6 job A card (weekend crew)', cardFor('Job A'), 'Job A card schedule')
  console.log(`${BASE ? 'BASE' : 'PASS'} M6 job-card work-day counts ${BASE ? 'recorded' : 'match base'}`)

  if (BASE) { writeFileSync(SNAPSHOT, JSON.stringify(snapshot, null, 2) + '\n'); console.log('BASE model values written: ' + SNAPSHOT) }
  else console.log('PASS: Sunday = Saturday parity model checks M1–M6')
} finally { await vite.close() }
