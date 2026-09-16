// Fixture Crew Scheduler: linked eligible visible, linked archived absent from
// active chips, legacy unlinked still visible. Load must not write crew/assignments.
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { createServer } from 'vite'

process.env.VITE_SUPABASE_URL = 'https://schedule-fixture.supabase.co'
process.env.VITE_SUPABASE_ANON_KEY = 'codex-fixture-only'

const PORT = 5199
const serveOnly = process.argv.includes('--serve')

const server = await createServer({
  root: resolve('.'),
  server: { host: '127.0.0.1', port: PORT, strictPort: true },
  plugins: [{
    name: 'eligibility-preview',
    resolveId(id) { if (id === 'virtual:eligibility') return '\0eligibility' },
    load(id) {
      if (id !== '\0eligibility') return
      return `import React from 'react';
        import {createRoot} from 'react-dom/client';
        import {MemoryRouter,Routes,Route} from 'react-router-dom';
        import ScheduleLayout from '/src/schedule/ScheduleLayout.jsx';
        const crew = [
          { name: 'Eligible Linked', archived: false, team: '1', team_member_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
          { name: 'Ineligible Linked', archived: true, team: '1', team_member_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' },
          { name: 'Legacy Unlinked', archived: false, team: '1', team_member_id: null },
        ];
        const jobs = [{
          job_id: 1, call_log_id: 100, job_num: '7201', job_name: 'Eligibility fixture job',
          status: 'Scheduled', deleted: 'No', merged_into_job_id: null,
          start_date: '2026-09-14', end_date: '2026-09-19', crew_needed: 2, job_wtcs: [],
          call_log: { id: 100, job_number: 7201, job_name: 'Eligibility fixture job', customer_name: 'Fixture' },
        }];
        const mobs = [{ id: 'trip-1', job_id: 1, seq: 1, label: 'Trip 1', start_date: '2026-09-14', end_date: '2026-09-19', crew_needed: 2 }];
        const assignments = [
          { id: 1, job_id: 1, crew_name: 'Eligible Linked', date: '2026-09-16', mobilization_id: 'trip-1', team_member_id: null },
          { id: 2, job_id: 1, crew_name: 'Ineligible Linked', date: '2026-09-16', mobilization_id: 'trip-1', team_member_id: null },
          { id: 3, job_id: 1, crew_name: 'Legacy Unlinked', date: '2026-09-16', mobilization_id: 'trip-1', team_member_id: null },
        ];
        window.__eligibilityWrites = [];
        const realFetch = window.fetch.bind(window);
        window.fetch = async (input, init = {}) => {
          const url = String(input);
          if (!url.includes('schedule-fixture.supabase.co')) return realFetch(input, init);
          const table = new URL(url, location.origin).pathname.split('/').filter(Boolean).pop();
          const method = (init.method || 'GET').toUpperCase();
          if (['POST','PATCH','PUT','DELETE'].includes(method) && (table === 'crew' || table === 'assignments')) {
            window.__eligibilityWrites.push({ table, method });
            return new Response(JSON.stringify({ message: 'fixture forbids writes' }), { status: 400, headers: { 'content-type': 'application/json' } });
          }
          const body = table === 'crew' ? crew
            : table === 'jobs' ? jobs
            : table === 'job_mobilizations' ? mobs
            : table === 'assignments' ? assignments
            : [];
          return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json', 'content-range': '0-0/0' } });
        };
        createRoot(document.getElementById('root')).render(
          React.createElement(MemoryRouter,{initialEntries:['/schedule/schedule']},
            React.createElement(Routes,null,
              React.createElement(Route,{path:'/schedule/*',element:React.createElement(ScheduleLayout,{teamMember:{name:'Fixture admin',role:'Admin'}})}))));`
    },
    configureServer(vite) {
      vite.middlewares.use('/__eligibility', async (_req, res) => {
        res.setHeader('Content-Type', 'text/html')
        res.end(await vite.transformIndexHtml('/__eligibility', `<html style="height:100%"><body style="height:100%;margin:0">
          <div data-app-shell style="display:flex;height:100vh;overflow:hidden">
            <div style="flex:1;display:flex;flex-direction:column;overflow:hidden">
              <div data-app-header style="height:50px;flex-shrink:0;background:#1c1814"></div>
              <div data-app-content style="flex:1;overflow-y:auto;min-height:0">
                <div id="root" style="height:100%"></div>
              </div>
            </div>
          </div>
          <script type="module">import "virtual:eligibility"</script>
        </body></html>`))
      })
    },
  }],
})
await server.listen()

if (serveOnly) {
  console.log(`http://127.0.0.1:${PORT}/__eligibility`)
} else {
  let chromium
  try {
    ({ chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright'))
  } catch {
    console.log(`PLAYWRIGHT_SKIPPED http://127.0.0.1:${PORT}/__eligibility`)
    process.exit(0)
  }
  let browser
  try {
    browser = await chromium.launch({
      headless: true,
      ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    })
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, timezoneId: 'America/Los_Angeles' })
    await page.clock.setFixedTime(new Date('2026-09-08T12:00:00-07:00'))
    page.setDefaultTimeout(20000)
    await page.goto(`http://127.0.0.1:${PORT}/__eligibility`)
    await page.waitForFunction(() => document.querySelectorAll('.sch-chip-name').length > 0)
    const chips = await page.evaluate(() => [...document.querySelectorAll('.sch-chip-name')].map(el => el.textContent.trim()))
    const writes = await page.evaluate(() => window.__eligibilityWrites || [])
    assert.ok(chips.includes('Eligible Linked'), 'linked eligible person is in the active list')
    assert.ok(!chips.includes('Ineligible Linked'), 'linked archived person is not an active choice')
    assert.ok(chips.includes('Legacy Unlinked'), 'legacy unlinked person remains visible')
    assert.equal(writes.length, 0, 'loading Crew Scheduler must not write crew or assignments')
    const shot = '/tmp/crew-schedule-eligibility-preview.png'
    await page.screenshot({ path: shot, fullPage: true })
    console.log('PASS Crew Scheduler eligibility preview')
    console.log('chips:', chips.join(' | '))
    console.log('screenshot:', shot)
  } finally {
    if (browser) await browser.close()
    await server.close()
  }
}
