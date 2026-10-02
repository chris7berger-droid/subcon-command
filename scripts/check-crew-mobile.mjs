// Mobile crew scheduler (F66) — docs/plans/crew_mobile_preview.md §5.
// The real app, in its shell, at /schedule/schedule, with every backend request
// answered from scripts/crew-mobile-fixture.mjs. No sign-in, no real record.
//
//   node scripts/check-crew-mobile.mjs                 run the §5 checks (P, D1, D4)
//   CREW_MOBILE_BASE=<dir> node scripts/check-…        U1/U2: record the unedited route at phone widths
//   CREW_MOBILE_CAPTURE=<dir> node scripts/check-…     D3: one 1440 board screenshot (run in its own process)
//   CREW_MOBILE_DIFF=<base>,<base-repeat>,<after> …    D3: compare three captures
//   CREW_MOBILE_HOSTED=1 QA_URL=<preview> …            §5 G: the save-free subset only
//
// QA_URL: an already-served build. Without it the script builds this checkout
// with a synthetic backend name and serves it locally. QA_OUT: output folder
// (default: a temp folder, so tracked evidence is never rewritten in place).
// Env: PLAYWRIGHT_MODULE (playwright index.mjs), CHROME_PATH (optional).
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const OUT = path.resolve(process.env.QA_OUT || path.join(os.tmpdir(), 'crew-mobile-qa'))
await fs.mkdir(OUT, { recursive: true })

// D3 comparison needs no app: decode the PNGs in a blank page and count differing pixels.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright')
const launch = () => chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })

if (process.env.CREW_MOBILE_DIFF) {
  const [base, repeat, after] = process.env.CREW_MOBILE_DIFF.split(',')
  const browser = await launch(), blank = await (await browser.newContext()).newPage()
  const diff = async (a, b) => blank.evaluate(async ([x, y]) => {
    const load = async s => { const im = await createImageBitmap(await (await fetch('data:image/png;base64,' + s)).blob()); const c = new OffscreenCanvas(im.width, im.height), g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0); return g.getImageData(0, 0, im.width, im.height) }
    const [p, q] = [await load(x), await load(y)]
    if (p.width !== q.width || p.height !== q.height) return { size_mismatch: [p.width, p.height, q.width, q.height] }
    let changed = 0, max = 0
    for (let i = 0; i < p.data.length; i += 4) { let d = 0; for (let k = 0; k < 4; k++) d = Math.max(d, Math.abs(p.data[i + k] - q.data[i + k])); if (d) { changed++; if (d > max) max = d } }
    return { changed_pixels: changed, max_channel_diff: max }
  }, [(await fs.readFile(a)).toString('base64'), (await fs.readFile(b)).toString('base64')])
  const file = 'board-1440.png'
  const floor = await diff(`${base}/${file}`, `${repeat}/${file}`), now = await diff(`${base}/${file}`, `${after}/${file}`)
  await browser.close()
  const pass = !now.size_mismatch && now.changed_pixels <= floor.changed_pixels
  console.log(JSON.stringify({ check: 'D3 desktop board vs base', base_vs_base_repeat: floor, base_vs_after: now, pass }, null, 2))
  process.exit(pass ? 0 : 1)
}

// The fixture module reads QA_URL at import, so settle the URL first.
let server = null
if (!process.env.QA_URL) {
  process.env.VITE_SUPABASE_URL = 'https://calllog-fixture.supabase.co' // the fixture session's storage key expects this name
  process.env.VITE_SUPABASE_ANON_KEY = 'fixture-only'
  const { build, preview } = await import('vite')
  const outDir = path.join(OUT, 'dist')
  await build({ logLevel: 'error', build: { outDir, emptyOutDir: true } })
  server = await preview({ logLevel: 'error', build: { outDir }, preview: { host: '127.0.0.1', port: 5233, strictPort: true } })
  process.env.QA_URL = 'http://127.0.0.1:5233'
}
const F = await import('./crew-mobile-fixture.mjs')
const { BASE, WEEK, P, flip, HEIGHTS } = F
const ROUTE = '/schedule/schedule'
const WEEK_LABEL = 'Oct 5 – Oct 11, 2026'

async function open(browser, width, { search = '', fixture } = {}) {
  const s = await F.openScheduler(browser, width, { fixture })
  await s.page.goto(BASE + ROUTE + search)
  return s
}
async function ready(page, label = WEEK_LABEL) {
  await page.waitForFunction(label => document.querySelector('.sch-wklbl')?.textContent === label && document.querySelector('.sch-board-row-wrap'), label)
}
const chip = (page, name) => page.locator('.sch-chip').filter({ hasText: flip(name) })

// ── U1 / U2: what the unedited route shows at phone widths ─────────────────
if (process.env.CREW_MOBILE_BASE) {
  const dir = path.resolve(process.env.CREW_MOBILE_BASE); await fs.mkdir(dir, { recursive: true })
  const browser = await launch(), record = { url: BASE + ROUTE, widths: {} }
  for (const width of [360, 390, 430, 768]) {
    const s = await open(browser, width)
    await ready(s.page)
    await s.page.screenshot({ path: `${dir}/route-${width}.png` })
    record.widths[width] = await s.page.evaluate(() => {
      const box = sel => { const el = document.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } }
      const vw = innerWidth, vh = innerHeight
      const headers = [...document.querySelectorAll('.sch-brd-hdr')].map(el => el.getBoundingClientRect())
      const brd = document.querySelector('.sch-brd'), body = document.querySelector('.sch-brd-body')
      return {
        viewport: [vw, vh], documentScrollWidth: document.documentElement.scrollWidth,
        capacityStrip: box('.hcs'), pool: box('.sch-pool'), main: box('.sch-main'), board: box('.sch-brd'), jobColumn: box('.sch-brd-hdr-job'),
        dayHeaders: headers.length, dayHeadersFullyInViewport: headers.filter(r => r.left >= 0 && r.right <= vw && r.width > 0).length,
        boardScrollsSideways: brd.scrollWidth > brd.clientWidth && getComputedStyle(brd).overflowX !== 'hidden',
        boardBodyScrollsSideways: body.scrollWidth > body.clientWidth && getComputedStyle(body).overflowX !== 'hidden',
        weekNavInViewport: (() => { const r = document.querySelector('.sch-wknav').getBoundingClientRect(); return r.left >= 0 && r.right <= vw && r.top >= 0 && r.bottom <= vh })(),
        statusButtonsShown: [...document.querySelectorAll('.sch-sbtns')].filter(el => getComputedStyle(el).display !== 'none').length,
      }
    })
    if (width === 360) {
      // U2: the three existing dialogs at 360. Opened by script click (their triggers need a hover); nothing is saved.
      const sized = async sel => s.page.locator(sel).last().evaluate(el => { const r = el.getBoundingClientRect(); return { w: Math.round(r.width), left: Math.round(r.left), right: Math.round(r.right), viewport: innerWidth, insideViewport: r.left >= 0 && r.right <= innerWidth } })
      const dialogs = {}
      await chip(s.page, P.F1).evaluate(el => el.click()); await s.page.locator('.sch-modal-detail').waitFor()
      dialogs.crewWeekPopup = await sized('.sch-modal-detail'); await s.page.screenshot({ path: `${dir}/dialog-crew-week-360.png` })
      await s.page.locator('.sch-modal-detail .sch-modal-actions button').evaluate(el => el.click())
      await chip(s.page, P.F1).locator('.sch-sbtn[title="Sick"]').evaluate(el => el.click()); await s.page.locator('.sch-modal-days').waitFor()
      dialogs.statusPicker = await sized('.sch-modal'); await s.page.screenshot({ path: `${dir}/dialog-status-360.png` })
      await s.page.locator('.sch-modal-overlay').evaluate(el => el.click())
      await chip(s.page, P.F1).locator('.sch-sbtn[title="Scheduled Off"]').evaluate(el => el.click()); await s.page.locator('.sch-modal-soff').waitFor()
      dialogs.scheduledOff = await sized('.sch-modal-soff'); await s.page.screenshot({ path: `${dir}/dialog-scheduled-off-360.png` })
      record.dialogsAt360 = dialogs
    }
    record.widths[width].writes = s.log.writes.length
    assert.deepEqual(s.errors, [], `page errors at ${width}`)
    await s.context.close()
  }
  await browser.close(); await server?.close?.()
  await fs.writeFile(`${dir}/baseline.json`, JSON.stringify(record, null, 2))
  console.log(JSON.stringify(record, null, 2))
  process.exit(0)
}

// ── D3 capture: one populated desktop board, in its own process ────────────
if (process.env.CREW_MOBILE_CAPTURE) {
  const dir = path.resolve(process.env.CREW_MOBILE_CAPTURE); await fs.mkdir(dir, { recursive: true })
  const browser = await launch(), s = await open(browser, 1440)
  await ready(s.page)
  await s.page.evaluate(() => document.fonts.ready)
  await s.page.screenshot({ path: `${dir}/board-1440.png` })
  assert.deepEqual(s.errors, [])
  await browser.close(); await server?.close?.()
  console.log(`captured ${dir}/board-1440.png`)
  process.exit(0)
}

// ── §5 checks ──────────────────────────────────────────────────────────────
const HOSTED = process.env.CREW_MOBILE_HOSTED === '1'
if (/(^|\.)(scmybiz\.com|sccmybiz\.com|salescommand\.app)$/.test(new URL(BASE).hostname)) { console.error('Refusing to run against a production host.'); process.exit(2) }
const shell = await import('./mobile-preview-fixtures.mjs') // its write/refusal logs fail the run (H4)
const { crewWeekRows } = await import('../src/schedule/lib/crewScheduleRows.js')
const { crewWeekSummary } = await import('../src/schedule/lib/crewWeekSummary.js')
const { THU, FRI, SUN, WED, JOB, TRIP, LONG_NAME, NEXT_WEEK } = F
const NEXT_LABEL = 'Oct 12 – Oct 18, 2026'
const WIDTHS = (process.env.QA_WIDTHS || (HOSTED ? '390,768' : '360,390,430,768')).split(',').map(Number)
const browser = await launch()
const results = [], notes = []
let current = ''
async function check(name, fn, { local = false } = {}) {
  current = name
  if (HOSTED && local) { results.push({ name, pass: null, skipped: 'local only (§5 G)' }); return }
  try { await fn(); results.push({ name, pass: true }); console.log('PASS ' + name) }
  catch (e) { results.push({ name, pass: false, error: e.message.split('\n').slice(0, 6).join(' | ') }); console.log('FAIL ' + name + ' :: ' + e.message.split('\n')[0]) }
}
// One fresh context + fixture per check. Page errors and refused requests fail it.
async function withS(width, fn, opts = {}) {
  const { before, ...rest } = opts
  const s = await F.openScheduler(browser, width, { allowWrites: !HOSTED, ...rest })
  try {
    if (before) await before(s)
    await s.page.goto(BASE + ROUTE + (opts.search || ''))
    if (!opts.noWait) await ready(s.page, opts.label)
    await fn(s)
    assert.deepEqual(s.errors, [], 'page errors')
    assert.deepEqual(s.log.refused, [], 'refused scheduler writes')
  } finally {
    // QA_SHOTS=1: keep the screen each check ended on (used for the hosted run's evidence).
    if (process.env.QA_SHOTS && s.page) await s.page.screenshot({ path: `${OUT}/end-${current.replace(/[^a-z0-9]+/gi, '-').slice(0, 40).replace(/-$/, '')}.png` }).catch(() => {})
    await s.context.close()
  }
}
const norm = s => s.replace(/\s+/g, ' ').trim()
const up = s => norm(s).toUpperCase()
const texts = loc => loc.evaluateAll(els => els.map(el => el.innerText.replace(/\s+/g, ' ').trim()))
const tab = (page, name) => page.locator('.sch-ph-tab', { hasText: new RegExp(`^${name}$`) })
const card = (page, trip) => page.locator(`.sch-ph-card[data-trip="${trip}"]`)
const flowBox = page => page.locator('.sch-ph-flow')
const flowBtn = (page, name) => flowBox(page).getByRole('button', { name, exact: true })
async function view(page, name) { await tab(page, name).tap(); await page.waitForFunction(n => [...document.querySelectorAll('.sch-ph-tab')].some(b => b.textContent === n && b.getAttribute('aria-pressed') === 'true'), name) }
async function day(page, date) { await view(page, 'Day'); await page.locator(`.sch-ph-daybtn[data-date="${date}"]`).tap(); await page.locator(`.sch-ph-daybtn[data-date="${date}"][aria-pressed="true"]`).waitFor() }
const noSideways = async (page, what) => { const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); assert(over <= 0, `${what}: page scrolls sideways by ${over}px`) }
// At least 44×44, fully inside the viewport after scrolling to it, and the tap point at its centre is the control.
async function target(loc, what, min = 44) {
  await loc.scrollIntoViewIfNeeded()
  const r = await loc.evaluate(el => { const b = el.getBoundingClientRect(), hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return { w: b.width, h: b.height, left: b.left, right: b.right, top: b.top, bottom: b.bottom, vw: innerWidth, vh: innerHeight, hit: !!hit && (hit === el || el.contains(hit)) } })
  assert(r.w >= min - 0.5 && r.h >= min - 0.5, `${what}: ${Math.round(r.w)}×${Math.round(r.h)} is under ${min}×${min}`)
  assert(r.left >= -0.5 && r.right <= r.vw + 0.5 && r.top >= -0.5 && r.bottom <= r.vh + 0.5, `${what}: outside the viewport`)
  assert(r.hit, `${what}: its centre is covered`)
}
const inViewport = async (loc, what) => { const r = await loc.evaluate(el => { const b = el.getBoundingClientRect(); return { ok: b.width > 0 && b.left >= -0.5 && b.right <= innerWidth + 0.5 && b.top >= -0.5 && b.bottom <= innerHeight + 0.5, b: [b.left, b.top, b.right, b.bottom].map(Math.round), v: [innerWidth, innerHeight] } }); assert(r.ok, `${what}: not inside the viewport ${JSON.stringify(r)}`) }
const posts = s => s.log.writes.filter(w => w.method === 'POST'), deletes = s => s.log.writes.filter(w => w.method === 'DELETE')
const snapshotOf = fixture => JSON.stringify(fixture.assignments)
const pool = page => page.locator('.sch-pool').evaluate(el => [...el.children].filter(g => g.querySelector('.sch-tlbl')).map(g => ({
  group: g.querySelector('.sch-tlbl').textContent,
  people: [...g.querySelectorAll('.sch-chip')].map(c => ({ name: c.querySelector('.sch-chip-name').textContent, twice: !!c.querySelector('.sch-db-tag'), out: c.classList.contains('sch-chip-out'), status: c.querySelector('.sch-chip-status')?.textContent || '' })),
})))
async function startAssign(page, trip, person, date = THU) {
  await day(page, date)
  await card(page, trip).getByRole('button', { name: 'Assign', exact: true }).tap()
  await flowBox(page).waitFor()
  if (person) { await flowBox(page).locator(`.sch-ph-pick[data-person="${person}"]`).tap(); await flowBox(page).locator('.sch-ph-dayrow').first().waitFor() }
}
const dayRow = (page, date) => flowBox(page).locator(`.sch-ph-dayrow[data-date="${date}"]`)
const review = async page => { await flowBtn(page, 'Review').tap(); await flowBox(page).locator('[data-review]').waitFor() }
const rv = (page, key) => flowBox(page).locator(`[data-rv="${key}"] strong`).innerText()
const toast = page => page.locator('.toast-msg')

// What the fixture implies, computed with the board's own functions.
const fx = F.makeFixture()
const allocs = {}
for (const trip of fx.trips) (allocs[trip.job_id] ||= {})[trip.seq] = trip
const fxRows = crewWeekRows(fx.jobs, allocs, fx.assignments, WEEK[0], WEEK.at(-1))
const fxSummary = crewWeekSummary([], {}, [], WEEK, fxRows)
const expectedCounts = WEEK.map(date => {
  const perPerson = {}
  for (const row of fxRows) for (const a of row.assignments) if (a.date === date) (perPerson[a.crew_name] ||= new Set()).add(row.key)
  const on = groups => groups.flatMap(g => g.details).filter(d => d.date === date).length
  return { short: on(fxSummary.needing), unknown: on(fxSummary.unknown), double: Object.values(perPerson).filter(set => set.size > 1).length }
})
assert.deepEqual(expectedCounts[3], { short: 4, unknown: 1, double: 2 }, 'fixture: Thursday counts')
assert.equal(LONG_NAME.length, 40)

// ── Desktop reference (1440) and D1 ─────────────────────────────────────────
const ref = {}
await check('D1 desktop 1440: no phone control; pool, board, strip; one-step picker; chip opens the crew week popup', () => withS(1440, async s => {
  const page = s.page
  assert.equal(await page.locator('.sch-ph-switch, .sch-ph-pane, .sch-ph-assign, .sch-ph-flow').count(), 0, 'phone controls at 1440')
  for (const sel of ['.sch-pool', '.sch-brd', '.hcs-days']) assert(await page.locator(sel).isVisible(), sel + ' not visible')
  ref.label = await page.locator('.sch-wklbl').innerText()
  ref.strip = await page.locator('.hcs-day').evaluateAll(els => els.map(el => ({ label: el.querySelector('.hcs-day-label').textContent, count: el.querySelector('.hcs-day-count').textContent, free: el.querySelector('.hcs-day-avail').textContent, out: el.querySelector('.hcs-day-off')?.textContent || '0' })))
  ref.badges = await texts(page.locator('.hcs-badge'))
  ref.pool = await pool(page)
  ref.headers = await texts(page.locator('.sch-brd-hdr-row > *'))
  ref.rows = await page.locator('[data-trip-row]').evaluateAll(els => els.map(el => ({
    job: el.querySelector('.sch-brd-job-name').textContent, trip: el.querySelector('.sch-trip-label strong').textContent, range: el.querySelector('.sch-trip-label small').textContent,
    issue: el.querySelector('[role=note]')?.textContent || '', cells: [...el.querySelectorAll('.sch-board-row > .sch-brd-cell')].map(c => c.innerText.replace(/\s+/g, ' ').trim()),
  })))
  await page.locator('.hcs-day').nth(3).click()
  ref.thuDetail = await page.locator('.sch-modal-detail').evaluate(el => { const out = {}; let key; for (const n of el.children) { if (n.classList.contains('sch-dd-section-hdr')) { key = n.textContent.split(' (')[0]; out[key] = [] } else if (n.classList.contains('sch-dd-row') && key) out[key].push(n.textContent.replace(/^•\s*/, '').replace(/\s+/g, ' ').trim()) } return out })
  await page.locator('.sch-modal-detail').getByRole('button', { name: 'CLOSE' }).click()
  // The desktop picker: opened by drag, one step, Cancel + Assign.
  await chip(page, P.F1).dragTo(page.locator(`[data-trip-row="${TRIP.B}"] .sch-brd-cell`).first())
  const modal = page.locator('.sch-modal').filter({ hasText: 'Assign Flo Fern' })
  await modal.waitFor()
  ref.pickerDays = await modal.locator('.sch-modal-day').evaluateAll(els => els.map(el => ({ day: el.childNodes[0].textContent.trim(), off: el.style.opacity === '0.3' })))
  assert.deepEqual(await texts(modal.locator('.sch-modal-actions button')), ['CANCEL', 'ASSIGN'].map(x => x), 'picker buttons')
  assert.equal(await modal.getByText('Review').count(), 0, 'desktop picker has a review step')
  await modal.getByRole('button', { name: 'Cancel' }).click()
  await chip(page, P.X).click()
  await page.locator('.sch-modal-detail').filter({ hasText: 'Xan Xander' }).waitFor()
  await page.locator('.sch-modal-detail').getByRole('button', { name: 'Close' }).click()
  assert.equal(s.log.writes.length, 0)
}))
if (!ref.rows) { console.error('The 1440 reference could not be read; phone checks need it.'); await browser.close(); await server?.close?.(); process.exit(1) }
const thuRows = ref.rows.filter(r => r.cells[3] !== '—')
const refDayNames = ref.headers.slice(1).map(h => up(h))

for (const W of WIDTHS) {
  const T = `${W} `
  await check(T + 'P1 route loads in the shell; no sideways scroll; menu button and drawer work', () => withS(W, async ({ page }) => {
    await page.locator('.sch-ph-wday').first().waitFor()
    await noSideways(page, 'route')
    await page.getByRole('button', { name: 'Open navigation', exact: true }).tap()
    await page.locator('[data-app-sidebar][data-drawer="open"]').waitFor()
    await page.locator('.sc-drawer-close').tap()
    await page.locator('[data-app-sidebar][data-drawer="open"]').waitFor({ state: 'detached' }).catch(async () => assert.equal(await page.locator('[data-app-sidebar][data-drawer="open"]').count(), 0, 'drawer did not close'))
  }))

  await check(T + 'P2 switch: Week, Day, Person, Board; Week selected; 44×44; tappable', () => withS(W, async ({ page }) => {
    assert.deepEqual(await texts(page.locator('.sch-ph-tab')), ['WEEK', 'DAY', 'PERSON', 'BOARD'])
    assert.deepEqual(await page.locator('.sch-ph-tab').evaluateAll(els => els.map(el => el.getAttribute('aria-pressed'))), ['true', 'false', 'false', 'false'])
    for (const name of ['Week', 'Day', 'Person', 'Board']) { await target(tab(page, name), name + ' tab'); await view(page, name) }
  }))

  await check(T + 'P3 week label matches 1440; header in view in all four views; Next / This Week keep the view', () => withS(W, async ({ page }) => {
    assert.equal(await page.locator('.sch-wklbl').innerText(), ref.label)
    const header = () => [page.locator('.sch-wknav').getByRole('button', { name: 'Prev', exact: true }), page.locator('.sch-wknav').getByRole('button', { name: 'Next', exact: true }), page.locator('.sch-wknav').getByRole('button', { name: 'This Week', exact: true }), page.getByRole('button', { name: '+ Job', exact: true }), page.getByRole('button', { name: /^Actions/ }), page.locator('.sch-wknav').getByRole('button', { name: 'Weekly crew texts', exact: true }), page.locator('.sch-wklbl')]
    for (const name of ['Week', 'Day', 'Person', 'Board']) { await view(page, name); for (const [i, loc] of header().entries()) await inViewport(loc, `${name}: header item ${i}`); await noSideways(page, name) }
    await view(page, 'Day')
    await page.locator('.sch-wknav').getByRole('button', { name: 'Next', exact: true }).tap()
    await page.waitForFunction(l => document.querySelector('.sch-wklbl').textContent === l, NEXT_LABEL)
    assert.equal(await tab(page, 'Day').getAttribute('aria-pressed'), 'true', 'view not kept after Next')
    await page.locator('.sch-wknav').getByRole('button', { name: 'This Week', exact: true }).tap()
    await page.waitForFunction(l => document.querySelector('.sch-wklbl').textContent === l, WEEK_LABEL)
    assert.equal(await tab(page, 'Day').getAttribute('aria-pressed'), 'true', 'view not kept after This Week')
  }))

  await check(T + 'P4 Week: numbers match the 1440 strip; counts match the fixture; badges; trip link opens Board; day opens Day', () => withS(W, async ({ page }) => {
    const entries = await page.locator('.sch-ph-wday').evaluateAll(els => els.map(el => ({ date: el.dataset.date, name: el.querySelector('.sch-ph-wday-name').textContent, assigned: el.querySelector('[data-num=assigned]').textContent, free: el.querySelector('[data-num=free]').textContent, out: el.querySelector('[data-num=out]').textContent, short: el.querySelector('[data-count=short]').textContent, unknown: el.querySelector('[data-count=unknown]').textContent, double: el.querySelector('[data-count=double]').textContent })))
    assert.deepEqual(entries.map(e => e.date), WEEK)
    entries.forEach((e, i) => {
      assert.equal(e.assigned, `${ref.strip[i].count} assigned`, e.date); assert.equal(e.free, `${ref.strip[i].free} free`, e.date); assert.equal(e.out, `${ref.strip[i].out} out`, e.date)
      assert.deepEqual([e.short, e.unknown, e.double], [`Short ${expectedCounts[i].short}`, `Unknown need ${expectedCounts[i].unknown}`, `Double-booked ${expectedCounts[i].double}`], e.date)
    })
    assert.deepEqual([entries[3].short, entries[3].unknown, entries[3].double], ['Short 4', 'Unknown need 1', 'Double-booked 2'])
    assert.deepEqual(await texts(page.locator('.hcs-badge')), ref.badges, 'badges differ from 1440')
    for (const i of [0, 1, 2]) {
      await page.locator('.hcs-badge').nth(i).tap()
      const dialog = page.locator('.sch-modal-detail[role=dialog]'); await dialog.waitFor(); await inViewport(dialog, `badge list ${i}`)
      await dialog.getByRole('button', { name: 'Close' }).tap(); await dialog.waitFor({ state: 'detached' })
    }
    await page.locator('.hcs-badge').nth(2).tap()
    const link = page.locator('.sch-summary-trip-link').first(), linkText = norm(await link.innerText()).replace(/ →$/, '')
    await link.tap()
    await page.locator('.sch-modal-detail[role=dialog]').waitFor({ state: 'detached' })
    assert.equal(await tab(page, 'Board').getAttribute('aria-pressed'), 'true', 'trip link did not open Board')
    const open = page.locator('[data-trip-row]').filter({ has: page.locator('.sch-brd-detail') })
    assert.equal(await open.count(), 1, 'exactly one expanded row')
    assert.equal(up(await open.locator('.sch-trip-label strong').innerText()), up(linkText))
    await view(page, 'Week')
    await page.locator(`.sch-ph-wday[data-date="${THU}"]`).tap()
    await page.locator(`.sch-ph-daybtn[data-date="${THU}"][aria-pressed="true"]`).waitFor()
    assert.equal(await tab(page, 'Day').getAttribute('aria-pressed'), 'true')
  }))

  await check(T + 'P5 Day: opening day; Thursday cards equal the 1440 rows; staffing lines; read-only legacy/unavailable; Free and Out', () => withS(W, async s => {
    const page = s.page
    await view(page, 'Day')
    assert.equal(await page.locator('.sch-ph-daybtn[aria-pressed="true"]').getAttribute('data-date'), WED, 'Day did not open on Wednesday')
    await page.locator('.sch-wknav').getByRole('button', { name: 'Next', exact: true }).tap()
    await page.waitForFunction(l => document.querySelector('.sch-wklbl').textContent === l, NEXT_LABEL)
    assert.equal(await page.locator('.sch-ph-daybtn[aria-pressed="true"]').getAttribute('data-date'), NEXT_WEEK[0], 'next week did not open on Monday')
    await page.locator('.sch-wknav').getByRole('button', { name: 'This Week', exact: true }).tap()
    await page.waitForFunction(l => document.querySelector('.sch-wklbl').textContent === l, WEEK_LABEL)
    await day(page, THU)
    const cards = await page.locator('.sch-ph-card').evaluateAll(els => els.map(el => ({
      job: el.querySelector('.sch-ph-card-job').textContent, trip: el.querySelector('.sch-ph-card-trip strong').textContent, range: el.querySelector('.sch-ph-card-trip small').textContent,
      issue: el.querySelector('.sch-ph-issue')?.textContent || '', lead: el.querySelector('.sch-ph-card-lead')?.textContent || '', need: el.querySelector('.sch-ph-need')?.textContent || '',
      people: [...el.querySelectorAll('.sch-ph-person')].map(p => ({ name: p.dataset.person, twice: !!p.querySelector('.sch-db-tag'), button: p.tagName === 'BUTTON' })), assign: !!el.querySelector('.sch-ph-action'),
      clipped: el.querySelector('.sch-ph-card-job').scrollWidth > el.querySelector('.sch-ph-card-job').clientWidth + 1,
    })))
    assert.deepEqual(cards.map(c => [c.job, c.trip, c.range, c.issue]), thuRows.map(r => [r.job, r.trip, r.range, r.issue]), 'cards differ from the 1440 Thursday rows')
    const LEGACY = 'legacy', UNAVAILABLE = 'unavailable'
    for (const c of cards) c.key = c.trip !== 'Crew assignments — trip not identified' ? c.trip : c.job.startsWith('Unavailable job') ? UNAVAILABLE : LEGACY
    const by = key => cards.find(c => c.key === key)
    assert.deepEqual(Object.fromEntries(cards.map(c => [c.key, c.need])), { 'A-wide': 'need 3', 'A-short': 'need 1', 'B main': 'need 2', 'E main': 'need 2', 'C main': 'need ?', 'D main': '', [LEGACY]: '', [UNAVAILABLE]: '' })
    assert(by('E main').job.includes(LONG_NAME) && !by('E main').clipped, 'the 40-character name is clipped')
    assert.deepEqual(cards.flatMap(c => c.people.filter(p => p.twice).map(p => `${c.key}:${p.name}`)).sort(), [`A-short:${P.X}`, `A-wide:${P.X}`, `C main:${P.T}`, `D main:${P.T}`].sort(), '2X')
    assert.deepEqual(Object.fromEntries(cards.map(c => [c.key, c.people.map(p => p.name).sort()])), { 'A-wide': [P.X], 'A-short': [P.X], 'B main': [P.P1], 'C main': [P.T], 'D main': [P.D2, P.T].sort(), 'E main': [], [LEGACY]: [P.L], [UNAVAILABLE]: [P.U] })
    assert.deepEqual(Object.fromEntries(cards.map(c => [c.key, c.lead])), { 'A-wide': 'Lead: Xan Xander', 'A-short': 'Lead: Xan Xander', 'B main': 'Lead: Pat Pine', 'C main': 'Lead: Tess Teak', 'D main': 'Lead: Tess Teak', 'E main': '', [LEGACY]: '', [UNAVAILABLE]: '' })
    for (const label of [LEGACY, UNAVAILABLE]) {
      const c = by(label); assert(c.issue && !c.need && !c.assign && c.people.every(p => !p.button), `${label}: not read-only`)
    }
    const reads = s.log.reads.length
    for (const name of [P.L, P.U]) await page.locator(`.sch-ph-person-ro[data-person="${name}"]`).tap()
    assert.equal(await flowBox(page).count(), 0, 'a read-only person opened the flow')
    assert.equal(s.log.reads.length, reads, 'a read-only tap sent a request'); assert.equal(s.log.writes.length, 0)
    const lists = await page.locator('.sch-ph-list').evaluateAll(els => Object.fromEntries(els.map(el => [el.dataset.list, [...el.querySelectorAll('.sch-ph-list-row')].map(r => r.textContent.replace(/\s+/g, ' ').trim())])))
    assert.deepEqual(lists.free, ref.thuDetail.Available, 'Free list differs from the 1440 day detail')
    assert.deepEqual(lists.out, ref.thuDetail.Out, 'Out list differs from the 1440 day detail')
  }))

  for (const [who, teamId] of [[P.F1, F.F1_TEAM_ID], [P.F2, null]]) await check(T + `P6 assign ${flip(who)} to Job B Thursday: person → days → review → one POST with trip identity`, () => withS(W, async s => {
    const page = s.page
    await startAssign(page, TRIP.B)
    const list = await flowBox(page).locator('.sch-ph-flow-scroll').evaluate(el => [...el.children].map(g => ({ group: g.querySelector('.sch-tlbl').textContent, people: [...g.querySelectorAll('.sch-ph-pick')].map(b => b.dataset.person) })))
    assert.deepEqual(list.map(g => [g.group, g.people.map(flip)]), ref.pool.map(g => [g.group, g.people.map(p => p.name)]), 'person list differs from the 1440 pool')
    assert(await flowBox(page).locator(`.sch-ph-pick[data-person="${P.W}"]`).isDisabled(), 'W can be chosen')
    await flowBox(page).locator(`.sch-ph-pick[data-person="${who}"]`).tap()
    const rows = await flowBox(page).locator('.sch-ph-dayrow').evaluateAll(els => els.map(el => ({ day: el.querySelector('.sch-ph-dayrow-name').textContent.split(' ')[0], off: el.disabled })))
    assert.deepEqual(rows.map(r => [up(r.day), r.off]), ref.pickerDays.map(r => [up(r.day), r.off]), 'day buttons differ from the 1440 picker')
    await dayRow(page, THU).tap(); await review(page)
    const text = norm(await flowBox(page).innerText())
    assert(text.includes(flip(who)) && text.includes('9102') && text.includes('B main') && text.includes('Oct 7, 2026 – Oct 9, 2026'), 'review is missing person, job, trip or range: ' + text)
    assert.equal(up(await rv(page, 'add')), 'THU 10/08'); assert.equal(await rv(page, 'remove'), 'Nothing'); assert.equal(await flowBox(page).locator('[data-rv=warning]').count(), 0)
    await flowBtn(page, 'Save').tap()
    await flowBox(page).waitFor({ state: 'detached' })
    assert.equal(s.log.writes.length, 1); assert.equal(posts(s).length, 1)
    assert.deepEqual(posts(s)[0].payload, [{ job_id: JOB.B, mobilization_id: TRIP.B, crew_name: who, date: THU, team_member_id: teamId }])
    await card(page, TRIP.B).locator(`.sch-ph-person[data-person="${who}"]`).waitFor()
    assert.equal(await card(page, TRIP.B).locator('.sch-ph-need').innerText(), 'NEED 1')
  }), { local: true })

  await check(T + 'P7 Cancel, Back and close at every step write nothing', () => withS(W, async s => {
    const page = s.page, before = snapshotOf(s.fixture)
    const gone = () => flowBox(page).waitFor({ state: 'detached' })
    const exits = [() => flowBtn(page, 'Cancel').tap(), () => flowBox(page).locator('.sch-ph-close').tap(), ...(W === 768 ? [() => page.keyboard.press('Escape')] : [])]
    for (const exit of exits) {
      await startAssign(page, TRIP.B); await exit(); await gone()
      await startAssign(page, TRIP.B, P.F1); await dayRow(page, THU).tap(); await exit(); await gone()
      await startAssign(page, TRIP.B, P.F1); await dayRow(page, THU).tap(); await review(page); await exit(); await gone()
    }
    await startAssign(page, TRIP.B, P.F1); await dayRow(page, THU).tap(); await review(page)
    await flowBtn(page, 'Back').tap(); await dayRow(page, THU).waitFor(); await flowBtn(page, 'Back').tap(); await flowBox(page).locator('.sch-ph-pick').first().waitFor()
    await flowBtn(page, 'Cancel').tap(); await gone()
    assert.equal(s.log.writes.length, 0); assert.equal(snapshotOf(s.fixture), before)
  }))

  await check(T + 'P8a both writes fail: message shown, stays on Review, nothing saved; busy blocks a second request; then succeeds', () => withS(W, async s => {
    const page = s.page, before = snapshotOf(s.fixture)
    await startAssign(page, TRIP.B, P.F1); await dayRow(page, THU).tap(); await review(page)
    s.switches.failWrites = true; s.switches.holdWrites = true
    await flowBtn(page, 'Save').tap()
    const busy = flowBox(page).getByRole('button', { name: 'Saving…' }); await busy.waitFor()
    assert(await busy.isDisabled(), 'Save is not disabled while saving')
    await busy.evaluate(el => el.click()); await page.waitForTimeout(150)
    assert.equal(s.log.writes.length, 1, 'a second request was sent while busy')
    s.releaseWrites()
    await toast(page).filter({ hasText: 'Fixture: insert refused' }).waitFor(); await page.waitForTimeout(400); await inViewport(toast(page), 'failure message')
    await flowBox(page).locator('[data-rv=failed]').waitFor()
    assert.equal(up(await rv(page, 'add')), 'THU 10/08'); assert.equal(snapshotOf(s.fixture), before, 'fixture changed after a failed save')
    s.switches.failWrites = false
    await flowBtn(page, 'Save').tap(); await flowBox(page).waitFor({ state: 'detached' })
    assert.equal(posts(s).length, 2); assert(s.fixture.assignments.some(a => a.crew_name === P.F1 && a.date === THU && a.mobilization_id === TRIP.B))
  }), { local: true })

  await check(T + 'P8b only the DELETE fails: Review shows what is on the trip now and what is still to do', () => withS(W, async s => {
    const page = s.page
    await day(page, THU)
    await card(page, TRIP.B).locator(`.sch-ph-person[data-person="${P.P1}"]`).tap(); await dayRow(page, THU).waitFor()
    assert.equal(await dayRow(page, THU).getAttribute('aria-pressed'), 'true')
    await dayRow(page, FRI).tap(); await dayRow(page, THU).tap(); await review(page)
    assert.equal(up(await rv(page, 'add')), 'FRI 10/09'); assert.equal(up(await rv(page, 'remove')), 'THU 10/08')
    s.switches.failDelete = true
    await flowBtn(page, 'Save').tap()
    await toast(page).filter({ hasText: 'Fixture: delete refused' }).waitFor()
    await flowBox(page).locator('[data-rv=failed]').waitFor()
    await page.waitForFunction(() => document.querySelector('.sch-ph-flow [data-rv=add] strong')?.textContent === 'Nothing')
    assert.equal(up(await rv(page, 'current')), 'THU 10/08, FRI 10/09'); assert.equal(up(await rv(page, 'remove')), 'THU 10/08')
    const mine = () => s.fixture.assignments.filter(a => a.crew_name === P.P1 && a.mobilization_id === TRIP.B).map(a => a.date).sort()
    assert.deepEqual(mine(), [THU, FRI])
    const writes = s.log.writes.length
    await flowBtn(page, 'Cancel').tap(); await flowBox(page).waitFor({ state: 'detached' })
    assert.equal(s.log.writes.length, writes, 'Cancel wrote'); assert.deepEqual(mine(), [THU, FRI])
  }), { local: true })

  await check(T + 'P9 sibling trips: removing X from A-short Friday deletes that one row only', () => withS(W, async s => {
    const page = s.page
    const wide = () => JSON.stringify(s.fixture.assignments.filter(a => a.crew_name === P.X && a.mobilization_id === TRIP.AW))
    const before = wide(), target = s.fixture.assignments.find(a => a.crew_name === P.X && a.mobilization_id === TRIP.AS && a.date === FRI)
    await day(page, THU)
    await card(page, TRIP.AS).locator(`.sch-ph-person[data-person="${P.X}"]`).tap(); await dayRow(page, THU).waitFor()
    assert.deepEqual(await flowBox(page).locator('.sch-ph-dayrow[aria-pressed="true"]').evaluateAll(els => els.map(el => el.dataset.date)), [THU, FRI])
    await dayRow(page, FRI).tap(); await review(page)
    assert.equal(up(await rv(page, 'remove')), 'FRI 10/09'); assert.equal(await rv(page, 'add'), 'Nothing')
    await flowBtn(page, 'Save').tap(); await flowBox(page).waitFor({ state: 'detached' })
    assert.equal(s.log.writes.length, 1); assert.equal(posts(s).length, 0)
    assert(deletes(s)[0].query.includes(`id=in.(${target.id})`), 'DELETE does not name that one row: ' + deletes(s)[0].query)
    assert.equal(wide(), before, "A-wide's rows changed")
    await day(page, FRI)
    await card(page, TRIP.AW).locator(`.sch-ph-person[data-person="${P.X}"]`).waitFor()
    await day(page, THU)
    await card(page, TRIP.AS).locator(`.sch-ph-person[data-person="${P.X}"]`).tap()
    assert((await dayRow(page, FRI).innerText()).includes('9101 (another trip)'), 'Friday is not labelled as another trip')
    await flowBtn(page, 'Cancel').tap()
  }), { local: true })

  await check(T + 'P10 warnings warn and do not block; archived person shows the existing message and writes nothing', () => withS(W, async s => {
    const page = s.page
    await startAssign(page, TRIP.B, P.S)
    assert((await dayRow(page, THU).innerText()).includes('Sick'))
    await flowBox(page).getByRole('button', { name: /^Select all/ }).tap()
    assert.deepEqual(await flowBox(page).locator('.sch-ph-dayrow[aria-pressed="true"]').evaluateAll(els => els.map(el => el.dataset.date)), [WED, FRI], 'Select all took the sick day')
    await dayRow(page, THU).tap(); await review(page)
    assert((await flowBox(page).locator('[data-rv=warning]').innerText()).includes('Sick'))
    await flowBtn(page, 'Save').tap(); await flowBox(page).waitFor({ state: 'detached' })
    assert.equal(posts(s).length, 1); assert.deepEqual(posts(s)[0].payload.map(r => r.date).sort(), [WED, THU, FRI])
    await startAssign(page, TRIP.B, P.T)
    const note = await dayRow(page, THU).innerText(); assert(note.includes('9103') && note.includes('9104'), 'other jobs not named: ' + note)
    await dayRow(page, THU).tap(); await review(page)
    const warn = await flowBox(page).locator('[data-rv=warning]').innerText(); assert(warn.includes('9103') && warn.includes('9104'))
    await flowBtn(page, 'Cancel').tap(); await flowBox(page).waitFor({ state: 'detached' })
    const writes = s.log.writes.length
    await startAssign(page, TRIP.B, P.R); await dayRow(page, THU).tap(); await review(page); await flowBtn(page, 'Save').tap()
    await toast(page).filter({ hasText: 'This person is archived and cannot be assigned on that date.' }).waitFor()
    assert.equal(s.log.writes.length, writes, 'archived save wrote')
    await flowBtn(page, 'Cancel').tap()
  }), { local: true })

  await check(T + 'P11 Person: list matches the 1440 pool; trip lines; Scheduled Off; status actions open their dialogs inside the viewport', () => withS(W, async s => {
    const page = s.page
    await view(page, 'Person')
    assert.deepEqual(await pool(page), ref.pool, 'list differs from the 1440 pool')
    const openPerson = async name => { await chip(page, name).tap(); await page.locator(`.sch-ph-pdetail[data-person="${name}"]`).waitFor() }
    const back = async () => { await page.locator('.sch-ph-back').tap(); await page.locator('.sch-ph-pdetail').waitFor({ state: 'detached' }) }
    const actions = () => texts(page.locator('[data-status-actions] button'))
    await openPerson(P.X)
    assert.equal(await page.locator('.sch-ph-pday').count(), WEEK.length)
    assert.deepEqual(await page.locator('.sch-ph-line').evaluateAll(els => els.map(el => [el.querySelector('.sch-ph-line-job').textContent, el.querySelector('.sch-ph-line-days').textContent])), [['9101 · A-wide', 'Mon, Tue, Wed, Thu, Fri, Sat, Sun'], ['9101 · A-short', 'Thu, Fri']])
    await page.locator(`.sch-ph-line[data-trip="${TRIP.AS}"]`).tap(); await dayRow(page, THU).waitFor()
    assert(norm(await flowBox(page).innerText()).includes('A-short')); assert.equal(await flowBox(page).locator('.sch-ph-pick').count(), 0)
    await flowBtn(page, 'Cancel').tap(); await flowBox(page).waitFor({ state: 'detached' })
    assert.equal(await page.locator('.sch-modal-detail').count(), 0, 'the crew week popup is shown')
    await back(); await openPerson(P.O)
    await page.locator('.sch-ph-soff').waitFor()
    for (const name of ['Edit Dates', 'Remove Scheduled Off']) {
      const b = page.locator('.sch-ph-soff').getByRole('button', { name, exact: true }); await target(b, name); await b.tap()
      const dialog = page.locator('.sch-modal-soff'); await dialog.waitFor(); await inViewport(dialog, name + ' dialog')
      if (W <= 600) assert((await dialog.locator('input, select, textarea').evaluateAll(els => els.map(el => parseFloat(getComputedStyle(el).fontSize)))).every(px => px >= 16), 'text entry under 16px')
      await dialog.getByRole('button', { name: 'Cancel', exact: true }).tap(); await dialog.waitFor({ state: 'detached' })
    }
    await back(); await openPerson(P.W)
    assert.deepEqual(await actions(), ['SCHEDULED OFF'])
    await back(); await openPerson(P.F1)
    assert.deepEqual(await actions(), ['SICK', 'CALL IN', 'NO SHOW', 'SCHEDULED OFF'])
    for (const name of ['Sick', 'Call In', 'No Show', 'Scheduled Off']) {
      const b = page.locator('[data-status-actions]').getByRole('button', { name, exact: true }); await target(b, name); await b.tap()
      const dialog = page.locator('.sch-modal').last(); await dialog.waitFor(); await inViewport(dialog, name + ' dialog')
      if (name === 'Scheduled Off') await dialog.getByRole('button', { name: 'Cancel', exact: true }).tap()
      else await page.locator('.sch-modal-overlay').click({ position: { x: 3, y: 3 } })
      await page.locator('.sch-modal-overlay').waitFor({ state: 'detached' })
    }
    for (const [name, kind] of [[P.L, 'unidentified'], [P.U, 'unavailable']]) {
      await back(); await openPerson(name)
      const line = page.locator(`.sch-ph-line[data-trip="${kind}"]`); assert.equal(await line.evaluate(el => el.tagName), 'DIV'); await line.tap()
      assert.equal(await flowBox(page).count(), 0)
    }
    assert.equal(s.log.writes.length, 0)
  }))

  await check(T + 'P12 Board: Job plus seven days, sideways scroll in its frame, fixed Job column and date header, row editor, Assign crew', () => withS(W, async s => {
    const page = s.page
    await view(page, 'Board')
    assert.deepEqual(await texts(page.locator('.sch-brd-hdr-row > *')), ref.headers); assert.equal(await page.locator('[data-trip-row]').count(), ref.rows.length)
    await noSideways(page, 'Board')
    const m = await page.locator('.sch-brd').evaluate(async el => {
      const job = el.querySelector('.sch-brd-hdr-job'), last = [...el.querySelectorAll('.sch-brd-hdr')].at(-1), hdr = el.querySelector('.sch-brd-hdr-row')
      const before = job.getBoundingClientRect().left
      el.scrollLeft = el.scrollWidth
      await new Promise(r => requestAnimationFrame(r))
      const frame = el.getBoundingClientRect(), l = last.getBoundingClientRect(), label = el.querySelector('.sch-brd-job-label').getBoundingClientRect()
      const out = { scrolls: el.scrollWidth > el.clientWidth, scrolled: el.scrollLeft, lastVisible: l.left >= label.right - 0.5 && l.right <= frame.right + 0.5, jobMoved: Math.abs(job.getBoundingClientRect().left - before), labelMoved: Math.abs(label.left - before) }
      el.scrollTop = el.scrollHeight
      await new Promise(r => requestAnimationFrame(r))
      out.rowsScroll = el.scrollTop; out.headerTop = Math.abs(hdr.getBoundingClientRect().top - frame.top)
      el.scrollTop = 0; el.scrollLeft = 0
      return out
    })
    // Where the frame is wide enough for Job plus every day (768), there is nothing to scroll: recorded, not hidden.
    if (m.scrolls) assert(m.scrolled > 0, 'the board does not scroll sideways')
    else notes.push(`${W} P12: Job plus all seven days fit the frame, so the board has no sideways scroll at this width`)
    assert(m.lastVisible, 'the last day column is not fully visible when scrolled right')
    assert(m.jobMoved < 1 && m.labelMoved < 1.5, 'the Job column moved'); assert(m.headerTop < 1.5, 'the date header left the frame while rows scrolled')
    const row = id => page.locator(`[data-trip-row="${id}"]`)
    await row(TRIP.AW).locator('.sch-brd-job-label').tap(); await row(TRIP.AW).locator('.sch-brd-detail').waitFor()
    assert(await row(TRIP.AW).locator('.sch-tg-day').count() >= WEEK.length && await row(TRIP.AW).locator('.sch-tg-x').count() >= 1, 'day toggles or ✕ missing')
    const assign = row(TRIP.AW).getByRole('button', { name: 'Assign crew', exact: true }); await target(assign, 'Assign crew'); await assign.tap()
    await flowBox(page).waitFor(); assert(norm(await flowBox(page).innerText()).includes('A-wide'))
    await flowBtn(page, 'Cancel').tap(); await flowBox(page).waitFor({ state: 'detached' })
    const legacy = page.locator('[data-trip-row="unidentified"]')
    await legacy.first().locator('.sch-brd-job-label').tap(); await legacy.first().locator('.sch-brd-detail').waitFor()
    assert.equal(await legacy.first().getByRole('button', { name: 'Assign crew' }).count(), 0, 'Assign crew on the legacy row')
    await legacy.nth(1).locator('.sch-brd-job-label').tap(); await page.waitForTimeout(100)
    assert.equal(await legacy.nth(1).locator('.sch-brd-detail').count(), 0, 'the unavailable row expanded')
    assert.equal(s.log.writes.length, 0)
  }))

  await check(T + 'P13 a ?job=&week=&trip= link opens Board on that week with that row marked', () => withS(W, async ({ page }) => {
    assert.equal(await tab(page, 'Board').getAttribute('aria-pressed'), 'true')
    assert.equal(await page.locator('.sch-wklbl').innerText(), ref.label)
    assert.equal(await page.locator(`[data-trip-row="${TRIP.B}"] .sch-label-focused`).count(), 1); assert.equal(await page.locator('.sch-label-focused').count(), 1)
  }, { search: `?job=${JOB.B}&week=${THU}&trip=${TRIP.B}` }))

  await check(T + 'P14 added controls are 44×44 and tappable; the flow is a named dialog that takes and returns focus', () => withS(W, async ({ page }) => {
    const each = async (sel, what) => { const n = await page.locator(sel).count(); assert(n > 0, what + ': none found'); for (let i = 0; i < n; i++) await target(page.locator(sel).nth(i), `${what} ${i}`) }
    await each('.sch-ph-tab', 'tab'); await each('.sch-ph-wday', 'week day')
    await day(page, THU); await each('.sch-ph-daybtn', 'day button'); await each('.sch-ph-card .sch-ph-action', 'Assign'); await each('button.sch-ph-person', 'card person')
    const opener = card(page, TRIP.B).getByRole('button', { name: 'Assign', exact: true })
    await opener.tap(); await page.getByRole('dialog', { name: 'Assign crew' }).waitFor()
    assert(await page.evaluate(() => document.querySelector('.sch-ph-flow').contains(document.activeElement)), 'focus is not in the flow')
    await each('.sch-ph-pick:not(:disabled)', 'person'); await each('.sch-ph-flow .sch-ph-action', 'flow action'); await each('.sch-ph-close', 'close')
    await flowBox(page).locator(`.sch-ph-pick[data-person="${P.F1}"]`).tap(); await each('.sch-ph-dayrow:not(:disabled)', 'day'); await each('.sch-ph-flow .sch-ph-action', 'flow action')
    await dayRow(page, THU).tap(); await review(page); await each('.sch-ph-flow .sch-ph-action', 'flow action')
    await flowBtn(page, 'Cancel').tap(); await flowBox(page).waitFor({ state: 'detached' })
    assert(await opener.evaluate(el => el === document.activeElement), 'focus did not return to the control that opened the flow')
    await view(page, 'Person'); await chip(page, P.X).tap(); await page.locator('.sch-ph-pdetail').waitFor()
    await each('.sch-ph-back', 'back'); await each('button.sch-ph-line', 'trip line'); await each('.sch-ph-pdetail .sch-ph-action', 'status action'); await each('.sch-ph-tel', 'phone link')
  }))

  await check(T + 'P15 loading, held week, empty week, failed read and Retry', () => withS(W, async s => {
    const page = s.page
    await page.locator('.loading', { hasText: 'Loading schedule…' }).waitFor()
    s.release(); await ready(page)
    const state = () => page.evaluate(() => ({ label: document.querySelector('.sch-wklbl').textContent, first: document.querySelector('.sch-ph-wday')?.dataset.date, thu: document.querySelector('.sch-ph-wday[data-date="2026-10-08"] [data-num=assigned]')?.textContent, progress: document.querySelector('.sch-week-progress')?.textContent.trim() || '', inert: document.querySelector('.sch-ph-pane')?.inert, stripInert: document.querySelector('.sch-capacity-wrap').inert }))
    const was = await state()
    s.switches.holdWeekRead = true
    await page.locator('.sch-wknav').getByRole('button', { name: 'Next', exact: true }).tap()
    await page.locator('.sch-week-progress').waitFor()
    assert.deepEqual(await state(), { ...was, progress: `Loading ${NEXT_LABEL}…`, inert: true, stripInert: true }, 'held week: the previous week is not kept whole and inert')
    await view(page, 'Day'); assert.equal((await state()).inert, true)
    await view(page, 'Week')
    s.release()
    await page.waitForFunction(l => document.querySelector('.sch-wklbl').textContent === l, NEXT_LABEL)
    const now = await state(); assert.deepEqual([now.first, now.progress, now.inert], [NEXT_WEEK[0], '', false], 'label, days and numbers did not change together')
    await page.locator('.sch-ph-empty', { hasText: 'No jobs this week' }).waitFor()
    s.switches.failWeekRead = true
    await page.locator('.sch-wknav').getByRole('button', { name: 'This Week', exact: true }).tap()
    const err = page.locator('.error-msg'); await err.waitFor(); assert((await err.innerText()).includes('Fixture: week read failed'))
    await err.getByRole('button', { name: 'Retry' }).tap()
    await page.waitForFunction(l => document.querySelector('.sch-wklbl').textContent === l && !document.querySelector('.error-msg'), WEEK_LABEL)
    assert.equal(s.log.writes.length, 0)
  }, { noWait: true, before: s => { s.switches.holdWeekRead = true } }), { local: true })

  await check(T + 'P16 the flow is modal: week navigation and the switch cannot be tapped or focused; no desktop picker', () => withS(W, async ({ page }) => {
    await startAssign(page, TRIP.B)
    const probe = () => page.evaluate(() => {
      const nav = [...document.querySelectorAll('.sch-wknav .sch-btn')].filter(b => ['Prev', 'Next', 'This Week'].includes(b.textContent)), tabs = [...document.querySelectorAll('.sch-ph-tab')]
      return [...nav, ...tabs].map(el => { const b = el.getBoundingClientRect(), hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); el.focus(); return { name: el.textContent, onFlow: !!hit?.closest('.sch-ph-flow-overlay'), focused: document.activeElement === el } })
    })
    const expectModal = async step => { const r = await probe(); assert.equal(r.length, 7, step); assert(r.every(x => x.onFlow && !x.focused), `${step}: ${JSON.stringify(r.filter(x => !x.onFlow || x.focused))}`); assert.equal(await page.locator('.sch-wklbl').innerText(), ref.label); assert.equal(await page.locator('.sch-modal-overlay').count(), 0, 'desktop picker shown') }
    await expectModal('person step')
    await flowBox(page).locator(`.sch-ph-pick[data-person="${P.F1}"]`).tap(); await expectModal('days step')
    await dayRow(page, THU).tap(); await review(page); await expectModal('review step')
    await flowBtn(page, 'Cancel').tap()
  }))

  await check(T + 'P17 seven days ending Sunday in every view, with the 1440 labels', () => withS(W, async ({ page }) => {
    assert.deepEqual((await texts(page.locator('.sch-ph-wday-name'))).map(up), refDayNames)
    await view(page, 'Day'); assert.deepEqual((await texts(page.locator('.sch-ph-daybtn'))).map(up), refDayNames)
    await startAssign(page, TRIP.AW, P.F1)
    assert.deepEqual((await texts(flowBox(page).locator('.sch-ph-dayrow-name'))).map(up), refDayNames); await flowBtn(page, 'Cancel').tap()
    await view(page, 'Person'); await chip(page, P.X).tap(); await page.locator('.sch-ph-pdetail').waitFor()
    assert.deepEqual(await page.locator('.sch-ph-pday').evaluateAll(els => els.map(el => el.dataset.date)), WEEK)
    assert.deepEqual((await texts(page.locator('.sch-ph-pday span'))).map(up), refDayNames.map(n => n.split(' ')[0]))
    await view(page, 'Board'); assert.deepEqual((await texts(page.locator('.sch-brd-hdr'))).map(up), refDayNames)
    assert(refDayNames.length === WEEK.length && refDayNames.at(-1).startsWith('SUN'))
  }))

  await check(T + 'P17 choosing Sunday for F1 on A-wide saves one POST carrying the Sunday date', () => withS(W, async s => {
    const page = s.page
    await startAssign(page, TRIP.AW, P.F1); await dayRow(page, SUN).tap(); await review(page); await flowBtn(page, 'Save').tap(); await flowBox(page).waitFor({ state: 'detached' })
    assert.equal(s.log.writes.length, 1); assert.deepEqual(posts(s)[0].payload.map(r => r.date), [SUN])
  }), { local: true })
}

// ── D4: crossing 768px ──────────────────────────────────────────────────────
const narrow = page => page.setViewportSize({ width: 390, height: HEIGHTS[390] }), widen = page => page.setViewportSize({ width: 1440, height: HEIGHTS[1440] })
const desktopBack = async page => { await page.locator('.sch-pool').waitFor(); assert.equal(await page.locator('.sch-ph-switch, .sch-ph-flow, .sch-modal-overlay').count(), 0, 'an overlay or phone control is left') }
await check('D4 1440 → 390 → 1440 keeps the week and returns the desktop layout', () => withS(1440, async ({ page }) => {
  await page.locator('.sch-wknav').getByRole('button', { name: 'Next', exact: true }).click(); await page.waitForFunction(l => document.querySelector('.sch-wklbl').textContent === l, NEXT_LABEL)
  await narrow(page); await page.locator('.sch-ph-switch').waitFor(); assert.equal(await page.locator('.sch-wklbl').textContent(), NEXT_LABEL)
  await widen(page); await page.locator('.sch-ph-switch').waitFor({ state: 'detached' }); await desktopBack(page); assert.equal(await page.locator('.sch-wklbl').textContent(), NEXT_LABEL)
}), { local: true })
await check('D4 flow open on Review at 390: widening closes it, writes nothing, opens no desktop picker', () => withS(1440, async s => {
  const page = s.page; await narrow(page); await page.locator('.sch-ph-switch').waitFor()
  await view2(page, 'Day', THU); await card(page, TRIP.B).getByRole('button', { name: 'Assign', exact: true }).click(); await flowBox(page).locator(`.sch-ph-pick[data-person="${P.F1}"]`).click(); await dayRow(page, THU).click(); await flowBtn(page, 'Review').click()
  await widen(page); await flowBox(page).waitFor({ state: 'detached' }); await desktopBack(page); assert.equal(s.log.writes.length, 0)
}), { local: true })
await check('D4 Save in flight at 390: widening sends no further write; the save completes, then the flow closes; no desktop picker', () => withS(1440, async s => {
  const page = s.page; await narrow(page); await page.locator('.sch-ph-switch').waitFor()
  await view2(page, 'Day', THU); await card(page, TRIP.B).getByRole('button', { name: 'Assign', exact: true }).click(); await flowBox(page).locator(`.sch-ph-pick[data-person="${P.F1}"]`).click(); await dayRow(page, THU).click(); await flowBtn(page, 'Review').click()
  s.switches.holdWrites = true
  await flowBtn(page, 'Save').click(); await page.waitForTimeout(200); assert.equal(s.log.writes.length, 1)
  await widen(page); await page.waitForTimeout(300)
  assert.equal(s.log.writes.length, 1, 'the crossing sent a write'); assert.equal(await page.locator('.sch-modal-overlay').count(), 0)
  s.releaseWrites()
  await page.waitForFunction(() => !document.querySelector('.sch-ph-flow'))
  await desktopBack(page); assert.equal(s.log.writes.length, 1); assert(s.fixture.assignments.some(a => a.crew_name === P.F1 && a.date === THU && a.mobilization_id === TRIP.B), 'the save did not complete')
}), { local: true })
await check('D4 person open at 390: widening opens no crew week popup', () => withS(1440, async s => {
  const page = s.page; await narrow(page); await page.locator('.sch-ph-switch').waitFor()
  await tab(page, 'Person').click(); await chip(page, P.X).click(); await page.locator('.sch-ph-pdetail').waitFor()
  await widen(page); await page.locator('.sch-ph-switch').waitFor({ state: 'detached' }); await desktopBack(page); assert.equal(s.log.writes.length, 0)
}), { local: true })
await check('D4 desktop picker and crew week popup open at 1440: narrowing closes them with no write', () => withS(1440, async s => {
  const page = s.page
  await chip(page, P.F1).dragTo(page.locator(`[data-trip-row="${TRIP.B}"] .sch-brd-cell`).first())
  const modal = page.locator('.sch-modal').filter({ hasText: 'Assign Flo Fern' }); await modal.waitFor(); await modal.locator('.sch-modal-day').nth(3).click()
  await narrow(page); await page.locator('.sch-ph-switch').waitFor(); assert.equal(await page.locator('.sch-modal-overlay, .sch-ph-flow').count(), 0, 'picker left open')
  await widen(page); await page.locator('.sch-ph-switch').waitFor({ state: 'detached' }); assert.equal(await page.locator('.sch-modal-overlay').count(), 0, 'picker came back')
  await chip(page, P.X).click(); await page.locator('.sch-modal-detail').waitFor()
  await narrow(page); await page.locator('.sch-ph-switch').waitFor(); assert.equal(await page.locator('.sch-modal-overlay, .sch-ph-pdetail').count(), 0, 'popup or person left open')
  assert.equal(s.log.writes.length, 0)
}), { local: true })
async function view2(page, name, date) { await tab(page, name).click(); await page.locator(`.sch-ph-daybtn[data-date="${date}"]`).click(); await page.locator(`.sch-ph-daybtn[data-date="${date}"][aria-pressed="true"]`).waitFor() }

await browser.close(); await server?.close?.()
const failed = results.filter(r => r.pass === false), skipped = results.filter(r => r.pass === null)
const summary = { url: BASE + ROUTE, hosted: HOSTED, widths: WIDTHS, notes, checks: results.length, passed: results.filter(r => r.pass === true).length, failed: failed.length, skipped: skipped.length, shellWrites: shell.writes.length, shellRefused: shell.blocked.length }
await fs.writeFile(`${OUT}/results.json`, JSON.stringify({ summary, results, shellWrites: shell.writes, shellRefused: shell.blocked }, null, 2))
console.log(JSON.stringify({ ...summary, failed: failed.map(f => `${f.name} :: ${f.error}`), shellWrites: shell.writes, shellRefused: shell.blocked }, null, 2))
// A refused request fails the run, not only a failed check (H4).
if (failed.length || shell.writes.length || shell.blocked.length) process.exit(1)
console.log(`PASS: mobile crew scheduler checks (${summary.passed} passed${skipped.length ? `, ${skipped.length} local-only skipped` : ''})`)
process.exit(0)
