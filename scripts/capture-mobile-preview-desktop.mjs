// Usage: QA_OUT=/tmp/desktop-after node scripts/capture-mobile-preview-desktop.mjs
// Captures the plan's thirteen B1 desktop screens at 1440 with the same synthetic fixtures as check-mobile-preview.mjs.
// Run it once per directory (base commit, base again, this commit); check-mobile-preview.mjs compares the directories.
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { BASE, makeContext, writes, blocked, setCurrent } from './mobile-preview-fixtures.mjs';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || '/Users/chrisberger/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const out = process.env.QA_OUT || '/tmp/mobile-preview-desktop';
await fs.mkdir(out, { recursive: true });
const routes = ['/', '/sales/home', '/sales/calllog', '/sales/calllog/900', '/sales/proposals', '/sales/invoices', '/sales/customers', '/schedule/schedule', '/schedule/calendar', '/field/timeclock', '/ar/triage', '/settings'];
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const context = await makeContext(browser, 1440), page = await context.newPage();
await page.clock.setFixedTime(new Date('2026-10-01T00:00:00Z'));
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto(BASE); await page.locator('[data-app-shell]').waitFor();
const nav = async route => { setCurrent(route); await page.evaluate(p => { history.pushState({}, '', p); dispatchEvent(new PopStateEvent('popstate')); }, route); await page.waitForLoadState('networkidle'); };
for (const route of routes) {
  await nav(route); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/${route === '/' ? 'root' : route.slice(1).replaceAll('/', '-')}.png`, animations: 'disabled' });
}
// The open New Inquiry dialog. Nothing in it is filled in or saved.
await nav('/sales/calllog'); await page.getByRole('button', { name: /new inquiry/i }).first().click(); await page.waitForTimeout(200);
await page.screenshot({ path: `${out}/new-inquiry.png`, animations: 'disabled' });
await fs.writeFile(`${out}/result.json`, JSON.stringify({ url: BASE, routes, writes, blocked, errors }, null, 2));
await browser.close();
console.log(JSON.stringify({ screens: routes.length + 1, writes, blocked, errors }));
if (writes.length || blocked.length || errors.length) process.exitCode = 1;
