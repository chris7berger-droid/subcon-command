// Synthetic scheduler fixture for the mobile crew scheduler checks (F66,
// docs/plans/crew_mobile_preview.md §5). Synthetic names only; nothing here is
// read from or written to a real database.
//
// It sits on top of scripts/mobile-preview-fixtures.mjs, unedited: that file's
// makeContext supplies the synthetic session, the shell's records and the
// default-deny rules (H3–H6). This file answers the six scheduler tables and
// the two assignment writes the plan allows, and nothing else.
//
// Week W = Mon 2026-10-05 … Sun 2026-10-11. The clock is Wed 2026-10-07.
import { makeContext, BASE } from './mobile-preview-fixtures.mjs'

export { BASE }
export const CLOCK = '2026-10-07T12:00:00-07:00'
export const TIMEZONE = 'America/Los_Angeles'
export const WEEK = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11']
export const NEXT_WEEK = ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18']
export const [MON, TUE, WED, THU, FRI, SAT, SUN] = WEEK
export const HEIGHTS = { 360: 740, 390: 844, 430: 932, 768: 1024, 1440: 1000 }

export const P = {
  X: 'Xander, Xan',     // A-wide every day + A-short Thu–Fri (double-booked Thu, Fri)
  P1: 'Pine, Pat',      // Job B, Thursday
  T: 'Teak, Tess',      // Job C + Job D, Thursday (double-booked)
  D2: 'Dune, Dee',      // Job D, Thursday
  L: 'Larch, Lou',      // legacy crew day on Job B, Thursday (no trip link)
  U: 'Upton, Uma',      // crew day on a job that is not in `jobs`, Thursday
  F1: 'Fern, Flo',      // Team-linked, free
  F2: 'Fig, Finn',      // unlinked, free
  S: 'Sage, Sam',       // Sick on Thursday
  O: 'Oak, Olin',       // Scheduled Off on Friday
  W: 'Wren, Wes',       // Scheduled Off on all seven days
  R: 'Rowan, Ray',      // archived effective Thursday; crew days Mon–Tue on A-wide
}
export const F1_TEAM_ID = '33333333-3333-4333-8333-333333333333'
export const LONG_NAME = 'Northgate Distribution Center Dock Slabs' // 40 characters
export const TRIP = { AW: 'trip-a-wide', AS: 'trip-a-short', B: 'trip-b', C: 'trip-c', D: 'trip-d', E: 'trip-e' }
export const JOB = { A: 1, B: 2, C: 3, D: 4, E: 5, MISSING: 99 }
export const flip = name => name.split(', ').reverse().join(' ')

function job(job_id, num, name, start, end, extra = {}) {
  return {
    job_id, call_log_id: 200 + job_id, job_num: num, job_name: name, status: 'Scheduled', deleted: 'No',
    merged_into_job_id: null, start_date: start, end_date: end, crew_needed: null, lead: null, job_wtcs: [],
    call_log: { id: 200 + job_id, job_number: Number(num), display_job_number: num, job_name: name, customer_name: 'Fixture Customer' },
    ...extra,
  }
}

export function makeFixture() {
  const jobs = [
    job(JOB.A, '9101', 'Job A', MON, SUN),
    job(JOB.B, '9102', 'Job B', WED, FRI),
    job(JOB.C, '9103', 'Job C', THU, THU),
    job(JOB.D, '9104', 'Job D', THU, THU),
    job(JOB.E, '9105', LONG_NAME, THU, THU),
  ]
  const trips = [
    { id: TRIP.AW, job_id: JOB.A, seq: 1, label: 'A-wide', start_date: MON, end_date: SUN, crew_needed: 4, lead: P.X },
    { id: TRIP.AS, job_id: JOB.A, seq: 2, label: 'A-short', start_date: THU, end_date: FRI, crew_needed: 2, lead: P.X },
    { id: TRIP.B, job_id: JOB.B, seq: 1, label: 'B main', start_date: WED, end_date: FRI, crew_needed: 3, lead: P.P1 },
    { id: TRIP.C, job_id: JOB.C, seq: 1, label: 'C main', start_date: THU, end_date: THU, crew_needed: null, lead: P.T },
    { id: TRIP.D, job_id: JOB.D, seq: 1, label: 'D main', start_date: THU, end_date: THU, crew_needed: 2, lead: P.T },
    { id: TRIP.E, job_id: JOB.E, seq: 1, label: 'E main', start_date: THU, end_date: THU, crew_needed: 2, lead: null },
  ]
  const teams = { X: '1', P1: '1', F1: '1', S: '1', R: '1', T: '2', D2: '2', L: '2', O: '2', U: 'Floater', F2: 'Floater', W: 'Floater' }
  const crew = Object.entries(P).map(([key, name]) => ({
    name, team: teams[key], phone: key === 'X' ? '555-0142' : null,
    archived: key === 'R', archived_on: key === 'R' ? THU : null,
    team_member_id: key === 'F1' ? F1_TEAM_ID : null,
  }))
  let id = 1
  const a = (job_id, mobilization_id, crew_name, date) => ({ id: id++, job_id, mobilization_id, crew_name, date, team_member_id: null })
  const assignments = [
    ...WEEK.map(date => a(JOB.A, TRIP.AW, P.X, date)),
    a(JOB.A, TRIP.AS, P.X, THU), a(JOB.A, TRIP.AS, P.X, FRI),
    a(JOB.A, TRIP.AW, P.R, MON), a(JOB.A, TRIP.AW, P.R, TUE),
    a(JOB.B, TRIP.B, P.P1, THU),
    a(JOB.C, TRIP.C, P.T, THU),
    a(JOB.D, TRIP.D, P.T, THU), a(JOB.D, TRIP.D, P.D2, THU),
    a(JOB.B, null, P.L, THU),        // legacy: no trip link
    a(JOB.MISSING, null, P.U, THU),  // unavailable: its job is not in `jobs`
  ]
  const statuses = [
    { crew_name: P.S, date: THU, status: 'sick' },
    { crew_name: P.O, date: FRI, status: 'scheduled-off' },
    ...WEEK.map(date => ({ crew_name: P.W, date, status: 'scheduled-off' })),
  ]
  const work_types = [{ id: 1, name: 'Surface preparation' }, { id: 2, name: 'Polished concrete' }]
  return { jobs, trips, crew, assignments, statuses, work_types, nextId: () => id++ }
}

const TABLES = ['jobs', 'job_mobilizations', 'crew', 'assignments', 'crew_status', 'work_types']

// One context per check: a fresh fixture, the shell's own default-deny context,
// and the scheduler tables answered here. `switches` can be flipped mid-check:
//   failWrites   — POST and DELETE on assignments both fail
//   failDelete   — only the DELETE fails
//   failWeekRead — the next week-scoped assignments read fails once
//   holdWeekRead — week-scoped assignments reads wait until release() is called
//   holdWrites   — the two assignment writes wait until releaseWrites() is called
// allowWrites: false (the hosted run) leaves even those two writes to the shell
// handler, which refuses and logs them, so any save fails the run.
export async function openScheduler(browser, width, { fixture = makeFixture(), allowWrites = true } = {}) {
  const context = await makeContext(browser, width)
  // The shell fixture stamps its synthetic session with the real clock; this
  // check runs on a fixed later clock, so keep that session unexpired there.
  await context.addInitScript(({ storageKey, expires }) => {
    const raw = localStorage.getItem(storageKey)
    if (raw) localStorage.setItem(storageKey, JSON.stringify({ ...JSON.parse(raw), expires_at: expires }))
  }, { storageKey: process.env.QA_STORAGE_KEY || 'sb-calllog-fixture-auth-token', expires: Math.floor(Date.parse(CLOCK) / 1000) + 7200 })
  const log = { reads: [], writes: [], refused: [] }
  const switches = { failWrites: false, failDelete: false, failWeekRead: false, holdWeekRead: false, holdWrites: false }
  let held = [], heldWrites = []
  const releaseWrites = () => { const waiting = heldWrites; heldWrites = []; switches.holdWrites = false; waiting.forEach(done => done()) }
  const release = () => { const waiting = held; held = []; switches.holdWeekRead = false; waiting.forEach(done => done()) }
  await context.route(url => new URL(url).hostname.endsWith('.supabase.co') && TABLES.includes(decodeURIComponent(new URL(url).pathname.split('/').pop())) && new URL(url).pathname.startsWith('/rest/v1/'), async route => {
    const req = route.request(), url = new URL(req.url()), method = req.method()
    const table = decodeURIComponent(url.pathname.split('/').pop())
    const cors = { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range' }
    const send = (data, status = 200) => route.fulfill({ status, headers: { 'content-type': 'application/json', ...cors }, body: JSON.stringify(data) })
    if (method === 'OPTIONS') return route.fallback()
    const matches = row => [...url.searchParams].every(([key, val]) => {
      if (!(key in row)) return true
      if (val.startsWith('eq.')) return String(row[key]) === val.slice(3)
      if (val.startsWith('in.')) return val.slice(3).replace(/^\(|\)$/g, '').split(',').map(v => v.replace(/^"|"$/g, '')).includes(String(row[key]))
      if (val.startsWith('gte.')) return row[key] >= val.slice(4)
      if (val.startsWith('lte.')) return row[key] <= val.slice(4)
      return true
    })
    if (method !== 'GET' && method !== 'HEAD') {
      const payload = req.postData() ? req.postDataJSON() : null
      const entry = { table, method, payload, query: decodeURIComponent(url.search) }
      // §5 harness (3): the only two writes a check may trigger.
      const allowed = allowWrites && table === 'assignments' && (method === 'POST' || method === 'DELETE')
      if (allowed) { log.writes.push(entry); if (switches.holdWrites) await new Promise(done => heldWrites.push(done)) }
      if (allowed && method === 'POST') {
        if (switches.failWrites) return send({ message: 'Fixture: insert refused' }, 500)
        const added = [].concat(payload).map(row => ({ ...row, id: fixture.nextId() }))
        fixture.assignments.push(...added)
        return send(added, 201)
      }
      if (allowed && method === 'DELETE') {
        if (switches.failWrites || switches.failDelete) return send({ message: 'Fixture: delete refused' }, 500)
        const gone = fixture.assignments.filter(matches)
        fixture.assignments = fixture.assignments.filter(row => !gone.includes(row))
        return send(gone)
      }
      // Anything else is not allowed: record it and let the shell's handler refuse it (403 + its write log).
      log.refused.push(`${method} ${table}`)
      return route.fallback()
    }
    const weekRead = url.searchParams.getAll('date').some(v => v.startsWith('gte.'))
    log.reads.push({ table, weekRead, query: decodeURIComponent(url.search) })
    if (table === 'assignments' && weekRead) {
      if (switches.holdWeekRead) await new Promise(done => held.push(done))
      if (switches.failWeekRead) { switches.failWeekRead = false; return send({ message: 'Fixture: week read failed' }, 500) }
    }
    const single = (req.headers().accept || '').includes('vnd.pgrst.object')
    const rows = table === 'jobs' ? fixture.jobs.filter(matches)
      : table === 'job_mobilizations' ? fixture.trips.filter(matches)
      : table === 'crew' ? fixture.crew
      : table === 'assignments' ? fixture.assignments.filter(matches)
      : table === 'crew_status' ? fixture.statuses.filter(matches)
      : fixture.work_types
    return send(single ? rows[0] ?? null : rows)
  })
  const page = await context.newPage()
  page.setDefaultTimeout(15000)
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.clock.setFixedTime(new Date(CLOCK))
  const cdp = await context.newCDPSession(page)
  await cdp.send('Emulation.setTimezoneOverride', { timezoneId: TIMEZONE })
  return { context, page, fixture, log, switches, release, releaseWrites, errors }
}
