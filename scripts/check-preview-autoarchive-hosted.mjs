// Preview archive guard, observed on a served bundle (F65 guard, re-checked for F66).
// Loads Call Log with a synthetic tenant that HAS archive stages and with
// eligible rows on offer, every backend request answered in the browser, and
// watches for the automatic archive's candidate query and its update.
//
//   EXPECT=skip     the bundle is a preview build: no candidate query, no update   (default)
//   EXPECT=archive  the bundle is not a preview build: the query and the update are attempted
//                   (control run against a local build; the update is refused by the fixture)
//
// QA_URL (required), QA_STORAGE_KEY, PLAYWRIGHT_MODULE, CHROME_PATH, QA_OUT.
// VERCEL_OIDC_TOKEN, when present, goes to the bundle's own origin only and is never logged.
// No sign-in, no real record. scripts/check-preview-autoarchive.mjs remains the source-level check.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
if (!process.env.QA_URL) throw new Error('QA_URL is required')
const { makeContext, BASE, writes, blocked } = await import('./mobile-preview-fixtures.mjs')
if (/(^|\.)(scmybiz\.com|sccmybiz\.com|salescommand\.app)$/.test(new URL(BASE).hostname)) { console.error('Refusing to run against a production host.'); process.exit(2) }
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright')
const EXPECT = process.env.EXPECT || 'skip'
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
const context = await makeContext(browser, 1440)
const token = process.env.VERCEL_OIDC_TOKEN, origin = new URL(BASE).origin
if (token && !/^(127\.0\.0\.1|localhost)$/.test(new URL(BASE).hostname)) {
  await context.route(url => url.origin === origin, route => ['GET', 'HEAD'].includes(route.request().method())
    ? route.continue({ headers: { ...route.request().headers(), 'x-vercel-trusted-oidc-idp-token': token } }) : route.fallback())
}
const seen = { candidateQueries: [], callLogWrites: [] }
const tenant = { id: 'fixture-tenant', company_name: 'Example Contractor', apps: ['sales', 'schedule', 'field', 'ar'], archive_stages: ['Lost'], archive_after_months: 12, monthly_billing_goal: 100000, leads_enabled: true }
await context.route(url => url.hostname.endsWith('.supabase.co') && /\/rest\/v1\/(tenant_config|call_log)$/.test(url.pathname), route => {
  const req = route.request(), url = new URL(req.url()), sp = url.searchParams, table = url.pathname.split('/').pop()
  if (req.method() === 'OPTIONS') return route.fallback()
  const json = (data, status = 200) => route.fulfill({ status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range', 'content-range': '0-1/2' }, body: JSON.stringify(data) })
  if (table === 'tenant_config' && req.method() === 'GET') return json((req.headers().accept || '').includes('vnd.pgrst.object') ? tenant : [tenant])
  if (table === 'call_log' && req.method() === 'GET' && sp.get('archived') === 'eq.false' && sp.has('stage') && sp.has('created_at')) {
    seen.candidateQueries.push(decodeURIComponent(url.search))
    return json([{ id: 901 }, { id: 902 }]) // two eligible rows on offer
  }
  if (table === 'call_log' && req.method() !== 'GET' && req.method() !== 'HEAD') seen.callLogWrites.push(`${req.method()} ${decodeURIComponent(url.search)}`)
  return route.fallback() // the shell fixture answers reads and refuses writes
})
const page = await context.newPage(), errors = []
page.on('pageerror', e => errors.push(e.message))
await page.goto(BASE + '/sales/calllog')
await page.locator('[data-app-shell]').waitFor({ timeout: 30000 })
await page.getByText('Commerce Center Long Operational Job Name').first().waitFor({ timeout: 30000 })
await page.waitForTimeout(1500)
const banner = await page.getByText(/archived/i).filter({ hasText: /auto|moved|job/i }).count()
const out = process.env.QA_OUT
if (out) { await fs.mkdir(out, { recursive: true }); await page.screenshot({ path: `${out}/calllog-archive-guard-${EXPECT}.png` }) }
await browser.close()
const result = { url: BASE + '/sales/calllog', expect: EXPECT, tenantArchiveStages: tenant.archive_stages, eligibleRowsOffered: 2, candidateQueries: seen.candidateQueries.length, callLogWrites: seen.callLogWrites, shellWritesRefused: writes, shellRefused: blocked, pageErrors: errors }
if (out) await fs.writeFile(`${out}/calllog-archive-guard-${EXPECT}.json`, JSON.stringify(result, null, 2))
console.log(JSON.stringify(result, null, 2))
assert.deepEqual(errors, [], 'page errors')
if (EXPECT === 'skip') {
  assert.equal(seen.candidateQueries.length, 0, 'the preview bundle asked for archive candidates')
  assert.deepEqual(seen.callLogWrites, [], 'the preview bundle tried to write call_log')
  assert.deepEqual(writes, [], 'a write was attempted'); assert.deepEqual(blocked, [], 'a request was refused')
  console.log('PASS: this bundle skips the automatic archive — no candidate query, no update, with archive stages set and eligible rows on offer.')
} else {
  assert(seen.candidateQueries.length >= 1, 'control: the non-preview bundle did not ask for archive candidates, so this probe would not detect the archive')
  assert(seen.callLogWrites.some(w => w.startsWith('PATCH')), 'control: the non-preview bundle did not attempt the archive update')
  console.log('PASS (control): a non-preview bundle asks for candidates and attempts the update; the fixture refused it. The probe detects the archive.')
}
