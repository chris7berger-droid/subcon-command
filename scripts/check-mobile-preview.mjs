// Usage: QA_OUT=/tmp/mobile-qa node scripts/check-mobile-preview.mjs
// Uses a separate browser profile and synthetic fixtures. Never click a write action.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { BASE, makeContext, writes, blocked, setCurrent, setRole } from './mobile-preview-fixtures.mjs';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || '/Users/chrisberger/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const out = process.env.QA_OUT || '/tmp/mobile-preview-qa';
await fs.mkdir(out, {recursive:true});
const widths=(process.env.QA_WIDTHS || '360,390,430,640,768').split(',').map(Number);
const report={url:BASE,widths,checks:[],errors:[],writes,blocked};
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const slug=s=>s.replaceAll(/[^a-z0-9]/gi,'-');
async function check(name, fn, page){try {await fn();report.checks.push({name,pass:true});} catch(e){report.checks.push({name,pass:false,error:e.message});if(page)await page.screenshot({path:`${out}/FAIL-${slug(name)}.png`}).catch(()=>{});}await fs.writeFile(out+'/checkpoint.json',JSON.stringify(report,null,2));console.log(name+': '+(report.checks.at(-1).pass?'PASS':report.checks.at(-1).error));}
async function go(page,path){setCurrent(path);await page.evaluate(p=>{history.pushState({},'',p);dispatchEvent(new PopStateEvent('popstate'));},path);await page.waitForLoadState('networkidle');await page.waitForTimeout(150);}
async function noOverflow(page){const m=await page.evaluate(()=>{const c=document.querySelector('[data-app-content]');return {viewport:innerWidth,doc:document.documentElement.scrollWidth,client:c?.clientWidth,scroll:c?.scrollWidth};});assert(m.doc<=m.viewport+1,JSON.stringify(m));assert(m.scroll<=m.client+1,JSON.stringify(m));}
async function target(locator,min=44){await locator.waitFor({state:'visible'});const r=await locator.evaluate(el=>{const b=el.getBoundingClientRect();const h=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return {x:b.x,y:b.y,w:b.width,h:b.height,right:b.right,bottom:b.bottom,vw:innerWidth,vh:innerHeight,hit:h===el||el.contains(h)};});assert(r.x>=-1&&r.y>=-1&&r.right<=r.vw+1&&r.bottom<=r.vh+1&&r.w>=min&&r.h>=min&&r.hit,JSON.stringify(r));}
const p1=['/','/sales/home','/sales/calllog','/sales/calllog/900'];
const p2=['/sales/leads','/sales/proposals','/sales/invoices','/sales/customers','/sales/customers/customer-0'];
const smoke=['/sales/proposals/proposal-0','/sales/invoices/20010','/sales/team','/sales/archive','/schedule/home','/schedule/jobs','/schedule/schedule','/schedule/calendar','/schedule/daily','/schedule/materials','/schedule/billing','/schedule/production-rate','/schedule/schedules','/schedule/import','/schedule/settings','/field/today','/field/jobs','/field/crews','/field/timeclock','/field/dailylogs','/field/loadouts','/ar/triage','/ar/aging','/ar/action','/ar/health','/ar/cff','/ar/invoices','/settings'];
async function wizardCheck(page,label){
 const dialog=page.locator('.cl-dialog').filter({has:page.getByRole('heading',{name:/new inquiry/i})});
 const close=page.getByRole('button',{name:'Close inquiry',exact:true});
 await target(close);
 const next=page.getByRole('button',{name:/^(Next step|Save inquiry)$/});await target(next);
 const prev=page.getByRole('button',{name:'Previous step',exact:true});if(await prev.count())await target(prev);
 const m=await dialog.evaluate(el=>{const b=el.getBoundingClientRect();return {left:b.left,right:b.right,width:innerWidth,client:el.clientWidth,scroll:el.scrollWidth};});assert(m.left>=0&&m.right<=m.width+1&&m.scroll<=m.client+1,`${label}: ${JSON.stringify(m)}`);
}
async function walkWizard(page,width,co=false){
 await go(page,co?'/sales/calllog/900':'/sales/calllog');
 await page.getByRole('button',{name:co?/add co/i:/new inquiry/i}).first().click();
 await wizardCheck(page,'start');
 if(co){await page.getByRole('button',{name:/wrap into parent job/i}).click();}
 else {
  await page.getByRole('button',{name:/commercial.*business name/i}).click();await wizardCheck(page,'customer');
  await page.getByRole('button',{name:/select customer/i}).last().click();
  if(width<=600)assert.equal(await page.getByPlaceholder('Type to search...').evaluate(el=>parseFloat(getComputedStyle(el).fontSize)),16);await page.getByRole('button',{name:'Northline Builders',exact:true}).click();
  await page.getByRole('button',{name:'Next step',exact:true}).click();
 }
 await page.getByPlaceholder('e.g. Warehouse Demo, Lobby Polish').fill('Synthetic phone draft');await wizardCheck(page,'project');
 await page.getByRole('button',{name:'Next step',exact:true}).focus();await page.keyboard.press('Enter');await wizardCheck(page,'contact');
 if(width===360){for(let i=0;i<3;i++)await page.getByRole('button',{name:'+ Add Contact',exact:true}).click();const dialog=page.locator('.sc-inquiry-dialog');assert(await dialog.evaluate(el=>el.scrollHeight>el.clientHeight));await dialog.evaluate(el=>{el.scrollTop=el.scrollHeight;});await target(page.getByRole('button',{name:'Close inquiry',exact:true}));await dialog.evaluate(el=>{el.scrollTop=0;});}
 await page.getByRole('button',{name:'Next step',exact:true}).click();await wizardCheck(page,'addresses');
 await page.getByRole('button',{name:'Next step',exact:true}).click();await wizardCheck(page,'rep');
 await page.locator('.cl-dialog select').filter({has:page.locator('option', {hasText:'— Select Sales Rep —'})}).selectOption({label:'Alex Morgan'});
 await page.getByRole('button',{name:'Next step',exact:true}).click();await wizardCheck(page,'worktypes');
 await page.getByRole('button',{name:/Surface preparation SP-01/i}).click();
 await page.getByRole('button',{name:'Next step',exact:true}).click();await wizardCheck(page,'bid due');
 await page.locator('.cl-dialog input[type=date]').fill('2026-10-15');
 await page.getByRole('button',{name:'Next step',exact:true}).click();await wizardCheck(page,'followup');
 await page.getByRole('button',{name:'No',exact:true}).click();await wizardCheck(page,'notes');
 await page.getByPlaceholder('Add any notes about this job…').fill('Synthetic unsaved note');
 const save=page.getByRole('button',{name:'Save inquiry',exact:true});assert(await save.isEnabled());
 await page.getByRole('button',{name:'Previous step',exact:true}).click();await page.getByRole('button',{name:'No',exact:true}).click();
 assert.equal(await page.getByPlaceholder('Add any notes about this job…').inputValue(),'Synthetic unsaved note');
 await page.screenshot({path:`${out}/${width}-${co?'co':'inquiry'}-final.png`,animations:'disabled'});
 await page.getByRole('button',{name:'Close inquiry',exact:true}).click();
 assert.equal(await page.getByRole('button',{name:'Save inquiry',exact:true}).count(),0);
}
const desktopHeaders={};
{
 const context=await makeContext(browser,1440),page=await context.newPage();
 await page.clock.setFixedTime(new Date('2026-10-01T00:00:00Z'));await page.goto(BASE);await page.locator('[data-app-shell]').waitFor({timeout:30000});
 for(const route of [...p1,...p2]){await go(page,route);desktopHeaders[route]=await page.locator('table thead th').allTextContents();}
 await context.close();
}
for(const width of widths){
 const context=await makeContext(browser,width),page=await context.newPage();page.setDefaultTimeout(6000);
 await page.clock.setFixedTime(new Date('2026-10-01T00:00:00Z'));
 page.on('pageerror',e=>report.errors.push({width,url:page.url(),message:e.message}));
 await page.goto(BASE);await page.locator('[data-app-shell]').waitFor({timeout:30000});
 const menu=page.getByRole('button',{name:'Open navigation',exact:true});
 if(width!==640){
 await check(`${width} drawer close modes and focus`,async()=>{
  await target(menu);assert.equal(await menu.getAttribute('aria-expanded'),'false');
  const closed=await page.locator('[data-app-sidebar]').evaluate(el=>getComputedStyle(el).display==='none'||getComputedStyle(el).visibility==='hidden'||el.inert||el.getBoundingClientRect().right<=0);assert(closed);
  for(const mode of ['close','escape','outside']){await menu.click();assert.equal(await menu.getAttribute('aria-expanded'),'true');await target(page.getByRole('button',{name:'Close navigation',exact:true}));if(mode==='close')await page.getByRole('button',{name:'Close navigation',exact:true}).click();if(mode==='escape')await page.keyboard.press('Escape');if(mode==='outside')await page.mouse.click(width-5,200);assert.equal(await menu.getAttribute('aria-expanded'),'false');assert(await menu.evaluate(el=>el===document.activeElement));}
 },page);
 for(const route of [...p1,...p2])await check(`${width} layout ${route}`,async()=>{await go(page,route);await noOverflow(page);assert.deepEqual(await page.locator('table thead th').allTextContents(),desktopHeaders[route]);assert(!/Something went wrong/.test(await page.locator('[data-app-content]').innerText()));await page.screenshot({path:`${out}/${width}-${slug(route)}.png`,animations:'disabled'});},page);
 await check(`${width} drawer preserves edited job`,async()=>{
  await go(page,'/sales/calllog/900');await page.getByRole('button',{name:/^.*Edit$/}).first().click();
  await page.getByRole('button',{name:/^Notes/}).click();const notes=page.locator('[data-app-content] textarea').first();await notes.fill('Synthetic unsaved draft');const before=page.url();
  await menu.click();await page.getByRole('button',{name:'Close navigation',exact:true}).click();assert.equal(await notes.inputValue(),'Synthetic unsaved draft');assert.equal(page.url(),before);
  await menu.focus();await page.keyboard.press('Tab');assert(!await page.evaluate(()=>!!document.activeElement.closest('[data-app-sidebar]')));
 },page);
 await check(`${width} CallLog filter, table scroll and selected job`,async()=>{
  await go(page,'/sales/calllog');await target(page.locator('.sc-page-badge'),36);await target(page.locator('.cl-jump'));
  const overlap=await page.evaluate(()=>{const a=document.querySelector('.sc-page-badge').getBoundingClientRect(),b=document.querySelector('.cl-jump').getBoundingClientRect();return a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom;});assert(!overlap);
  await page.getByTitle('View Wants Bid jobs',{exact:true}).click();assert.equal(await page.locator('table tbody tr').count(),2);
  const search=page.getByRole('textbox',{name:'Search jobs',exact:true});await search.fill('Warehouse');assert.equal(await page.locator('table tbody tr').count(),1);
  await menu.click();await page.getByRole('button',{name:'Close navigation',exact:true}).click();assert.equal(await search.inputValue(),'Warehouse');
  await page.locator('table').evaluate(t=>{t.parentElement.scrollLeft=t.parentElement.scrollWidth;});await page.locator('table').getByRole('button',{name:'View',exact:true}).click();assert.equal(new URL(page.url()).pathname,'/sales/calllog/901');
 },page);
 await check(`${width} Customer detail table tabs`,async()=>{
  await go(page,'/sales/customers/customer-0');const content=page.locator('[data-app-content]');
  for(const [name,count] of [['Jobs',4],['Proposals',5],['Invoices',6]]){await content.getByRole('button',{name:new RegExp('^'+name)}).click();const table=content.locator('table');assert.equal(await table.locator('thead th').count(),count);const m=await table.evaluate(t=>{const f=t.parentElement;f.scrollLeft=f.scrollWidth;return {overflow:getComputedStyle(f).overflowX,right:t.querySelector('thead th:last-child').getBoundingClientRect().right,frame:f.getBoundingClientRect().right};});assert.equal(m.overflow,'auto');assert(m.right<=m.frame+1);await noOverflow(page);}
 },page);
 await check(`${width} Directory geometry`,async()=>{await go(page,'/sales/home');await page.locator('.sc-page-badge').click();await target(page.getByRole('button',{name:'Close directory',exact:true}));await page.getByRole('button',{name:'Close directory',exact:true}).click();},page);
 }
 await check(`${width} standard inquiry ten steps`,()=>walkWizard(page,width),page);
 // Recover only by loading the same fixture origin after a failed interaction.
 if(await page.getByRole('button',{name:'Close inquiry',exact:true}).count())await page.getByRole('button',{name:'Close inquiry',exact:true}).click();
 await check(`${width} change order wizard`,()=>walkWizard(page,width,true),page);
 if(await page.getByRole('button',{name:'Close inquiry',exact:true}).count())await page.getByRole('button',{name:'Close inquiry',exact:true}).click();
 if(!process.env.QA_SKIP_SMOKE&&[390,768].includes(width))for(const route of smoke)await check(`${width} smoke ${route}`,async()=>{await go(page,route);assert(!/Something went wrong/.test(await page.locator('[data-app-content]').innerText()));await menu.click();await page.locator('[data-app-sidebar]').getByTitle('Home',{exact:true}).first().click();assert.equal(new URL(page.url()).pathname,'/');assert.equal(await menu.getAttribute('aria-expanded'),'false');},page);
 await context.close();
}
// Role-sensitive navigation and the existing Manager-only page.
for(const role of ['Manager','Sales']){
 setRole(role);const context=await makeContext(browser,390),page=await context.newPage();await page.clock.setFixedTime(new Date('2026-10-01T00:00:00Z'));await page.goto(BASE);await page.locator('[data-app-shell]').waitFor({timeout:30000});
 await check(`${role} route authorization`,async()=>{await go(page,role==='Manager'?'/sales/managers':'/settings');const text=await page.locator('[data-app-content]').innerText();if(role==='Sales')assert(/Not authorized/i.test(text));else assert(!/Not authorized|Something went wrong/i.test(text));},page);
 await context.close();
}
setRole('Admin');
{
 const context=await makeContext(browser,360);await context.addInitScript(()=>localStorage.clear());const page=await context.newPage();await page.goto(BASE+'/login');
 await check('360 Login geometry and input sizes',async()=>{await page.locator('input[type=password]').waitFor({timeout:30000});const fields=await page.locator('input:not([type=checkbox])').evaluateAll(es=>es.map(el=>({font:parseFloat(getComputedStyle(el).fontSize),right:el.getBoundingClientRect().right})));assert(fields.every(f=>f.font>=16&&f.right<=360));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),360);},page);await context.close();
}
{
 const context=await makeContext(browser,1440),page=await context.newPage();await page.goto(BASE);await page.locator('[data-app-shell]').waitFor({timeout:30000});
 await check('desktop collapse and breakpoint restore',async()=>{
  const sidebar=page.locator('[data-app-sidebar]');assert.equal(Math.round((await sidebar.boundingBox()).width),228);assert(!await page.getByRole('button',{name:'Open navigation',exact:true}).isVisible());
  for(const expected of [228,56]){if(expected===56)await page.getByRole('button',{name:/Collapse/i}).click();await page.waitForTimeout(250);await page.setViewportSize({width:390,height:844});await page.waitForTimeout(150);assert.equal(await page.getByRole('button',{name:'Open navigation',exact:true}).getAttribute('aria-expanded'),'false');await page.setViewportSize({width:1440,height:1000});await page.waitForTimeout(250);assert.equal(Math.round((await sidebar.boundingBox()).width),expected);}
 },page);await context.close();
}
await browser.close();
await fs.writeFile(out+'/results.json',JSON.stringify(report,null,2));
const failures=report.checks.filter(c=>!c.pass);console.log(JSON.stringify({checks:report.checks.length,failures,errors:report.errors,writes},null,2));
if(failures.length||report.errors.length||writes.length)process.exitCode=1;
