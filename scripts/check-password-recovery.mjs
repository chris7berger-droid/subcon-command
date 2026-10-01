// Real app entry point (App + Login), synthetic auth. Every Supabase / edge
// request is answered from fixtures; every other non-static request is blocked.
// Fake credentials only — nothing here reaches a real auth server.
//
//   BASE_URL=http://127.0.0.1:5197 PLAYWRIGHT_MODULE=<path to playwright-core> \
//     node scripts/check-password-recovery.mjs
//
// Protected Vercel preview: `vercel env run -- node scripts/check-password-recovery.mjs`
// with BASE_URL set. VERCEL_OIDC_TOKEN, when present, is sent only to BASE_URL's
// own origin and is never logged. Not for production hosts.
import assert from 'node:assert/strict'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = (process.env.BASE_URL || process.env.PREVIEW_URL || 'http://127.0.0.1:5197').replace(/\/$/, '')
if (/(^|\.)(scmybiz\.com|sccmybiz\.com|salescommand\.app)$/.test(new URL(base).hostname)) {
  console.error('Refusing to run against a production host.')
  process.exit(2)
}
const previewToken = process.env.VERCEL_OIDC_TOKEN
const browser = await chromium.launch({ channel: 'chrome', headless: true })

const EMAIL = 'fixture@example.test'
const user = { id: '00000000-0000-4000-8000-000000000001', email: EMAIL, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' }
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url')
const exp = Math.floor(Date.now() / 1000) + 3600
const accessToken = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: user.id, exp, role: 'authenticated' })}.fixture-only`
const session = { access_token: accessToken, refresh_token: 'fixture-only', expires_at: exp, expires_in: 3600, token_type: 'bearer', user }
const member = { id: 'fixture-member', name: 'Fixture User', role: 'Admin', email: EMAIL, onboarded: true, apps: ['sales'] }
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }
const MSG = {
  rejected: 'New password should be different from the old password.',
  badCode: 'That code is invalid or expired. Request a new one.',
  signout: 'Password updated, but sign-out did not finish. Try again.',
  done: 'Password updated. Please sign in with your new password.',
}

// One isolated browser context per scenario. `plan` scripts the auth server:
// verify: 'ok' | 'bad' · saves / logouts: one entry per call ('ok' | 'reject' | 'hold' | 'fail').
async function open({ verify = 'ok', saves = [], logouts = [], seed = {}, path = '/login' } = {}) {
  const calls = { verify: 0, save: 0, logout: 0, password: 0, blocked: [] }
  let releaseSave = null
  const context = await browser.newContext()
  await context.addInitScript(seedValues => {
    if (sessionStorage.getItem('fixture_seeded')) return
    sessionStorage.setItem('fixture_seeded', '1')
    for (const [k, v] of Object.entries(seedValues)) localStorage.setItem(k, v)
  }, seed)
  await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url())
    const json = (status, body) => route.fulfill({ status, contentType: 'application/json', headers: cors, body: JSON.stringify(body) })
    if (url.origin === new URL(base).origin) {
      return route.continue(previewToken ? { headers: { ...req.headers(), 'x-vercel-trusted-oidc-idp-token': previewToken } } : undefined)
    }
    const api = /\/(auth|rest|functions|storage|realtime)\/v1\//.test(url.pathname)
    if (!api) { calls.blocked.push(url.origin); return route.abort() }
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    if (url.pathname.endsWith('/auth/v1/verify')) {
      calls.verify += 1
      // A recovery code works once.
      return verify === 'ok' && calls.verify === 1 ? json(200, session) : json(403, { code: 403, error_code: 'otp_expired', msg: 'Token has expired or is invalid' })
    }
    if (url.pathname.endsWith('/auth/v1/user') && req.method() === 'PUT') {
      calls.save += 1
      const step = saves.shift() ?? 'ok'
      if (step === 'hold') await new Promise(resolve => { releaseSave = resolve })
      return step === 'ok' ? json(200, user) : json(422, { code: 422, error_code: 'same_password', msg: MSG.rejected })
    }
    if (url.pathname.endsWith('/auth/v1/user')) return json(200, user)
    if (url.pathname.endsWith('/auth/v1/logout')) {
      calls.logout += 1
      return (logouts.shift() ?? 'ok') === 'ok' ? route.fulfill({ status: 204, headers: cors }) : json(500, { code: 500, msg: 'fixture failure' })
    }
    if (url.pathname.endsWith('/auth/v1/token')) {
      if (url.searchParams.get('grant_type') === 'password') calls.password += 1
      return json(200, session)
    }
    if (url.pathname.endsWith('/rest/v1/team_members') && (req.headers().accept || '').includes('vnd.pgrst.object')) return json(200, member)
    return json(200, [])
  })
  const page = await context.newPage()
  await page.goto(base + path)
  const s = {
    page, calls, context,
    releaseSave: () => releaseSave?.(),
    text: () => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ')),
    inApp: () => page.evaluate(() => Boolean(document.querySelector('[data-app-shell]'))),
    // Tag the mounted reset form so a remount is detectable.
    tagForm: () => page.evaluate(() => { window.__resetForm = document.querySelector('form') }),
    sameForm: () => page.evaluate(() => Boolean(window.__resetForm?.isConnected)),
    marker: () => page.evaluate(() => localStorage.getItem('sc_recovery_user')),
    async fill({ code, password }) {
      if (code !== undefined) await page.fill('input[autocomplete="one-time-code"]', code)
      const pw = page.locator('input[type="password"]')
      await pw.nth(0).fill(password); await pw.nth(1).fill(password)
    },
    submit: () => page.click('button[type="submit"]'),
    see: needle => page.waitForFunction(n => document.body.innerText.replace(/\s+/g, ' ').includes(n), needle, { timeout: 15000 }),
  }
  return s
}
const pending = { sc_reset_pending: '1', sc_reset_email: EMAIL }
const resetForm = s => s.page.waitForSelector('button[type="submit"]:has-text("Set New Password")', { timeout: 15000 })

async function scenario(name, fn) {
  let s
  try {
    s = await fn()
    assert.deepEqual([...new Set(s.calls.blocked)].filter(o => !/fonts\.(googleapis|gstatic)\.com/.test(o)), [], 'no unexpected outbound request')
    console.log(`ok - ${name}`)
  } finally {
    await s?.context.close()
  }
}

let failed = 0
const run = (name, fn) => process.env.ONLY && !name.includes(process.env.ONLY) ? null : scenario(name, fn).catch(err => { failed += 1; console.log(`not ok - ${name}\n    ${String(err.message).split('\n')[0]}`) })

await run('typed code: delayed save, double submit, rejection, retry, sign-in', async () => {
  const s = await open({ seed: pending, saves: ['hold', 'ok'] })
  await resetForm(s); await s.tagForm()
  await s.fill({ code: '000000', password: 'fixture-old-value' })
  await s.submit()
  await s.page.waitForFunction(() => document.querySelector('button[type="submit"]')?.innerText === 'Updating...')
  await s.page.waitForTimeout(4500) // longer than the 3s boot loader the bug fell through to
  assert.equal(await s.inApp(), false, 'app not entered while the save is in flight')
  assert.equal(await s.sameForm(), true, 'the same reset form stays mounted while the save is in flight')
  await s.page.evaluate(() => window.__resetForm.requestSubmit()) // forced double submit
  await s.page.waitForTimeout(300)
  assert.deepEqual([s.calls.verify, s.calls.save], [1, 1], 'double submit sends nothing twice')
  s.releaseSave()
  await s.see(MSG.rejected)
  assert.equal(await s.sameForm(), true, 'rejection is shown on the same mounted form')
  assert.equal(await s.inApp(), false, 'app not entered after a rejected save')
  assert.equal(await s.marker(), user.id, 'unfinished reset is bound to the verified user id')
  await s.fill({ password: 'fixture-new-value' })
  await s.submit()
  await s.see(MSG.done)
  assert.deepEqual([s.calls.verify, s.calls.save, s.calls.logout], [1, 2, 1], 'retry verified once, saved again, signed out')
  assert.equal(new URL(s.page.url()).pathname, '/login', 'returns to sign in')
  assert.equal(await s.marker(), null, 'marker cleared')
  await s.page.fill('input[type="email"]', EMAIL)
  await s.page.fill('input[type="password"]', 'fixture-new-value')
  await s.submit()
  await s.page.waitForSelector('[data-app-shell]', { timeout: 15000 })
  assert.equal(s.calls.password, 1, 'a fresh password sign-in admits the app')
  return s
})

await run('typed code: sign-out failure keeps recovery, retry does not save twice', async () => {
  const s = await open({ seed: pending, logouts: ['fail', 'ok'] })
  await resetForm(s); await s.tagForm()
  await s.fill({ code: '000000', password: 'fixture-new-value' })
  await s.submit()
  await s.see(MSG.signout)
  assert.equal(await s.sameForm(), true, 'form stays mounted')
  assert.equal(await s.inApp(), false, 'app not entered')
  assert.equal(await s.marker(), user.id, 'recovery not cleared')
  await s.submit()
  await s.see(MSG.done)
  assert.deepEqual([s.calls.verify, s.calls.save, s.calls.logout], [1, 1, 2], 'only the sign-out was retried')
  return s
})

await run('typed code: invalid code', async () => {
  const s = await open({ seed: pending, verify: 'bad' })
  await resetForm(s); await s.tagForm()
  await s.fill({ code: '111111', password: 'fixture-new-value' })
  await s.submit()
  await s.see(MSG.badCode)
  assert.equal(await s.sameForm(), true, 'form stays mounted')
  assert.equal(await s.page.locator('input[autocomplete="one-time-code"]').count(), 1, 'code field still offered')
  assert.deepEqual([s.calls.save, await s.inApp(), await s.marker()], [0, false, null], 'nothing saved, not admitted')
  return s
})

await run('typed code: back to sign in after a verified code ends the session', async () => {
  const s = await open({ seed: pending, saves: ['reject'] })
  await resetForm(s)
  await s.fill({ code: '000000', password: 'fixture-old-value' })
  await s.submit()
  await s.see(MSG.rejected)
  await s.page.click('button:has-text("Back to sign in")')
  await s.page.waitForSelector('button[type="submit"]:has-text("Sign In")')
  assert.deepEqual([s.calls.logout, await s.inApp(), await s.marker()], [1, false, null], 'session ended, not admitted')
  return s
})

await run('typed code: refresh after a verified code does not admit the app', async () => {
  const s = await open({ seed: pending, saves: ['reject'] })
  await resetForm(s)
  await s.fill({ code: '000000', password: 'fixture-old-value' })
  await s.submit()
  await s.see(MSG.rejected)
  await s.page.reload()
  await resetForm(s)
  assert.deepEqual([s.calls.logout, await s.inApp(), await s.marker()], [1, false, null], 'recovery session ended on return')
  return s
})

await run('recovery link: saves with no code, with "Remember me" off', async () => {
  const hash = `#access_token=${accessToken}&refresh_token=fixture-only&expires_in=3600&expires_at=${exp}&token_type=bearer&type=recovery`
  const s = await open({ seed: { sc_remember: 'false' }, path: '/login' + hash })
  await resetForm(s); await s.tagForm()
  assert.equal(await s.page.locator('input[autocomplete="one-time-code"]').count(), 0, 'no code field for a link')
  await s.page.waitForTimeout(1500)
  assert.equal(s.calls.logout, 0, 'startup did not sign the link session out')
  await s.fill({ password: 'fixture-new-value' })
  await s.submit()
  await s.see(MSG.done)
  assert.deepEqual([s.calls.verify, s.calls.save, s.calls.logout >= 1], [0, 1, true], 'saved against the link session, then signed out')
  assert.equal(await s.inApp(), false, 'lands on sign in, not the app')
  return s
})

await browser.close()
console.log(failed ? `password recovery: ${failed} scenario(s) FAILED` : 'password recovery: all browser scenarios passed')
process.exit(failed ? 1 : 0)
