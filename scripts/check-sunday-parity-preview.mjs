// Sunday = Saturday parity (F60) — READ-ONLY walk of the deployed app bundle.
//
// Serves the real hosted bundle, but:
//   • the "signed-in user" is a synthetic session injected into localStorage — not a real sign-in;
//   • every Supabase request is answered in the browser from scripts/sunday-parity-fixture.mjs;
//   • every write (any non-GET) is refused and fails the run; WebSockets are closed;
//   • any other outbound host is aborted.
// It opens pickers but never presses a save. It proves nothing about real records.
//
//   PREVIEW_URL=<preview> PLAYWRIGHT_MODULE=<playwright-core index.mjs> \
//     vercel env run -- node scripts/check-sunday-parity-preview.mjs
//
// VERCEL_OIDC_TOKEN, when present, is sent only to the preview's own origin and never logged.
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { makeFixture, P } from './sunday-parity-fixture.mjs'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = (process.env.PREVIEW_URL || process.env.BASE_URL || '').replace(/\/$/, '')
if (!base) throw new Error('PREVIEW_URL is required')
if (/(^|\.)(scmybiz\.com|sccmybiz\.com|salescommand\.app)$/.test(new URL(base).hostname)) {
  console.error('Refusing to run against a production host.'); process.exit(2)
}
const previewToken = process.env.VERCEL_OIDC_TOKEN
const SHOTS = resolve(dirname(fileURLToPath(import.meta.url)), '../docs/agent-handoffs/evidence/sunday-parity/preview')
mkdirSync(SHOTS, { recursive: true })
const project = 'pbgvgjjuhnpsumnowuym'
const user = { id: '00000000-0000-0000-0000-000000000001', email: 'fixture@example.test', aud: 'authenticated', role: 'authenticated' }
const session = { access_token: 'fixture-only', refresh_token: 'fixture-only', expires_at: 4102444800, expires_in: 3600, token_type: 'bearer', user }
const THU = '2026-10-01T12:00:00-07:00'
const W = 'Sep 28 – Oct 4, 2026'

const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
const refusedWrites = [], authCalls = [], aborted = new Set(), sockets = []
async function open(path, { width = 1440, height = 900 } = {}) {
  const fixture = makeFixture()
  const context = await browser.newContext({ viewport: { width, height }, timezoneId: 'America/Los_Angeles' })
  await context.routeWebSocket('**', ws => { sockets.push(new URL(ws.url()).hostname); ws.close() })
  const page = await context.newPage()
  page.setDefaultTimeout(20000)
  await page.clock.setFixedTime(new Date(THU))
  const reads = [], errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(({ project, session }) => localStorage.setItem(`sb-${project}-auth-token`, JSON.stringify(session)), { project, session })
  await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url())
    if (url.origin === new URL(base).origin) return route.continue(previewToken ? { headers: { ...req.headers(), 'x-vercel-trusted-oidc-idp-token': previewToken } } : undefined)
    if (!url.hostname.endsWith('.supabase.co')) { aborted.add(url.hostname); return route.abort() }
    const table = url.pathname.split('/').pop(), single = req.headers().accept?.includes('vnd.pgrst.object')
    const send = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'content-range': '0-0/*' }, body: JSON.stringify(data) })
    const method = req.method()
    if (method === 'OPTIONS') return send([])
    if (url.pathname.startsWith('/auth/')) { authCalls.push(`${method} ${url.pathname}`); return send(table === 'user' ? user : session) }
    if (method !== 'GET' && method !== 'HEAD') { refusedWrites.push(`${method} ${url.pathname}`); return send({ message: 'Read-only walk: write refused' }, 400) }
    const matches = row => [...url.searchParams].every(([key, val]) => {
      if (!(key in row)) return true
      if (val.startsWith('eq.')) return String(row[key]) === val.slice(3)
      if (val.startsWith('in.')) return val.slice(3).replace(/^\(|\)$/g, '').split(',').map(v => v.replace(/^"|"$/g, '')).includes(String(row[key]))
      if (val.startsWith('gte.')) return row[key] >= val.slice(4)
      if (val.startsWith('lte.')) return row[key] <= val.slice(4)
      return true
    })
    const date = prefix => url.searchParams.getAll('date').find(v => v.startsWith(prefix))?.slice(prefix.length)
    reads.push({ table, gte: date('gte.'), lte: date('lte.'), query: decodeURIComponent(url.search) })
    if (table === 'team_members') return send(single ? { ...user, name: 'Preview Fixture', role: 'Admin', onboarded: true, apps: ['sales', 'schedule'] } : [])
    if (table === 'tenant_config') return send(single ? { id: 'fixture', company_name: 'Preview Fixture', apps: ['sales', 'schedule'] } : [{ id: 'fixture', company_name: 'Preview Fixture', apps: ['sales', 'schedule'] }])
    if (table === 'jobs') { const rows = fixture.jobs.filter(matches); return send(single ? rows[0] : rows) }
    if (table === 'job_mobilizations') return send(fixture.trips.filter(matches))
    if (table === 'crew') return send(fixture.crew)
    if (table === 'assignments') return send(fixture.assignments.filter(matches))
    if (table === 'crew_status') return send(fixture.statuses.filter(matches))
    return send(single ? null : [])
  })
  await page.goto(base + path)
  return { page, context, reads, errors }
}
const texts = loc => loc.evaluateAll(els => els.map(el => el.innerText.replace(/\s+/g, ' ').trim()))
const chip = (page, name) => page.locator('.sch-chip').filter({ hasText: name.split(', ').reverse().join(' ') })
const tripRow = (page, id) => page.locator(`[data-trip-row="${id}"]`)
const weekReads = (reads, table) => reads.filter(r => r.table === table && r.gte && r.lte)
const boardReady = (page, label) => page.waitForFunction(label => document.querySelector('.sch-wklbl')?.textContent === label && document.querySelector('.sch-board-row-wrap'), label, { timeout: 45000 })
const pass = msg => console.log('PASS ' + msg)

try {
  for (const [width, height] of [[1440, 900], [1280, 800]]) {
    const s = await open('/schedule/schedule?week=2026-09-28', { width, height })
    const { page } = s
    await boardReady(page, W).catch(async e => { console.error((await page.locator('body').innerText()).slice(0, 1500)); throw e })
    assert.deepEqual(await texts(page.locator('.sch-brd-hdr')), ['MON 09/28', 'TUE 09/29', 'WED 09/30', 'THU 10/01', 'FRI 10/02', 'SAT 10/03', 'SUN 10/04'])
    for (const table of ['assignments', 'crew_status']) {
      const r = weekReads(s.reads, table)
      assert(r.length > 0 && r.every(x => x.gte === '2026-09-28' && x.lte === '2026-10-04'), `${table}: ${JSON.stringify(r)}`)
    }
    assert.equal(await tripRow(page, 'C1').count(), 1, 'Sunday-only trip is a row on this week')
    assert.equal(await tripRow(page, 'C1').locator('.sch-board-row > .sch-brd-cell').nth(6).locator('.sch-brd-cnt').innerText(), '2')
    assert.equal((await texts(page.locator('.hcs-day'))).at(-1), '5 2 SUN 4 3 / 8 38%')
    assert.equal((await texts(page.locator('.hcs-day')))[5], '5 3 SAT 3 2 / 7 29%')
    // Layout inside the real app shell (sidebar present), which the local harness does not mount.
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${width}: page scrolls sideways`)
    const clipped = await page.locator('.sch-brd-hdr, .sch-brd-cnt, .sch-brd-sub, .hcs-day-label, .hcs-day-count, .hcs-day-pct, .hcs-day-today-tag')
      .evaluateAll(els => els.filter(el => el.scrollWidth > el.clientWidth + 1).map(el => el.className + ': ' + el.textContent))
    assert.deepEqual(clipped, [], `${width}: clipped text`)
    const spill = await page.locator('.sch-chip').evaluateAll(chips => chips.flatMap(chip => {
      const cs = getComputedStyle(chip), inner = chip.getBoundingClientRect().right - parseFloat(cs.borderRightWidth) - parseFloat(cs.paddingRight)
      const wrap = chip.querySelector('.sch-crew-days-wrap')
      return [...chip.querySelectorAll('.sch-cdot, .sch-crew-day-letter')].filter(el => el.getBoundingClientRect().right > inner + 0.5).map(() => chip.textContent)
        .concat(wrap && wrap.scrollWidth > wrap.clientWidth ? [chip.textContent + ' (block overflow)'] : [])
    }))
    assert.deepEqual(spill, [], `${width}: crew-pool day dots outside their chip`)
    assert.doesNotMatch(await chip(page, P.P8).getAttribute('class'), /sch-chip-out/)
    assert.match(await chip(page, P.P9).getAttribute('class'), /sch-chip-out/)
    await page.screenshot({ path: resolve(SHOTS, `board-${width}.png`) })

    // Open pickers; never save.
    await chip(page, P.P1).dragTo(tripRow(page, 'C1').locator('.sch-brd-cell').first())
    const modal = page.locator('.sch-modal'); await modal.waitFor()
    const days = modal.locator('.sch-modal-days > .sch-modal-day')
    assert.equal(await days.count(), 7)
    assert.deepEqual(await days.evaluateAll(els => els.filter(el => el.style.opacity !== '0.3').map(el => el.firstChild.textContent)), ['Sun'])
    await modal.screenshot({ path: resolve(SHOTS, `assign-picker-sunday-only-${width}.png`) })
    await modal.getByRole('button', { name: 'Cancel', exact: true }).click()
    await chip(page, P.P2).hover()
    await chip(page, P.P2).getByTitle('Sick', { exact: true }).click()
    assert.deepEqual(await texts(modal.locator('.sch-modal-days > .sch-modal-day')), ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'])
    await page.locator('.sch-modal-overlay').click({ position: { x: 5, y: 5 } })
    await chip(page, P.X).locator('.sch-chip-name').click()
    assert.match(await page.locator('.sch-modal-detail').innerText(), /SAT\n03\nSUN\n04\nSTATUS/)
    await page.locator('.sch-modal-detail').getByRole('button', { name: 'Close', exact: true }).click()
    assert.deepEqual(s.errors, [])
    await s.context.close()
  }
  pass('hosted bundle, 1440 and 1280, inside the app shell: seven columns MON 09/28 … SUN 10/04; reads gte 2026-09-28 lte 2026-10-04; Sunday-only trip row; SUN 4 card 3 / 8 38%; no sideways scroll, no clipped label, pool dots inside their chips; assign picker (only Sun enabled), Sick picker (seven chips) and crew week popup opened and closed without saving')

  {
    const s = await open('/schedule/schedule?week=2026-10-04')
    await boardReady(s.page, W)
    await s.page.waitForTimeout(800)
    assert.deepEqual([...new Set(weekReads(s.reads, 'assignments').map(r => r.gte))], ['2026-09-28'], 'a Sunday link reads only its own week')
    await s.context.close()
    pass('hosted bundle: ?week=2026-10-04 opens the week of 2026-09-28 and sends no read for another week')
  }
  {
    const s = await open('/schedule/calendar')
    const { page } = s
    await page.locator('.cal-bar').first().waitFor({ timeout: 45000 })
    await page.getByRole('button', { name: 'Week', exact: true }).click()
    await page.waitForFunction(() => [...document.querySelectorAll('.cal-wrapper div')].some(d => !d.children.length && d.textContent === 'Sun 4'))
    const header = await page.locator('.cal-wrapper').evaluate(el => [...el.querySelectorAll('div')].filter(d => !d.children.length && /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) \d+$/.test(d.textContent)).map(d => d.textContent))
    assert.deepEqual(header, ['Mon 28', 'Tue 29', 'Wed 30', 'Thu 1', 'Fri 2', 'Sat 3', 'Sun 4'])
    assert((await page.locator('.cal-bar').evaluateAll(els => els.map(el => `${el.style.gridColumn} | ${el.title}`))).some(b => b.startsWith('7 / 8 | 8103 · Job C')), 'job C draws a bar in Sun 4')
    assert.equal((await texts(page.locator('.hcs-day'))).length, 7)
    await page.screenshot({ path: resolve(SHOTS, 'calendar-week-1440.png') })
    assert.deepEqual(s.errors, [])
    await s.context.close()
    pass('hosted bundle: Calendar week view Mon 28 … Sun 4 with job C\'s bar in Sun 4; capacity band has seven cards')
  }
  {
    const s = await open('/schedule/daily')
    await s.page.locator('.dly-card').first().waitFor({ timeout: 45000 })
    assert.deepEqual(await texts(s.page.locator('.dly-hdr').first().locator('.dly-hdr-day')), ['MON 9/28', 'TUE 9/29', 'WED 9/30', 'THU 10/1', 'FRI 10/2', 'SAT 10/3', 'SUN 10/4'])
    await s.page.screenshot({ path: resolve(SHOTS, 'daily-1440.png'), fullPage: true })
    assert.deepEqual(s.errors, [])
    await s.context.close()
    pass('hosted bundle: Daily shows seven day columns Mon 9/28 … Sun 10/4')
  }
  assert.deepEqual(refusedWrites, [], 'the walk attempted a write')
  console.log(`Auth endpoint calls answered by the fixture: ${authCalls.length ? [...new Set(authCalls)].join(', ') : 'none'}`)
  console.log(`WebSockets closed before connecting: ${sockets.length} (${[...new Set(sockets)].map(h => h.replace(/^[^.]+/, '<project>')).join(', ') || 'none'})`)
  console.log(`Other outbound hosts aborted: ${[...aborted].join(', ') || 'none'}`)
  console.log('PASS: read-only hosted walk, synthetic session and data, zero writes attempted')
} finally { await browser.close() }
