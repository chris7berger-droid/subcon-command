// Sunday = Saturday parity (F60) — docs/plans/sunday-scheduling.md §5.
// Real React Schedule module with intercepted fixtures; no live database access.
//
//   node scripts/check-sunday-parity.mjs            run the §5 browser checks
//   SUNDAY_PARITY_BASE=1 node scripts/check-…       capture base evidence only (U1):
//                                                   screenshots + the "matches base" snapshot
//
// Env: PLAYWRIGHT_MODULE (playwright index.mjs), CHROME_PATH (optional).
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import { makeFixture, P, P1_TEAM_ID, SAT, SUN, WEEK } from './sunday-parity-fixture.mjs'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
process.env.VITE_SUPABASE_URL = 'https://schedule-fixture.supabase.co'
process.env.VITE_SUPABASE_ANON_KEY = 'codex-fixture-only'

const BASE = process.env.SUNDAY_PARITY_BASE === '1'
const OUT = resolve('docs/agent-handoffs/evidence/sunday-parity')
const SHOTS = resolve(OUT, BASE ? 'base' : 'after')
const SNAPSHOT = resolve(OUT, 'base-snapshot.json')
mkdirSync(SHOTS, { recursive: true })
const PORT = 5231
const ORIGIN = `http://127.0.0.1:${PORT}`
const THU = '2026-10-01T12:00:00-07:00'

const server = await createServer({ root: resolve('.'), logLevel: 'error', cacheDir: '/private/tmp/sales-command-sunday-parity-vite-cache',
  server: { host: '127.0.0.1', port: PORT, strictPort: true }, plugins: [{
    name: 'sunday-parity-harness',
    resolveId(id) { if (id === 'virtual:sunday-parity') return '\0sunday-parity' },
    load(id) {
      if (id !== '\0sunday-parity') return
      return `import React from 'react';
        import {createRoot} from 'react-dom/client';
        import {MemoryRouter,Routes,Route,useLocation} from 'react-router-dom';
        import ScheduleLayout from '/src/schedule/ScheduleLayout.jsx';
        import CrewPhone from '/src/schedule/views/CrewPhone.jsx';
        import {GLOBAL_CSS} from '/src/lib/tokens.js';
        document.head.appendChild(Object.assign(document.createElement('style'),{textContent:GLOBAL_CSS}));
        function Track(){const loc=useLocation();window.testPath=loc.pathname+loc.search;return null}
        const start=new URLSearchParams(location.search).get('path')||'/schedule/schedule';
        createRoot(document.getElementById('root')).render(React.createElement(MemoryRouter,{initialEntries:[start]},
          React.createElement(Track),
          React.createElement(Routes,null,
            React.createElement(Route,{path:'/schedule/*',element:React.createElement(ScheduleLayout,{teamMember:{name:'Fixture admin',role:'Admin'}})}),
            React.createElement(Route,{path:'/crew',element:React.createElement(CrewPhone)}))));`
    },
    configureServer(vite) {
      vite.middlewares.use('/__sunday-parity', async (_req, res) => {
        res.setHeader('Content-Type', 'text/html')
        res.end(await vite.transformIndexHtml('/__sunday-parity', '<html><body><div id="root"></div><script type="module">import "virtual:sunday-parity"</script></body></html>'))
      })
    },
  }] })
await server.listen()

let browser
const passed = []
const pass = msg => { passed.push(msg); console.log('PASS ' + msg) }

// One fresh browser context + fixture per scenario, so a check's writes never leak.
async function open(path, { clock = THU, width = 1440, height = 900, fixture = makeFixture() } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, timezoneId: 'America/Los_Angeles' })
  const page = await context.newPage()
  page.setDefaultTimeout(15000)
  await page.clock.setFixedTime(new Date(clock))
  const reads = [], writes = [], errors = []
  page.on('pageerror', e => errors.push(e.message))
  await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url())
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.hostname !== 'schedule-fixture.supabase.co') return route.abort()
    const table = url.pathname.split('/').pop()
    const send = (data, status = 200) => route.fulfill({ status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body: JSON.stringify(data) })
    const method = req.method()
    if (method === 'OPTIONS') return send([])
    const matches = row => [...url.searchParams].every(([key, val]) => {
      if (!(key in row)) return true
      if (val.startsWith('eq.')) return String(row[key]) === val.slice(3)
      if (val.startsWith('in.')) return val.slice(3).replace(/^\(|\)$/g, '').split(',').map(v => v.replace(/^"|"$/g, '')).includes(String(row[key]))
      if (val.startsWith('gte.')) return row[key] >= val.slice(4)
      if (val.startsWith('lte.')) return row[key] <= val.slice(4)
      return true
    })
    const dateParam = prefix => url.searchParams.getAll('date').find(v => v.startsWith(prefix))?.slice(prefix.length)
    if (method !== 'GET' && method !== 'HEAD') {
      const payload = req.postData() ? req.postDataJSON() : null
      writes.push({ table, method, payload, query: decodeURIComponent(url.search) })
      // §5 harness rule: the only writes a check may trigger.
      if (table === 'assignments' && method === 'POST') {
        const added = payload.map(a => ({ ...a, id: fixture.nextId() })); fixture.assignments.push(...added); return send(added, 201)
      }
      if (table === 'assignments' && method === 'DELETE') {
        const gone = fixture.assignments.filter(matches)
        fixture.assignments = fixture.assignments.filter(a => !gone.includes(a)); return send(gone)
      }
      if (table === 'crew_status' && method === 'POST') {
        for (const row of [].concat(payload)) {
          fixture.statuses = fixture.statuses.filter(s => !(s.crew_name === row.crew_name && s.date === row.date))
          fixture.statuses.push(row)
        }
        return send([], 201)
      }
      errors.push(`Unexpected write: ${method} ${table}`)
      return send({ message: 'Fixture refuses this write' }, 400)
    }
    reads.push({ table, gte: dateParam('gte.'), lte: dateParam('lte.'), in: dateParam('in.'), query: decodeURIComponent(url.search) })
    const single = req.headers().accept?.includes('vnd.pgrst.object')
    if (table === 'jobs') { const rows = fixture.jobs.filter(matches); return send(single ? rows[0] : rows) }
    if (table === 'job_mobilizations') return send(fixture.trips.filter(matches))
    if (table === 'crew') return send(fixture.crew)
    if (table === 'assignments') return send(fixture.assignments.filter(matches))
    if (table === 'crew_status') return send(fixture.statuses.filter(matches))
    if (table === 'proposals') return send(fixture.proposals)
    if (table === 'invoices') return send(fixture.invoices)
    return send(single ? null : [])
  })
  await page.goto(`${ORIGIN}/__sunday-parity?path=${encodeURIComponent(path)}`)
  return { page, context, fixture, reads, writes, errors }
}

const text = loc => loc.innerText().then(s => s.replace(/\s+/g, ' ').trim())
const texts = loc => loc.evaluateAll(els => els.map(el => el.innerText.replace(/\s+/g, ' ').trim()))
const weekReads = (reads, table) => reads.filter(r => r.table === table && r.gte && r.lte)
async function boardReady(page, label) {
  await page.waitForFunction(label => document.querySelector('.sch-wklbl')?.textContent === label && document.querySelector('.sch-board-row-wrap'), label)
}
const tripRow = (page, id) => page.locator(`[data-trip-row="${id}"]`)
const chip = (page, name) => page.locator('.sch-chip').filter({ hasText: name.split(', ').reverse().join(' ') })
async function noSidewaysScroll(page, what) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  assert(over <= 0, `${what}: page scrolls sideways by ${over}px`)
}
// Any element in `selector` whose content is wider than its box is clipped.
async function noClipped(page, selector, what) {
  const clipped = await page.locator(selector).evaluateAll(els => els.filter(el => el.scrollWidth > el.clientWidth + 1).map(el => el.className + ': ' + el.textContent))
  assert.deepEqual(clipped, [], `${what}: clipped text`)
}

// The Monday–Saturday part of the board, as text + markers, for "matches base".
async function boardMonSat(page) {
  return page.evaluate(() => [...document.querySelectorAll('[data-trip-row]')].map(row => ({
    row: row.getAttribute('data-trip-row') + ' ' + row.querySelector('.sch-brd-job-name').textContent,
    cells: [...row.querySelectorAll('.sch-board-row > .sch-brd-cell')].slice(0, 6).map(cell =>
      [...cell.querySelectorAll('*')].map(el => el.className + '=' + (el.children.length ? '' : el.textContent)).join('|')),
  })))
}

const snapshot = BASE ? {} : JSON.parse(readFileSync(SNAPSHOT, 'utf8'))
const same = (key, actual, msg) => {
  if (BASE) { snapshot[key] = actual; return }
  assert.deepEqual(actual, snapshot[key], `${msg} — differs from base (${key})`)
}

try {
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })

  // ── U1 / F — screenshots of the populated surfaces at both desktop widths ──
  const BASE_LABEL = BASE ? 'Sep 28 – Oct 3, 2026' : 'Sep 28 – Oct 4, 2026'
  for (const [width, height] of [[1440, 900], [1280, 800]]) {
    const s = await open('/schedule/schedule?week=2026-09-28', { width, height })
    await boardReady(s.page, BASE_LABEL)
    await s.page.screenshot({ path: resolve(SHOTS, `board-${width}.png`) })
    await s.page.locator('.hcs').screenshot({ path: resolve(SHOTS, `strip-${width}.png`) })
    if (!BASE) {
      await noSidewaysScroll(s.page, `board ${width}`)
      assert.equal(await s.page.locator('.sch-brd-hdr').count(), 7)
      assert.equal(await s.page.locator('.hcs-day').count(), 7)
      await noClipped(s.page, '.sch-brd-hdr, .sch-brd-cnt, .sch-brd-sub, .hcs-day-label, .hcs-day-count, .hcs-day-pct, .hcs-day-today-tag', `board ${width}`)
      // Every day column is the same width, so Sunday uses Saturday's treatment (F2).
      const widths = await s.page.locator('.sch-brd-hdr').evaluateAll(els => els.map(el => Math.round(el.getBoundingClientRect().width)))
      assert(Math.max(...widths) - Math.min(...widths) <= 1, `board ${width}: day columns differ in width ${widths}`)
      assert.equal(await s.page.locator('.sch-brd-hdr').nth(6).getAttribute('class'), await s.page.locator('.sch-brd-hdr').nth(5).getAttribute('class'))
      // Crew-pool day dots (F1/B11): all seven dots and day letters sit inside
      // their block and inside the chip's content box.
      const spill = await s.page.locator('.sch-chip').evaluateAll(chips => chips.flatMap(chip => {
        const name = chip.querySelector('.sch-chip-name').textContent, cs = getComputedStyle(chip)
        const inner = chip.getBoundingClientRect().right - parseFloat(cs.borderRightWidth) - parseFloat(cs.paddingRight)
        const out = [...chip.querySelectorAll('.sch-cdot, .sch-crew-day-letter')]
          .filter(el => el.getBoundingClientRect().right > inner + 0.5).map(el => `${name}: ${el.className} past the chip`)
        const wrap = chip.querySelector('.sch-crew-days-wrap')
        if (wrap && wrap.scrollWidth > wrap.clientWidth) out.push(`${name}: dots block overflows by ${wrap.scrollWidth - wrap.clientWidth}px`)
        for (const row of chip.querySelectorAll('.sch-crew-days')) if (row.querySelectorAll('.sch-cdot').length !== 7) out.push(`${name}: not seven dots`)
        return out
      }))
      assert.deepEqual(spill, [], `board ${width}: crew-pool day dots`)
      assert(await s.page.locator('.sch-chip .sch-crew-days').count() >= 8, 'pool chips with day dots are present')
      assert.deepEqual(s.errors, [])

      // Focused visual evidence (T4 round 1, P2).
      const shot = (loc, name) => loc.screenshot({ path: resolve(SHOTS, `${name}-${width}.png`) })
      await shot(s.page.locator('.sch-pool'), 'pool')
      await tripRow(s.page, 'A1').locator('.sch-brd-job-label').click()
      await tripRow(s.page, 'A1').locator('.sch-tg-row').first().waitFor()
      await tripRow(s.page, 'A1').getByRole('button', { name: /Deferred Start/ }).click()
      await tripRow(s.page, 'A1').locator('.sch-defer-day').first().waitFor()
      await tripRow(s.page, 'A1').locator('.sch-dzone').scrollIntoViewIfNeeded()
      await shot(tripRow(s.page, 'A1').locator('.sch-brd-detail'), 'expanded-row-toggles')
      await tripRow(s.page, 'A1').locator('.sch-brd-job-label').click()
      await chip(s.page, P.P1).dragTo(tripRow(s.page, 'A1').locator('.sch-brd-cell').first())
      await s.page.locator('.sch-modal').waitFor()
      await shot(s.page.locator('.sch-modal'), 'assign-picker')
      await s.page.locator('.sch-modal').getByRole('button', { name: 'Cancel', exact: true }).click()
      await chip(s.page, P.P6).dragTo(tripRow(s.page, 'C1').locator('.sch-brd-cell').first())
      await s.page.locator('.sch-modal').waitFor()
      await shot(s.page.locator('.sch-modal'), 'assign-picker-sunday-conflict')
      await s.page.locator('.sch-modal').getByRole('button', { name: 'Cancel', exact: true }).click()
      await chip(s.page, P.P2).hover()
      await chip(s.page, P.P2).getByTitle('Sick', { exact: true }).click()
      await shot(s.page.locator('.sch-modal'), 'sick-picker')
      await s.page.locator('.sch-modal-overlay').click({ position: { x: 5, y: 5 } })
      await chip(s.page, P.X).locator('.sch-chip-name').click()
      await shot(s.page.locator('.sch-modal-detail'), 'crew-week-popup')
      assert.equal(s.writes.length, 0, 'evidence capture writes nothing')
    }
    await s.context.close()

    const d = await open('/schedule/daily', { width, height })
    await d.page.locator('.dly-card').first().waitFor()
    await d.page.screenshot({ path: resolve(SHOTS, `daily-${width}.png`), fullPage: true })
    if (!BASE) {
      await noSidewaysScroll(d.page, `daily ${width}`)
      await noClipped(d.page, '.dly-hdr-day', `daily ${width}`)
      assert.deepEqual(d.errors, [])
    }
    await d.context.close()

    const c = await open('/schedule/calendar', { width, height })
    await c.page.getByRole('button', { name: 'Week', exact: true }).click()
    await c.page.locator('.cal-bar').first().waitFor()
    await c.page.screenshot({ path: resolve(SHOTS, `calendar-week-${width}.png`) })
    if (!BASE) {
      await noSidewaysScroll(c.page, `calendar ${width}`)
      assert.deepEqual(c.errors, [])
    }
    await c.context.close()
  }
  pass(BASE ? 'U1 base screenshots captured at 1440 and 1280' : 'F1/F2 seven day columns at 1440 and 1280: no sideways scroll, no clipped label, equal column widths, Sunday uses Saturday\'s classes; all seven crew-pool day dots sit inside their chip')

  const W = 'Sep 28 – Oct 4, 2026'
  const board = async (path = '/schedule/schedule?week=2026-09-28', label = W, opts) => {
    const s = await open(path, opts); await boardReady(s.page, label); return s
  }
  // Drag a pool chip onto a trip row; resolves with the day-picker modal.
  async function dragTo(page, name, tripId) {
    await chip(page, name).dragTo(tripRow(page, tripId).locator('.sch-brd-cell').first())
    const modal = page.locator('.sch-modal'); await modal.waitFor(); return modal
  }
  const dayChips = modal => modal.locator('.sch-modal-days > .sch-modal-day')
  const enabledDays = modal => dayChips(modal).evaluateAll(els => els.filter(el => el.style.opacity !== '0.3').map(el => el.firstChild.textContent))
  const selectedDays = modal => dayChips(modal).evaluateAll(els => els.filter(el => el.classList.contains('sch-modal-day-on')).map(el => el.firstChild.textContent))
  const assign = async modal => { await modal.getByRole('button', { name: 'Assign', exact: true }).click(); await modal.waitFor({ state: 'hidden' }) }
  const posts = s => s.writes.filter(w => w.table === 'assignments' && w.method === 'POST')
  const deletes = s => s.writes.filter(w => w.table === 'assignments' && w.method === 'DELETE')
  const deletedIds = w => /id=in\.\(([^)]*)\)/.exec(w.query)[1].split(',').map(Number)
  const dayCell = (page, tripId, i) => tripRow(page, tripId).locator('.sch-board-row > .sch-brd-cell').nth(i)
  const firstName = name => name.split(', ').reverse().join(' ')
  const noErrors = s => assert.deepEqual(s.errors, [])

  // ── values every later "matches base" check compares against ────────────────
  {
    const s = await board('/schedule/schedule?week=2026-09-28', BASE_LABEL)
    const cells = await boardMonSat(s.page)
    same('B13 board Mon–Sat cells', BASE ? cells : cells.filter(r => snapshot['B13 board Mon–Sat cells'].some(b => b.row === r.row)), 'Monday–Saturday board cells')
    same('B13 capacity Mon–Sat cards', (await texts(s.page.locator('.hcs-day'))).slice(0, 6), 'Monday–Saturday capacity cards')
    same('B6 P5 Saturday chip', await chip(s.page, P.P5).getAttribute('class'), 'P5 double-booked chip')
    const modal = await dragTo(s.page, P.P5, 'B1')
    same('B6 P5 Saturday picker conflict', await text(dayChips(modal).nth(5)), 'P5 Saturday picker chip')
    if (BASE) snapshot['B15 P8 chip on base'] = { cls: await chip(s.page, P.P8).getAttribute('class'), draggable: await chip(s.page, P.P8).getAttribute('draggable') }
    if (!BASE) {
      const c1 = cells.find(r => r.row.startsWith('C1 '))
      assert(c1.cells.every(c => c === 'sch-brd-empty=—'), 'B13 the Sunday-only trip adds nothing to Monday–Saturday')
    }
    await s.context.close()
  }

  if (!BASE) {
    // ── B1 / B14 / B2 ─────────────────────────────────────────────────────────
    {
      const s = await board()
      const { page } = s
      assert.deepEqual(await texts(page.locator('.sch-brd-hdr')), ['MON 09/28', 'TUE 09/29', 'WED 09/30', 'THU 10/01', 'FRI 10/02', 'SAT 10/03', 'SUN 10/04'])
      assert.equal(await page.locator('.hcs-week').textContent(), W)
      for (const table of ['assignments', 'crew_status']) {
        const r = weekReads(s.reads, table)
        assert(r.length > 0 && r.every(x => x.gte === '2026-09-28' && x.lte === '2026-10-04'), `${table} week read is Monday–Sunday: ${JSON.stringify(r)}`)
      }
      pass('B1 header MON 09/28 … SAT 10/03, SUN 10/04; label; week reads gte 2026-09-28 lte 2026-10-04')

      // B14 — saved Sunday rows show on first load, with reads only.
      assert.equal(s.writes.length, 0)
      assert.equal(await dayCell(page, 'C1', 6).locator('.sch-brd-cnt').innerText(), '2')
      assert.equal(await dayCell(page, 'A1', 6).locator('.sch-brd-cnt').innerText(), '2')
      assert.equal(await dayCell(page, 'A2', 6).locator('.sch-brd-cnt').innerText(), '1')
      const dots = name => chip(page, name).locator('.sch-cdot').evaluateAll(els => els.map(el => el.className.replace('sch-cdot ', '')))
      assert.deepEqual((await dots(P.P7)).slice(-1), ['sch-cdot-on'])
      assert.deepEqual((await dots(P.P3)).slice(-1), ['sch-cdot-soff'])
      assert.deepEqual(await dots(P.P9), Array(7).fill('sch-cdot-soff'))
      assert.equal(await text(page.locator('.hcs-day').nth(6)), '5 2 SUN 4 3 / 8 38%')
      pass('B14 existing Sunday crew days and Scheduled Off show in the Sunday column, pool dots and SUN 4 card; reads only')

      // B10 — capacity strip.
      assert.deepEqual(await texts(page.locator('.hcs-day-label')), ['MON 28', 'TUE 29', 'WED 30', 'THU 1', 'FRI 2', 'SAT 3', 'SUN 4'])
      // Fixture truth. Saturday: 10 crew, 3 out, 2 assigned. Sunday: 10 crew, 2 out, 3 assigned.
      assert.equal(await text(page.locator('.hcs-day').nth(5)), '5 3 SAT 3 2 / 7 29%')
      assert.equal(await text(page.locator('.hcs-day').nth(6)), '5 2 SUN 4 3 / 8 38%')
      await page.locator('.hcs-day').nth(6).click()
      const detail = await page.locator('.sch-modal').innerText()
      assert.match(detail, /^SUN 10\/4\nAvailable \(5\)/)
      assert.match(detail, /Assigned \(3\)\n• Uma Fir → 8101 · A1 main; 8103 · C1 Sunday\n• Vic Gum → 8103 · C1 Sunday\n• Xan Hazel → 8101 · A1 main; 8101 · A2 weekend\nOut \(2\)\n• Ray Cedar \(Scheduled Off\)\n• Yael Juniper \(Scheduled Off\)/)
      await page.getByRole('button', { name: 'CLOSE', exact: true }).click()
      const badge = async label => {
        await page.getByRole('button', { name: new RegExp(label) }).click()
        const dialog = page.getByRole('dialog'), body = await dialog.innerText()
        await dialog.getByRole('button', { name: 'Close', exact: true }).click(); return body
      }
      assert.match(await badge('Jobs Starting'), /8103 — Job C\nC1 Sunday →\nOct 4, 2026/)
      assert.match(await badge('Jobs Ending'), /8103 — Job C\nC1 Sunday →\nOct 4, 2026/)
      const needs = await badge('Jobs Needing Crew')
      assert.match(needs, /A1 main →\nOct 3, 2026 · 2 \/ 3 assigned · needs 1 more\nA1 main →\nOct 4, 2026 · 2 \/ 3 assigned · needs 1 more/)
      assert.match(needs, /A2 weekend →\nOct 3, 2026 · 1 \/ 2 assigned · needs 1 more\nA2 weekend →\nOct 4, 2026 · 1 \/ 2 assigned · needs 1 more/)
      pass('B10 seven capacity cards; SUN 4 computed as SAT 3; day detail; Jobs Starting/Ending include job C; job A lists Sunday Oct 4 beside Saturday Oct 3')

      // B11 — pool dots, crew week popup, deferred-start chips.
      assert.equal(await text(chip(page, P.X).locator('.sch-crew-days-heading')), 'M T W T F S S')
      assert.equal(await chip(page, P.X).locator('.sch-crew-days').first().locator('.sch-cdot').count(), 7)
      await chip(page, P.X).locator('.sch-chip-name').click()
      const popup = page.locator('.sch-modal-detail')
      const cols = await popup.locator('div[style*="grid-template-columns"]').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)
      assert.equal(cols, 8, 'crew week popup: name column + seven days')
      assert.match(await popup.innerText(), /SAT\n03\nSUN\n04\nSTATUS/)
      await popup.getByRole('button', { name: 'Close', exact: true }).click()
      await tripRow(page, 'A1').locator('.sch-brd-job-label').click()
      await tripRow(page, 'A1').getByRole('button', { name: /Deferred Start/ }).click()
      assert.deepEqual(await texts(tripRow(page, 'A1').locator('.sch-defer-day')), ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'])
      assert.deepEqual(await texts(tripRow(page, 'A1').locator('.sch-tg-day-hdr')), ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'])
      pass('B11 pool dots under M T W T F S S; crew week popup has seven day columns ending SUN 04; deferred-start chips include Su')

      // B6 — double-booking on Sunday mirrors Saturday.
      assert.match(await chip(page, P.P6).getAttribute('class'), /sch-chip-db/)
      assert.equal(await chip(page, P.P6).locator('.sch-db-tag').innerText(), '2X')
      for (const trip of ['A1', 'C1']) assert.equal(await dayCell(page, trip, 6).locator('.sch-brd-bar-db').count(), 1, `${trip} Sunday cell is marked double-booked`)
      for (const trip of ['A1', 'B1']) assert.equal(await dayCell(page, trip, 5).locator('.sch-brd-bar-db').count(), 1, `${trip} Saturday cell is marked double-booked`)
      await tripRow(page, 'A1').locator('.sch-brd-job-label').click()
      const modal = await dragTo(page, P.P6, 'C1')
      assert.match(await text(dayChips(modal).nth(6)), /^SUN 04 8101$/)
      assert.match(await dayChips(modal).nth(6).getAttribute('class'), /sch-modal-day-conflict/)
      pass('B6 P6 shows 2X, both Sunday cells carry the double-booked marking, the picker names the other job; P5 on Saturday matches base')
      noErrors(s)
      await s.context.close()

      const next = await board('/schedule/schedule?week=2026-10-05', 'Oct 5 – Oct 11, 2026')
      assert.equal(await tripRow(next.page, 'B1').count() + await tripRow(next.page, 'C1').count(), 0)
      assert.equal(await tripRow(next.page, 'A1').count(), 1)
      await next.context.close()
      pass('B2 Saturday-only B1 and Sunday-only C1 are rows on the week of 2026-09-28, not on 2026-10-05')
    }

    // ── B3 — assign, identical for Sunday and Saturday ────────────────────────
    for (const [trip, jobId, date, dayIndex, name, teamId] of [
      ['C1', 3, SUN, 6, P.P1, P1_TEAM_ID], ['B1', 2, SAT, 5, P.P1, P1_TEAM_ID], ['C1', 3, SUN, 6, P.P2, null], ['B1', 2, SAT, 5, P.P2, null]]) {
      const s = await board()
      const before = Number(await dayCell(s.page, trip, dayIndex).locator('.sch-brd-cnt').innerText())
      const modal = await dragTo(s.page, name, trip)
      assert.equal(await dayChips(modal).count(), 7)
      assert.deepEqual(await enabledDays(modal), [dayIndex === 6 ? 'Sun' : 'Sat'])
      await dayChips(modal).nth(dayIndex).click()
      await assign(modal)
      assert.equal(s.writes.length, 1)
      assert.deepEqual(posts(s)[0].payload, [{ job_id: jobId, mobilization_id: trip, crew_name: name, date, team_member_id: teamId }])
      await s.page.waitForFunction(([sel, n]) => document.querySelector(sel)?.textContent === String(n),
        [`[data-trip-row="${trip}"] .sch-board-row > .sch-brd-cell:nth-child(${dayIndex + 2}) .sch-brd-cnt`, before + 1])
      noErrors(s); await s.context.close()
    }
    pass('B3 assign on a Sunday-only trip: seven chips, only Sun enabled, exactly one POST with the trip id and team_member_id; Saturday identical; unlinked person posts team_member_id null')

    // ── B4 — edit and remove through the expanded row ─────────────────────────
    {
      const s = await board()
      const { page } = s
      const a1 = tripRow(page, 'A1')
      await a1.locator('.sch-brd-job-label').click()
      const toggle = (name, i) => a1.locator('.sch-tg-row').filter({ hasText: firstName(name) }).locator('.sch-tg-days > div').nth(i)
      for (const [name, i, date] of [[P.P5, 6, SUN], [P.P6, 5, SAT]]) {
        const start = s.writes.length
        await toggle(name, i).click()
        await page.waitForFunction(([row, i]) => [...document.querySelectorAll('[data-trip-row="A1"] .sch-tg-row')].find(r => r.textContent.includes(row))?.querySelectorAll('.sch-tg-days > div')[i]?.classList.contains('sch-tg-day-on'), [firstName(name), i])
        assert.equal(s.writes.length, start + 1)
        assert.deepEqual(s.writes.at(-1).payload.map(r => [r.mobilization_id, r.crew_name, r.date]), [['A1', name, date]])
        const added = s.fixture.assignments.at(-1).id
        await toggle(name, i).click()
        await page.waitForFunction(([row, i]) => ![...document.querySelectorAll('[data-trip-row="A1"] .sch-tg-row')].find(r => r.textContent.includes(row))?.querySelectorAll('.sch-tg-days > div')[i]?.classList.contains('sch-tg-day-on'), [firstName(name), i])
        assert.equal(s.writes.length, start + 2)
        assert.equal(s.writes.at(-1).method, 'DELETE')
        assert.deepEqual(deletedIds(s.writes.at(-1)), [added])
        await page.waitForTimeout(250)   // let the post-save reload land
      }
      // ✕ removes only that person's own rows on that trip.
      const xOnA1 = s.fixture.assignments.filter(a => a.crew_name === P.X && a.mobilization_id === 'A1').map(a => a.id).sort()
      const xOnA2 = s.fixture.assignments.filter(a => a.crew_name === P.X && a.mobilization_id === 'A2')
      await a1.locator('.sch-tg-row').filter({ hasText: firstName(P.X) }).locator('.sch-tg-x').click()
      await page.waitForFunction(name => ![...document.querySelectorAll('[data-trip-row="A1"] .sch-tg-row')].some(r => r.textContent.includes(name)), firstName(P.X))
      assert.deepEqual(deletedIds(s.writes.at(-1)).sort(), xOnA1)
      assert.deepEqual(s.fixture.assignments.filter(a => a.crew_name === P.X && a.mobilization_id === 'A2'), xOnA2)
      noErrors(s); await s.context.close()
      pass('B4 Su toggle sends one POST for 2026-10-04 and one DELETE naming that row id; Sa the same for 2026-10-03; ✕ deletes only that person\'s rows on that trip')
    }

    // ── B5 — Select all follows Saturday's rule ───────────────────────────────
    for (const [name, label, expected] of [
      [P.P1, 'Select all 7', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']],
      [P.P3, 'Select all 6', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']],
      [P.P4, 'Select all 6', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sun']]]) {
      const s = await board()
      const modal = await dragTo(s.page, name, 'A1')
      await modal.getByRole('button', { name: label, exact: true }).click()
      assert.deepEqual(await selectedDays(modal), expected)
      if (name !== P.P1) {
        // Picking the out day by hand still saves, as today.
        const out = name === P.P3 ? 6 : 5
        await dayChips(modal).nth(out).click()
        await assign(modal)
        assert.deepEqual(posts(s)[0].payload.map(r => r.date).sort(), WEEK)
      } else {
        await modal.getByRole('button', { name: 'Clear all', exact: true }).click()
        assert.deepEqual(await selectedDays(modal), [])
      }
      noErrors(s); await s.context.close()
    }
    pass('B5 Select all: 7 for a free person, 6 leaving Sunday out for Scheduled Off Sunday, 6 leaving Saturday out for Sick Saturday; the out day still saves by hand')

    // ── B7 — overlapping trips keep row ownership ─────────────────────────────
    {
      const s = await board()
      const { page } = s
      const xA1Sun = s.fixture.assignments.find(a => a.crew_name === P.X && a.mobilization_id === 'A1' && a.date === SUN)
      const xA2Sun = s.fixture.assignments.find(a => a.crew_name === P.X && a.mobilization_id === 'A2' && a.date === SUN)
      await tripRow(page, 'A2').locator('.sch-brd-job-label').click()
      const su = tripRow(page, 'A2').locator('.sch-tg-row').filter({ hasText: firstName(P.X) }).locator('.sch-tg-days > div').nth(6)
      await su.click()
      await page.waitForFunction(() => !document.querySelector('[data-trip-row="A2"] .sch-tg-row .sch-tg-days > div:nth-child(7)')?.classList.contains('sch-tg-day-on'))
      assert.equal(s.writes.length, 1)
      assert.deepEqual(deletedIds(s.writes[0]), [xA2Sun.id])
      assert.deepEqual(s.fixture.assignments.find(a => a.id === xA1Sun.id), xA1Sun, 'A1\'s Sunday row keeps its id and date')
      await tripRow(page, 'A2').locator('.sch-brd-job-label').click()
      const modal = await dragTo(page, P.X, 'A2')
      assert.match(await text(dayChips(modal).nth(6)), /8101 \(another trip\)/)
      noErrors(s); await s.context.close()
      pass('B7 turning Su off on A2 deletes that one row id; A1\'s Sunday row is untouched; the picker labels Sunday "(another trip)"')
    }

    // ── B8 — status picker ────────────────────────────────────────────────────
    {
      const s = await board()
      const { page } = s
      await chip(page, P.P2).hover()
      await chip(page, P.P2).getByTitle('Sick', { exact: true }).click()
      const modal = page.locator('.sch-modal')
      assert.deepEqual(await texts(dayChips(modal)), ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'])
      await dayChips(modal).nth(6).click()
      await modal.getByRole('button', { name: 'DONE', exact: true }).click()
      await page.waitForFunction(() => document.querySelectorAll('.hcs-day')[6]?.querySelector('.hcs-day-off')?.textContent === '3')
      assert.deepEqual(s.writes.map(w => [w.table, w.method, w.payload]), [['crew_status', 'POST', [{ crew_name: P.P2, status: 'sick', date: SUN }]]])
      const statusRow = async name => {
        await chip(page, name).locator('.sch-chip-name').click()
        const popup = page.locator('.sch-modal-detail')
        const cells = await popup.locator('div[style*="grid-template-columns"] > div').evaluateAll(els => els.map(el => el.innerText.replace(/\s+/g, ' ').trim()))
        await popup.getByRole('button', { name: 'Close', exact: true }).click()
        return cells.slice(cells.indexOf('STATUS') + 1, cells.indexOf('STATUS') + 8)
      }
      const p2 = await statusRow(P.P2), p4 = await statusRow(P.P4)
      assert.match(p2[6], /sick/i)
      assert.equal(p2[6], p4[5], 'SICK under SUN reads as SICK under SAT does')
      noErrors(s); await s.context.close()
      pass('B8 Sick picker shows seven chips; Sun writes one crew_status row for 2026-10-04; the Sunday Out count rises; the popup shows SICK under SUN')
    }

    // ── B9 — Scheduled Off presets and review ─────────────────────────────────
    {
      const s = await board()
      const { page } = s
      await chip(page, P.X).hover()
      await chip(page, P.X).getByTitle('Scheduled Off', { exact: true }).click()
      const modal = page.locator('.sch-modal')
      const range = () => modal.locator('input[type=date]').evaluateAll(els => els.map(el => el.value))
      await modal.getByRole('button', { name: 'Next Week', exact: true }).click()
      assert.deepEqual(await range(), ['2026-10-05', '2026-10-11'])
      await modal.getByRole('button', { name: 'This Week', exact: true }).click()
      assert.deepEqual(await range(), ['2026-09-28', '2026-10-04'])
      await modal.getByRole('button', { name: 'Schedule Off', exact: true }).click()
      await modal.getByRole('button', { name: 'Confirm Scheduled Off', exact: true }).waitFor()
      assert.match(await modal.innerText(), /Existing job assignments will remain unchanged[\s\S]*Oct 3: 8101 — Job A\nOct 4: 8101 — Job A\n\nWill mark 7 days as Scheduled Off\./)
      assert.equal(s.writes.length, 0)
      const before = JSON.stringify(s.fixture.assignments)
      await modal.getByRole('button', { name: 'Confirm Scheduled Off', exact: true }).click()
      await modal.waitFor({ state: 'hidden' })
      assert.deepEqual(s.writes.map(w => [w.table, w.method]), [['crew_status', 'POST']])
      assert.deepEqual(s.writes[0].payload.map(r => r.date), WEEK)
      assert.equal(JSON.stringify(s.fixture.assignments), before, 'Saturday and Sunday assignments are unchanged')
      noErrors(s); await s.context.close()
      pass('B9 This Week fills 2026-09-28 → 2026-10-04, Next Week 2026-10-05 → 2026-10-11; the review lists the Saturday and Sunday assignments and changes neither')
    }

    // ── B12 — week edges ──────────────────────────────────────────────────────
    for (const [week, label, last, lte] of [
      ['2026-10-26', 'Oct 26 – Nov 1, 2026', 'SUN 11/01', '2026-11-01'],
      ['2026-12-28', 'Dec 28 – Jan 3, 2027', 'SUN 01/03', '2027-01-03'],
      ['2027-03-08', 'Mar 8 – Mar 14, 2027', 'SUN 03/14', '2027-03-14']]) {
      const s = await open(`/schedule/schedule?week=${week}`)
      await s.page.waitForFunction(label => document.querySelector('.sch-wklbl')?.textContent === label && document.querySelector('.sch-brd-hdr'), label)
      const hdr = await texts(s.page.locator('.sch-brd-hdr-date'))
      const expected = Array.from({ length: 7 }, (_, i) => { const d = new Date(`${week}T12:00:00`); d.setDate(d.getDate() + i); return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}` })
      assert.deepEqual(hdr, expected, `${week}: seven consecutive dates, none repeated or skipped`)
      assert.equal((await texts(s.page.locator('.sch-brd-hdr'))).at(-1), last)
      const r = weekReads(s.reads, 'assignments')
      assert(r.every(x => x.gte === week && x.lte === lte), `${week}: ${JSON.stringify(r)}`)
      await s.context.close()
    }
    {
      const s = await board()
      await s.page.locator('.sch-wknav').getByRole('button', { name: 'Next', exact: true }).click()
      await boardReady(s.page, 'Oct 5 – Oct 11, 2026')
      assert.deepEqual((await texts(s.page.locator('.sch-brd-hdr'))).map(t => t.slice(4)), ['10/05', '10/06', '10/07', '10/08', '10/09', '10/10', '10/11'])
      assert.equal(await tripRow(s.page, 'C1').count(), 0)
      assert.equal(await s.page.locator('.sch-brd-cnt').count(), 0, 'the 2026-10-04 crew days are not on the next week')
      await s.context.close()
    }
    pass('B12 week edges: fall-back, year end and spring-forward weeks each show seven consecutive dates ending Sunday; Next loads 10/05 … 10/11')

    // ── B15 — saved Monday–Saturday time off ──────────────────────────────────
    {
      const s = await board()
      const { page } = s
      assert.match(snapshot['B15 P8 chip on base'].cls, /sch-chip-out/, 'on base P8 is greyed')
      assert.equal(snapshot['B15 P8 chip on base'].draggable, 'false', 'on base P8 cannot be dragged')
      assert.doesNotMatch(await chip(page, P.P8).getAttribute('class'), /sch-chip-out/)
      assert.equal(await chip(page, P.P8).getAttribute('draggable'), 'true')
      assert.equal(await chip(page, P.P8).locator('.sch-sbtn').count(), 4, 'Sick / Call In / No Show / Off buttons')
      assert.deepEqual(await chip(page, P.P8).locator('.sch-cdot').evaluateAll(els => els.map(el => el.className.replace('sch-cdot ', ''))),
        [...Array(6).fill('sch-cdot-soff'), 'sch-cdot-off'])
      const modal = await dragTo(page, P.P8, 'A1')
      const chips = await texts(dayChips(modal))
      assert(chips.slice(0, 6).every(c => /Scheduled Off/.test(c)), `Monday–Saturday marked Scheduled Off: ${chips}`)
      assert.equal(chips[6], 'SUN 04')
      assert.match(await chip(page, P.P9).getAttribute('class'), /sch-chip-out/)
      assert.equal(await chip(page, P.P9).getAttribute('draggable'), 'false')
      noErrors(s); await s.context.close()
      pass('B15 P8 (off Monday–Saturday) is a normal draggable chip with six off dots and an open Sunday; P9 (off all seven) stays greyed')
    }
    pass('B13 Monday–Saturday board cells, counts, markers and capacity cards match base (day columns; P8\'s chip is B15)')

    // ── H — Home and Jobs ─────────────────────────────────────────────────────
    {
      const cards = ['8 2 MON 28 0 / 8 0%', '8 2 TUE 29 0 / 8 0%', '8 2 WED 30 0 / 8 0%', '8 2 THU 1 0 / 8 0% TODAY', '8 2 FRI 2 0 / 8 0%', '5 3 SAT 3 2 / 7 29%', '5 2 SUN 4 3 / 8 38%']
      for (const path of ['/schedule/jobs', '/schedule/calendar']) {
        const s = await open(path)
        await s.page.waitForFunction(() => document.querySelectorAll('.hcs-day').length > 0)
        assert.deepEqual(await texts(s.page.locator('.hcs-day')), cards, path)
        await s.context.close()
      }
      pass('H1 Jobs and the Calendar band show seven capacity cards; SUN 4 is computed as SAT 3 is')
      const s = await open('/schedule/home')
      await s.page.getByText('Crew Capacity', { exact: true }).waitFor()
      const body = await s.page.locator('body').innerText()
      const mean = Math.round([0, 0, 0, 0, 0, 29, 38].reduce((a, b) => a + b, 0) / 7)
      assert.match(body, new RegExp(`CREW CAPACITY\\n${mean}%\\nThis week · Sep 28 – Oct 4`))
      const weekRows = s.fixture.assignments.filter(a => a.date >= WEEK[0] && a.date <= SUN).length
      assert.match(body, new RegExp(`\\n${weekRows}\\nCrew assignments\\nThis week`))
      for (const table of ['assignments', 'crew_status']) assert(weekReads(s.reads, table).every(r => r.lte === '2026-10-04'))
      noErrors(s); await s.context.close()
      pass(`H2 Home: Crew Capacity ${mean}% is the rounded mean of the seven day percentages; Crew assignments counts the Sunday rows (${weekRows}); reads end lte 2026-10-04`)
    }
  }

  // ── K — Calendar ────────────────────────────────────────────────────────────
  const calHeader = page => page.locator('.cal-wrapper').evaluate(el => [...el.querySelectorAll('div')].filter(d => !d.children.length && /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) \d+$/.test(d.textContent)).map(d => d.textContent))
  const calBars = page => page.locator('.cal-bar').evaluateAll(els => els.map(el => `${el.style.gridColumn} | ${el.title}`))
  // Week-view bars by the days they cover, so a base week that had an extra
  // Sunday column before Monday still compares day for day.
  const calBarDays = async page => {
    const header = await calHeader(page)
    return (await calBars(page)).map(b => { const [, from, to, title] = /^(\d+) \/ (\d+) \| (.*)$/.exec(b); return `${header[from - 1]} – ${header[to - 2]} | ${title}` })
  }
  const calLabel = page => page.locator('.cal-toolbar > span').first().innerText()
  {
    const s = await open('/schedule/calendar')
    const { page } = s
    await page.locator('.cal-bar').first().waitFor()
    same('K3 October 2026 month view', { label: await calLabel(page), bars: await calBars(page) }, 'Month view')
    await page.getByRole('button', { name: 'Week', exact: true }).click()
    await page.waitForFunction(() => /^Mon 28/.test([...document.querySelectorAll('.cal-wrapper div')].find(d => !d.children.length && /^Mon \d+$/.test(d.textContent))?.textContent || ''))
    const nBars = bars => bars.filter(b => /8104 · Job N/.test(b))
    same('K2 job N, week of 2026-09-28', nBars(await calBarDays(page)), 'Job N week segment')
    if (!BASE) {
      assert.deepEqual(await calHeader(page), ['Mon 28', 'Tue 29', 'Wed 30', 'Thu 1', 'Fri 2', 'Sat 3', 'Sun 4'])
      assert.equal(await calLabel(page), 'SEP 28 – OCT 4, 2026')
      const bars = await calBars(page)
      assert(bars.includes('7 / 8 | 8103 · Job C — 2 crew — Hazel, Xan'), `job C draws a bar in Sun 4: ${bars}`)
      assert(bars.includes('1 / 8 | 8101 · Job A — Hazel, Xan'), 'job A runs through Sat 3 and Sun 4')
      assert(nBars(bars).every(b => b.startsWith('1 / 6 |')), 'job N covers Mon 28 – Fri 2 only')
    }
    await page.getByRole('button', { name: 'Next', exact: true }).click()
    await page.waitForFunction(() => [...document.querySelectorAll('.cal-wrapper div')].some(d => !d.children.length && d.textContent === 'Mon 5'))
    same('K2 job N, week of 2026-10-05', nBars(await calBarDays(page)), 'Job N week segment')
    if (!BASE) {
      // A week with no Sunday crew shows the same seven columns.
      assert.deepEqual(await calHeader(page), ['Mon 5', 'Tue 6', 'Wed 7', 'Thu 8', 'Fri 9', 'Sat 10', 'Sun 11'])
      assert((nBars(await calBars(page))).every(b => b.startsWith('1 / 6 |')), 'job N covers Mon 5 – Fri 9')
      pass('K1 Week view is Mon 28 … Sat 3, Sun 4 with no column before Monday; label Sep 28 – Oct 4, 2026; an empty-Sunday week shows the same seven columns')
      pass('K2 job C draws a bar in Sun 4; job A runs through Sat 3 and Sun 4; job N covers Monday–Friday in both weeks and matches base')
      pass('K3 Month view for October 2026 matches base')
      // K4 — four more Next presses reach the week of 2026-11-02.
      for (const monday of ['Mon 12', 'Mon 19', 'Mon 26', 'Mon 2']) {
        await page.getByRole('button', { name: 'Next', exact: true }).click()
        await page.waitForFunction(m => [...document.querySelectorAll('.cal-wrapper div')].some(d => !d.children.length && d.textContent === m), monday)
      }
      assert.deepEqual(await calHeader(page), ['Mon 2', 'Tue 3', 'Wed 4', 'Thu 5', 'Fri 6', 'Sat 7', 'Sun 8'])
      await page.waitForFunction(() => [...document.querySelectorAll('.cal-bar')].some(b => /8107 · Job D/.test(b.title)))
      const calRead = s.reads.filter(r => r.table === 'assignments' && r.query.includes('select=job_id,crew_name,date')).at(-1)
      assert.equal(calRead.lte, '2026-11-08', 'October\'s grid ends Sat 11-07; the read must reach Sunday 11-08')
      assert((await calBars(page)).some(b => b.startsWith('7 / 8 | 8107 · Job D')), 'job D draws a bar in Sun 8')
      pass('K4 week of 2026-11-02 (Sunday outside October\'s month grid): the read carries lte 2026-11-08 and job D draws a bar in Sun 8')
      noErrors(s)
    }
    await s.context.close()
  }

  // ── T1 / L1 — values that must match base ───────────────────────────────────
  const weeklyText = async path => {
    const s = await open(path)
    const select = s.page.getByLabel('Crew member'); await select.waitFor()
    await select.selectOption({ label: firstName(P.X) })
    const area = s.page.locator('textarea').first()   // on the phone it sits inside a closed <details>
    await s.page.waitForFunction(name => document.querySelector('textarea')?.value.includes(name), firstName(P.X))
    const value = await area.inputValue(); await s.context.close(); return value
  }
  {
    const desktop = await weeklyText('/schedule/schedules?week=2026-09-28')
    const phone = await weeklyText('/crew?week=2026-09-28')
    assert.match(desktop, /SATURDAY, OCT 3[\s\S]*SUNDAY, OCT 4/)
    same('T1 weekly text, desktop', desktop, 'Weekly send text')
    same('T1 weekly text, phone', phone, 'Weekly send text on /crew')
    if (!BASE) pass('T1 Weekly send text matches base on /schedule/schedules and /crew')

    const s = await open('/schedule/billing?tab=worklist')
    await s.page.getByText(/Total to bill —/).waitFor()
    await s.page.getByText('Job R').first().waitFor()
    const body = (await s.page.locator('.bill-picker, .jh-picker').first().innerText())
    const header = await s.page.locator('.bill-picker-sum-lbl').innerText()
    same('L1 worklist rows and amounts', body.replace(header, '<week label>'), 'Billing worklist')
    await s.page.getByRole('button', { name: 'Forecast', exact: true }).click()
    await s.page.locator('.bf-bucket').first().waitFor()
    const buckets = await s.page.locator('.bf-bucket').evaluateAll(els => els.map(el => ({ wk: el.querySelector('.bf-bucket-wk')?.textContent || el.textContent, amt: el.querySelector('.bf-bucket-amt')?.textContent, cnt: el.querySelector('.bf-bucket-cnt')?.textContent })))
    same('L1 forecast bucket amounts', buckets.map(b => [b.amt, b.cnt]), 'Forecast buckets')
    if (!BASE) {
      assert.equal(header.toUpperCase(), 'TOTAL TO BILL — SEP 28 – OCT 4, 2026')
      const weekly = buckets.filter(b => /^[A-Z][a-z]{2} \d+ – [A-Z][a-z]{2} \d+, \d{4}$/.test(b.wk))
      assert(weekly.length > 0)
      for (const b of weekly) {
        const [from, to] = b.wk.replace(/, (\d{4})$/, '').split(' – ').map((d, i) => new Date(`${d}, ${b.wk.slice(-4)} 12:00`))
        assert.equal(from.getDay(), 1, b.wk); assert.equal(to.getDay(), 0, b.wk)
      }
      noErrors(s)
      pass('L1 Billing header reads "Total to bill — Sep 28 – Oct 4, 2026"; forecast buckets read Monday – Sunday; rows, statuses and dollar figures match base, job R included')
    }
    await s.context.close()
  }

  // ── W — week links (S10). Monday links must open the same week as base. ─────
  const opened = async (path, clock) => {
    const s = await open(path, clock ? { clock } : undefined)
    await s.page.waitForFunction(() => document.querySelector('.sch-wklbl') && document.querySelector('.sch-brd-hdr'))
    await s.page.waitForTimeout(600)   // let any second ?week= pass settle
    const result = { monday: (await texts(s.page.locator('.sch-brd-hdr'))).at(0), gte: [...new Set(weekReads(s.reads, 'assignments').map(r => r.gte))] }
    const focused = await s.page.locator('.sch-label-focused').count()
    await s.context.close(); return { ...result, focused }
  }
  const DEC = '2026-12-01T12:00:00-08:00'
  const mondayLinks = [['2026-10-05', undefined], ['2026-10-26', DEC], ['2027-03-15', DEC], ['2026-11-30', DEC], ['2027-03-08', DEC]]
  for (const [week, clock] of mondayLinks) {
    const got = await opened(`/schedule/schedule?week=${week}`, clock)
    if (!BASE) assert.deepEqual(got.gte, [week], `Monday link ${week} opens its own week and sends no other week's read`)
    same(`W Monday link ${week}${clock ? ', standard-time clock' : ''}`, { monday: got.monday, gte: got.gte.at(-1) }, `Monday link ${week}`)
  }
  if (!BASE) {
    // W2 — direct non-Monday links, clock Thursday 2026-10-01.
    for (const week of ['2026-10-04', '2026-10-02', '2026-10-03']) {
      const got = await opened(`/schedule/schedule?week=${week}`)
      assert.equal(got.monday, 'MON 09/28', week)
      // Tighter than the plan's wording: no read for any other week is ever sent.
      assert.deepEqual(got.gte, ['2026-09-28'], `?week=${week} must not read another week`)
    }
    pass('W2 ?week=2026-10-04 / -10-02 / -10-03 open the week of 2026-09-28 and send no read for another week; ?week=2026-10-05 opens 2026-10-05 as on base')
    // W1 — the link the Trips panel builds (TripsPanel.jsx:100, unchanged): job, week=<trip start>, trip.
    for (const [trip, jobId, start] of [['A2', 1, SAT], ['C1', 3, SUN]]) {
      const got = await opened(`/schedule/schedule?job=${jobId}&week=${start}&trip=${trip}`)
      assert.equal(got.monday, 'MON 09/28'); assert.equal(got.focused, 1, `${trip} row is the focused row`)
    }
    {
      const fixture = makeFixture()
      fixture.trips.push({ id: 'F1', job_id: 4, seq: 2, label: 'F1 Friday start', start_date: '2026-10-02', end_date: '2026-10-02', crew_needed: 1 })
      const s = await open('/schedule/schedule?job=4&week=2026-10-02&trip=F1', { fixture })
      await boardReady(s.page, W)
      await tripRow(s.page, 'F1').locator('.sch-label-focused').waitFor()
      await s.context.close()
    }
    pass('W1 the Trips panel link for a trip starting Fri 10-02, Sat 10-03 or Sun 10-04 opens the week of 2026-09-28 with that row focused')
    // W3 — clock in standard time, Tuesday 2026-12-01.
    for (const [week, monday] of [['2026-11-01', '2026-10-26'], ['2027-03-21', '2027-03-15'], ['2026-12-06', '2026-11-30']]) {
      const got = await opened(`/schedule/schedule?week=${week}`, DEC)
      assert.deepEqual(got.gte, [monday], `?week=${week} opens ${monday}`)
    }
    pass('W3 standard-time clock: Monday links to daylight- and standard-time dates open their own week as on base; other days open the week that contains them')

    // ── D — Daily ─────────────────────────────────────────────────────────────
    {
      const s = await open('/schedule/daily')
      const { page } = s
      await page.locator('.dly-card').first().waitFor()
      assert.deepEqual(await texts(page.locator('.dly-hdr').first().locator('.dly-hdr-day')), ['MON 9/28', 'TUE 9/29', 'WED 9/30', 'THU 10/1', 'FRI 10/2', 'SAT 10/3', 'SUN 10/4'].map(x => x))
      assert.match((await page.locator('body').innerText()), /SEP 28 - OCT 4, 2026/i)
      const dailyReads = s.reads.filter(r => (r.table === 'assignments' || r.table === 'crew_status') && r.in)
      assert(dailyReads.length >= 2 && dailyReads.every(r => r.in.includes('2026-10-04')), JSON.stringify(dailyReads))
      const card = name => page.locator('.dly-card').filter({ hasText: name })
      const rowCells = (scope, name) => scope.locator('.dly-row').filter({ hasText: name }).first().locator('.dly-cell').evaluateAll(els => els.map(el => el.innerText.trim()))
      assert.equal((await rowCells(card('Job C'), P.P7)).at(-1), '✓')
      assert.equal((await rowCells(card('Job C'), P.P6)).at(-1), '2X')
      const aStaffing = await card('Job A').locator('.dly-gap-row .dly-cell').evaluateAll(els => els.map(el => el.innerText.trim()))
      assert.equal(aStaffing.length, 7); assert.equal(aStaffing[6], aStaffing[5], 'job A staffing shows Sunday the way it shows Saturday')
      const soff = page.locator('.dly-status').filter({ hasText: 'Scheduled Off' })
      assert.equal((await rowCells(soff, P.P3)).at(-1), 'Off')
      assert.equal(await soff.locator('.dly-hdr-day').count(), 7)
      noErrors(s); await s.context.close()
      pass('D1/D2 Daily has seven day columns Mon 9/28 … Sun 10/4, label "Sep 28 - Oct 4, 2026", reads include 2026-10-04; job C shows ✓ for P7 and 2X for P6; P3 is Off under Sun')
    }

    // ── X — prints ────────────────────────────────────────────────────────────
    {
      const s = await board()
      const { page, context } = s
      const print = async label => {
        const start = s.reads.length
        await page.getByRole('button', { name: /Actions/ }).click()
        await page.getByRole('button', { name: /Export/ }).click()
        const [popup] = await Promise.all([context.waitForEvent('page'), page.locator('.mwt-row').filter({ hasText: label }).click()])
        await popup.waitForLoadState()
        await popup.setViewportSize({ width: 1000, height: 700 })
        await popup.screenshot({ path: resolve(SHOTS, `print-${label.toLowerCase().replace(/ /g, '-')}.png`), fullPage: true })
        const html = await popup.locator('body').innerText()
        await popup.close(); return { html, reads: s.reads.slice(start) }
      }
      const week = await print('Week Schedule')
      assert.match(week.html, /Week Schedule\s+Sep 28 - Oct 4, 2026/)
      assert.match(week.html, /8103 - Job C[^\n]*Uma Fir, Vic Gum/)
      assert(weekReads(week.reads, 'assignments').every(r => r.lte === '2026-10-04') && weekReads(week.reads, 'assignments').length > 0)
      const daily = await print('Daily Crew Status')
      const head = daily.html.split('\n').find(line => line.startsWith('Crew'))
      assert.deepEqual(head.split('\t').map(x => x.trim()), ['Crew', 'Mon 09/28', 'Tue 09/29', 'Wed 09/30', 'Thu 10/01', 'Fri 10/02', 'Sat 10/03', 'Sun 10/04'])
      const lineFor = name => daily.html.split('\n').find(line => line.startsWith(firstName(name))).split('\t').map(x => x.trim())
      assert.match(lineFor(P.P7).at(-1), /8103/)
      assert.equal(lineFor(P.P3).at(-1), lineFor(P.P9).at(-2), 'Scheduled Off reads the same on Sunday as on Saturday')
      assert.notEqual(lineFor(P.P3).at(-1), '')
      noErrors(s); await s.context.close()
      pass('X1/X2 Week Schedule print: subtitle "Sep 28 - Oct 4, 2026", job C with its Sunday crew, read ends lte 2026-10-04; Daily Crew Status has seven columns ending "Sun 10/04"')
    }

    // ── T2 — Midweek Update ───────────────────────────────────────────────────
    {
      const s = await open('/crew?mode=midweek')
      const { page } = s
      await page.getByLabel('Crew member').waitFor()
      const body = await page.locator('.crew-phone').innerText()
      assert.match(body, /THU 10\/1 – SUN 10\/4 · today through Sunday/)
      assert.match(body, /Share remaining days through Sunday from your phone\./)
      assert.match(body, /· Today through Sunday/)
      assert.match(body, /No remaining assignments or scheduled-off days through Sunday\./)   // P1 has nothing left
      assert.doesNotMatch(body, /Saturday/)
      await page.getByLabel('Crew member').selectOption({ label: firstName(P.P7) })
      await page.waitForFunction(() => document.querySelector('textarea')?.value.includes('SUN 10/4'))
      assert.match(await page.locator('textarea').inputValue(), /SUN 10\/4 — JOB #8103 — with Uma Fir$/)
      assert.match(await page.locator('.cp-midweek-days').innerText(), /SUN 10\/4 — JOB #8103 — with Uma Fir/)
      await page.getByLabel('Crew member').selectOption({ label: firstName(P.P3) })
      await page.waitForFunction(() => document.querySelector('textarea')?.value.includes('OFF — MAY CHANGE'))
      assert.match(await page.locator('textarea').inputValue(), /SUN 10\/4 — \(OFF — MAY CHANGE\)$/)
      const r = weekReads(s.reads, 'assignments')
      assert(r.length > 0 && r.every(x => x.gte === '2026-09-28' && x.lte === '2026-10-04'), 'assignment read stays Monday–Sunday')
      noErrors(s); await s.context.close()
      const sun = await open('/crew?mode=midweek', { clock: '2026-10-04T12:00:00-07:00' })
      await sun.page.getByLabel('Crew member').waitFor()
      await sun.page.getByLabel('Crew member').selectOption({ label: firstName(P.P7) })
      await sun.page.waitForFunction(() => document.querySelector('textarea')?.value.includes('SUN 10/4'))
      assert.match(await sun.page.locator('.cp-midweek-range').innerText(), /^SUN 10\/4 – SUN 10\/4 · today through Sunday$/)
      assert.match(await sun.page.locator('textarea').inputValue(), /SUN 10\/4 — JOB #8103 — with Uma Fir$/)
      await sun.context.close()
      pass('T2 Midweek Update: range "THU 10/1 – SUN 10/4 · today through Sunday", Sunday lines in the preview and shared text, the five strings say Sunday, read stays Monday–Sunday; on Sunday the range is that one day')
    }
  }

  if (BASE) {
    writeFileSync(SNAPSHOT, JSON.stringify(snapshot, null, 2) + '\n')
    console.log('BASE evidence written: ' + OUT)
  } else {
    console.log(`PASS: Sunday = Saturday parity browser checks (${passed.length} groups)`)
  }
} finally { await browser?.close(); await server.close() }
