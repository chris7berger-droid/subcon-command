// Usage: QA_OUT=/tmp/mobile-qa node scripts/check-mobile-preview.mjs
// B1 (desktop pixels): capture with scripts/capture-mobile-preview-desktop.mjs, then set QA_DESKTOP_BASE (base commit),
// QA_DESKTOP_BASE_REPEAT (a second capture of the base: the noise floor) and QA_DESKTOP_AFTER (this commit).
// Optional QA_DESKTOP_AFTER_REPEAT (this commit again) is recorded beside each row as information; it never changes pass/fail.
// A literal B1 failure stays a failure in the results. QA_B1_ACCEPT_MAX_CHANNEL=N
// marks it "waived" (and keeps the exit code clean) only when every differing
// pixel is within N channel levels; the literal result is still recorded.
// Uses a separate browser profile and synthetic fixtures. Never click a write action.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { BASE, makeContext, writes, blocked, setCurrent, setRole } from './mobile-preview-fixtures.mjs';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || '/Users/chrisberger/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const out = process.env.QA_OUT || '/tmp/mobile-preview-qa';
await fs.mkdir(out, {recursive:true});
const widths=(process.env.QA_WIDTHS || '360,390,430,640,768').split(',').map(Number);
const report={url:BASE,widths,checks:[],errors:[],writes,blocked,b1:null};
const slug=s=>s.replaceAll(/[^a-z0-9]/gi,'-');
async function check(name, fn, page){try {await fn();report.checks.push({name,pass:true});} catch(e){report.checks.push({name,pass:false,error:e.message});if(page)await page.screenshot({path:`${out}/FAIL-${slug(name)}.png`}).catch(()=>{});}await fs.writeFile(out+'/checkpoint.json',JSON.stringify(report,null,2));console.log(name+': '+(report.checks.at(-1).pass?'PASS':report.checks.at(-1).error));}
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser=await chromium.launch({executablePath:CHROME,headless:true});
async function go(page,path){setCurrent(path);await page.evaluate(p=>{history.pushState({},'',p);dispatchEvent(new PopStateEvent('popstate'));},path);await page.waitForLoadState('networkidle');await page.waitForTimeout(150);}
async function noOverflow(page){const m=await page.evaluate(()=>{const c=document.querySelector('[data-app-content]');return {viewport:innerWidth,doc:document.documentElement.scrollWidth,client:c?.clientWidth,scroll:c?.scrollWidth};});assert(m.doc<=m.viewport+1,JSON.stringify(m));assert(m.scroll<=m.client+1,JSON.stringify(m));}
async function target(locator,min=44){await locator.waitFor({state:'visible'});const r=await locator.evaluate(el=>{const b=el.getBoundingClientRect();const h=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return {x:b.x,y:b.y,w:b.width,h:b.height,right:b.right,bottom:b.bottom,vw:innerWidth,vh:innerHeight,hit:h===el||el.contains(h)};});assert(r.x>=-1&&r.y>=-1&&r.right<=r.vw+1&&r.bottom<=r.vh+1&&r.w>=min&&r.h>=min&&r.hit,JSON.stringify(r));}

// ── Acceptance helpers (plan §5 A/C/D). Read-only: none of these activates a save, send, delete, merge or invite control.
const content=page=>page.locator('[data-app-content]');
// Fully inside the viewport and hit-testable at its centre; no minimum size.
async function inView(locator){await locator.scrollIntoViewIfNeeded();await target(locator,0);}
// Horizontally inside the viewport (for rows further down a scrolling page).
async function insideX(page,selector){const bad=await page.locator(selector).evaluateAll(es=>es.map(e=>{const b=e.getBoundingClientRect();return {t:(e.textContent||'').trim().slice(0,30),l:Math.round(b.left),r:Math.round(b.right),w:innerWidth};}).filter(m=>m.r>m.l&&(m.l<-1||m.r>m.w+1)));assert.equal(bad.length,0,JSON.stringify(bad.slice(0,4)));}
async function controlSizes(page,scope,label){const m=await page.locator(scope).first().evaluate(root=>{const vis=e=>{const b=e.getBoundingClientRect(),c=getComputedStyle(e);return b.width>0&&b.height>0&&c.visibility!=='hidden';};const t=e=>(e.getAttribute('aria-label')||e.placeholder||e.textContent||e.type||'').trim().slice(0,30);return {fields:[...root.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=hidden]),select,textarea')].filter(vis).map(e=>({t:t(e),font:parseFloat(getComputedStyle(e).fontSize)})).filter(f=>f.font<16),buttons:[...root.querySelectorAll('button')].filter(vis).map(e=>({t:t(e),h:Math.round(e.getBoundingClientRect().height*10)/10})).filter(b=>b.h<36)};});assert(m.fields.length===0&&m.buttons.length===0,`${label}: ${JSON.stringify(m)}`);}
// Sidebar/drawer navigation model: every row's label, title and active marker, in order.
async function navModel(page){return page.locator('[data-app-sidebar] button').evaluateAll(es=>es.filter(e=>!e.hasAttribute('data-drawer-close')&&!/collapse/i.test(e.textContent)).map(e=>[(e.textContent||'').replace(/\s+/g,' ').trim(),e.title||'',e.getAttribute('aria-current')==='page'||(!!e.style.background&&e.style.background!=='transparent')]));}
const detailActions=page=>page.locator('.sc-cld-nav button, .sc-cld-head button').evaluateAll(es=>es.filter(e=>e.getBoundingClientRect().width>0).map(e=>e.textContent.replace(/\s+/g,' ').trim()));
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
 if(page.viewportSize().width<=600)await controlSizes(page,'.sc-inquiry',`C5 wizard ${label}`);
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
 await go(page,'/sales/calllog/900');desktopHeaders.detailActions=await detailActions(page);
 await context.close();
}
// A3: the drawer shows what the 1440 sidebar shows, for each fixture user.
for(const role of ['Admin','Manager','Sales']){
 setRole(role);let desktopNav;
 {const context=await makeContext(browser,1440),page=await context.newPage();await page.clock.setFixedTime(new Date('2026-10-01T00:00:00Z'));await page.goto(BASE);await page.locator('[data-app-shell]').waitFor({timeout:30000});await go(page,'/sales/calllog');desktopNav=await navModel(page);await context.close();}
 for(const width of widths.filter(w=>w!==640)){
  const context=await makeContext(browser,width),page=await context.newPage();page.setDefaultTimeout(6000);await page.clock.setFixedTime(new Date('2026-10-01T00:00:00Z'));page.on('pageerror',e=>report.errors.push({width,url:page.url(),message:e.message}));
  await page.goto(BASE);await page.locator('[data-app-shell]').waitFor({timeout:30000});
  await check(`${width} A3 drawer equals 1440 sidebar (${role})`,async()=>{
   await go(page,'/sales/calllog');await page.getByRole('button',{name:'Open navigation',exact:true}).click();
   assert(desktopNav.length>3);assert.deepEqual(await navModel(page),desktopNav);
   const m=await page.locator('[data-app-sidebar]').evaluate(el=>({right:el.getBoundingClientRect().right,vw:innerWidth,short:[...el.querySelectorAll('button')].map(b=>({t:(b.getAttribute('aria-label')||b.title||b.textContent).trim().slice(0,24),h:b.getBoundingClientRect().height})).filter(b=>b.h<44)}));
   assert.equal(m.short.length,0,JSON.stringify(m.short));assert(m.vw-m.right>=44,JSON.stringify(m));
   if(role==='Admin')await page.screenshot({path:`${out}/${width}-drawer-open.png`,animations:'disabled'});
  },page);
  await context.close();
 }
}
setRole('Admin');
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
 await check(`${width} A6 shell height, last row clears jump button`,async()=>{
  await go(page,'/sales/calllog');const m=await page.evaluate(()=>{const c=document.querySelector('[data-app-content]');c.scrollTop=c.scrollHeight;const rows=document.querySelectorAll('table tbody tr'),r=rows[rows.length-1].getBoundingClientRect(),j=document.querySelector('.cl-jump').getBoundingClientRect();return {shell:document.querySelector('[data-app-shell]').getBoundingClientRect().height,vh:innerHeight,rowBottom:r.bottom,jumpTop:j.top};});
  assert(Math.abs(m.shell-m.vh)<=1&&m.rowBottom<=m.jumpTop+1,JSON.stringify(m));await content(page).evaluate(c=>{c.scrollTop=0;});
 },page);
 await check(`${width} A9 Directory from drawer`,async()=>{
  await go(page,'/sales/home');await menu.click();await page.locator('[data-app-sidebar]').getByTitle('The Directory',{exact:true}).click();
  assert.equal(await menu.getAttribute('aria-expanded'),'false');const panel=page.locator('.sc-toc-panel');await panel.waitFor({state:'visible'});
  await target(page.getByRole('button',{name:'Close directory',exact:true}));
  const m=await panel.evaluate(el=>{const b=el.getBoundingClientRect();const sc=[el,...el.querySelectorAll('*')].find(e=>/auto|scroll/.test(getComputedStyle(e).overflowY)&&e.scrollHeight>e.clientHeight+1);let moved=null;if(sc){sc.scrollTop=sc.scrollHeight;moved=sc.scrollTop>0;sc.scrollTop=0;}return {l:b.left,t:b.top,r:b.right,b:b.bottom,vw:innerWidth,vh:innerHeight,moved,doc:document.documentElement.scrollHeight};});
  assert(m.l>=0&&m.t>=0&&m.r<=m.vw+1&&m.b<=m.vh+1&&m.moved===true&&m.doc<=m.vh+1,JSON.stringify(m));
  // A10: with the Directory open, a tap at the centre of each control in view lands on it.
  const miss=await panel.evaluate(el=>{const p=el.getBoundingClientRect();return [...el.querySelectorAll('button')].map(b=>({b,r:b.getBoundingClientRect()})).filter(x=>x.r.width>0&&x.r.top>=p.top&&x.r.bottom<=Math.min(p.bottom,innerHeight)).map(x=>{const h=document.elementFromPoint(x.r.x+x.r.width/2,x.r.y+x.r.height/2);return h===x.b||x.b.contains(h)?null:x.b.textContent.trim().slice(0,30);}).filter(Boolean);});
  assert.equal(miss.length,0,JSON.stringify(miss));
  await page.getByRole('button',{name:'Close directory',exact:true}).click();assert.equal(await panel.count(),0);
 },page);
 await check(`${width} A10 layers: drawer over badge, jump and embedded headers; modal over drawer`,async()=>{
  await go(page,'/sales/calllog');await menu.click();
  const reach=await page.evaluate(()=>['.sc-page-badge','.cl-jump'].filter(s=>{const e=document.querySelector(s),b=e.getBoundingClientRect(),h=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return h===e||e.contains(h);}));
  assert.equal(reach.length,0,`reachable under open drawer: ${reach}`);
  // At the centre of every drawer row in view, the topmost element belongs to the drawer (nothing in the page covers it).
  const covered=await page.locator('[data-app-sidebar] button').evaluateAll(es=>es.map(e=>({e,r:e.getBoundingClientRect()})).filter(x=>x.r.height>0&&x.r.top>=0&&x.r.bottom<=innerHeight).filter(x=>{const h=document.elementFromPoint(x.r.x+x.r.width/2,x.r.y+x.r.height/2);return !h||!h.closest('[data-app-sidebar]');}).map(x=>x.e.title||x.e.textContent.trim()));
  assert.equal(covered.length,0,`covered drawer rows: ${covered}`);await page.keyboard.press('Escape');
  // The menu button stays keyboard-reachable behind a modal; the wizard must still be on top of the drawer it opens.
  await page.getByRole('button',{name:/new inquiry/i}).first().click();await wizardCheck(page,'layers: wizard open');
  await menu.focus();await page.keyboard.press('Enter');assert.equal(await menu.getAttribute('aria-expanded'),'true');await wizardCheck(page,'layers: wizard over open drawer');
  await page.getByRole('button',{name:'Close inquiry',exact:true}).click();if(await menu.getAttribute('aria-expanded')==='true')await page.keyboard.press('Escape');assert.equal(await menu.getAttribute('aria-expanded'),'false');
 },page);
 if(width<=430){
 await check(`${width} C1 homes: numbers fit, Your Book tile opens Call Log filtered`,async()=>{
  for(const route of ['/','/sales/home']){
   await go(page,route);await noOverflow(page);
   // Any element whose own text is a number or dollar figure: not clipped, and inside the content width.
   const bad=await content(page).evaluate(root=>{const cr=root.getBoundingClientRect(),out=[];for(const e of root.querySelectorAll('*')){const own=[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim();if(!/^\$?[\d,]+(\.\d+)?%?$/.test(own))continue;const b=e.getBoundingClientRect();if(!b.width)continue;if(e.scrollWidth>e.clientWidth+1&&getComputedStyle(e).display!=='inline'||b.left<cr.left-1||b.right>cr.right+1)out.push({own,l:b.left,r:b.right,sw:e.scrollWidth,cw:e.clientWidth});}return out;});
   assert.equal(bad.length,0,`${route}: ${JSON.stringify(bad.slice(0,4))}`);
  }
  await go(page,'/');const kpi=await page.locator('.sc-home-kpis').evaluateAll(ks=>ks.flatMap(k=>{const r=[...k.children].map(c=>c.getBoundingClientRect()),kb=k.getBoundingClientRect(),bad=[];r.forEach((a,i)=>{if(a.left<kb.left-1||a.right>kb.right+1)bad.push(['outside',i]);r.forEach((b,j)=>{if(j>i&&a.left<b.right-1&&b.left<a.right-1&&a.top<b.bottom-1&&b.top<a.bottom-1)bad.push(['overlap',i,j]);});});return bad;}));
  assert.equal(kpi.length,0,JSON.stringify(kpi));assert(/\$1,\d{3},\d{3}/.test(await content(page).innerText()),'seven-digit fixture figure not shown');
  await go(page,'/sales/home');await content(page).getByRole('button',{name:/^Wants Bid/i}).click();
  assert.equal(new URL(page.url()).pathname,'/sales/calllog');await page.locator('table tbody tr').first().waitFor();
  const rows=await page.locator('table tbody tr').allInnerTexts();assert.equal(rows.length,2,JSON.stringify(rows));assert(rows.every(r=>/Wants Bid/i.test(r)&&/Alex Morgan/.test(r)),JSON.stringify(rows));
  const rep=await content(page).locator('select').evaluateAll(es=>es.map(e=>e.selectedOptions[0]?.textContent.trim()));assert(rep.includes('Alex Morgan'),`rep filter not applied: ${JSON.stringify(rep)}`);
 },page);
 await check(`${width} C3 Call Log detail`,async()=>{
  await go(page,'/');await go(page,'/sales/calllog');await page.locator('table tbody tr').getByText(/10420/).first().click();
  assert.equal(new URL(page.url()).pathname,'/sales/calllog/900');await page.locator('.sc-cld-head').waitFor();await page.waitForLoadState('networkidle');await noOverflow(page);
  assert.deepEqual(await detailActions(page),desktopHeaders.detailActions);
  for(const b of await page.locator('.sc-cld-nav button, .sc-cld-head button').all())await inView(b);
  const cols=await page.locator('.sc-cld-grid').evaluateAll(gs=>gs.filter(g=>g.getBoundingClientRect().width>0).map(g=>getComputedStyle(g).gridTemplateColumns.split(' ').length));assert(cols.length>0&&cols.every(c=>c===1),JSON.stringify(cols));
  const links=await page.locator('.sc-cld-linkrow').evaluateAll(rs=>rs.map(r=>r.innerText.replace(/\s+/g,' ')));assert(links.length>=2&&links.every(t=>/\$[\d,]+/.test(t)&&/(SENT|SOLD|NEW|PAID|PAST DUE|DRAFT|SIGNED|LOST)/i.test(t)),JSON.stringify(links));
  await insideX(page,'.sc-cld-linkrow, .sc-cld-linkrow > *');
  const stats=await page.locator('.sc-cld-stats > div').evaluateAll(ds=>ds.map(d=>({t:d.innerText.replace(/\s+/g,' '),clip:[d,...d.querySelectorAll('*')].some(e=>e.scrollWidth>e.clientWidth+1),l:d.getBoundingClientRect().left,r:d.getBoundingClientRect().right,w:innerWidth})));
  assert(stats.length===3&&stats.every(x=>!x.clip&&x.l>=-1&&x.r<=x.w+1),JSON.stringify(stats));assert(/BILLED \$[\d,]+/i.test(stats[0].t)&&/\$1,\d{3},\d{3}/.test(stats[1].t)&&/\d+%/.test(stats[2].t),JSON.stringify(stats));
  await content(page).evaluate(c=>{c.scrollTop=0;});await page.locator('.sc-cld-actions').getByRole('button',{name:'Edit',exact:true}).click();
  await inView(page.locator('.sc-cld-actions').getByRole('button',{name:'Save Changes',exact:true}));await inView(page.locator('.sc-cld-actions').getByRole('button',{name:'Cancel',exact:true}));await controlSizes(page,'[data-app-content]','C5 detail edit mode');
  await page.locator('.sc-cld-actions').getByRole('button',{name:'Cancel',exact:true}).click();
  await page.getByRole('button',{name:/← Call Log/i}).click();assert.equal(new URL(page.url()).pathname,'/sales/calllog');
 },page);
 await check(`${width} C5 P1 control sizes`,async()=>{for(const route of p1){await go(page,route);await controlSizes(page,'[data-app-content]',route);}},page);
 }
 await check(`${width} D2-D5 list actions in view and row open`,async()=>{
  await go(page,'/sales/proposals');await inView(content(page).getByRole('button',{name:'+ New Proposal',exact:true}));
  const open=page.locator('table tbody tr').first().getByRole('button',{name:'Open',exact:true});await open.scrollIntoViewIfNeeded();await open.click();assert(/^\/sales\/proposals\/proposal-\d$/.test(new URL(page.url()).pathname),page.url());await page.waitForLoadState('networkidle');assert(!/Something went wrong/.test(await content(page).innerText()));
  await go(page,'/sales/invoices');for(const name of ['Retention','+ New Invoice'])await inView(content(page).getByRole('button',{name,exact:true}));
  await page.locator('table tbody tr td').first().click();assert(/^\/sales\/invoices\/\d+$/.test(new URL(page.url()).pathname),page.url());await page.waitForLoadState('networkidle');assert(!/Something went wrong/.test(await content(page).innerText()));
  await go(page,'/sales/customers');await inView(content(page).getByRole('button',{name:'+ Add Customer',exact:true}));
  await page.locator('table tbody tr td').first().click();assert.equal(new URL(page.url()).pathname,'/sales/customers/customer-0');await page.waitForLoadState('networkidle');
  for(const name of [/Back/,/^Merge$/,/^Delete$/,/^Edit$/])await inView(content(page).getByRole('button',{name}).first());
  await content(page).getByRole('button',{name:/Back/}).first().click();assert.equal(new URL(page.url()).pathname,'/sales/customers');
 },page);
 await check(`${width} Directory geometry`,async()=>{await go(page,'/sales/home');await page.locator('.sc-page-badge').click();await target(page.getByRole('button',{name:'Close directory',exact:true}));await page.getByRole('button',{name:'Close directory',exact:true}).click();},page);
 }
 await check(`${width} standard inquiry ten steps`,()=>walkWizard(page,width),page);
 // Recover only by loading the same fixture origin after a failed interaction.
 if(await page.getByRole('button',{name:'Close inquiry',exact:true}).count())await page.getByRole('button',{name:'Close inquiry',exact:true}).click();
 await check(`${width} change order wizard`,()=>walkWizard(page,width,true),page);
 if(await page.getByRole('button',{name:'Close inquiry',exact:true}).count())await page.getByRole('button',{name:'Close inquiry',exact:true}).click();
 if(!process.env.QA_SKIP_SMOKE&&[390,768].includes(width))for(const route of smoke)await check(`${width} smoke ${route}`,async()=>{await go(page,route);assert(!/Something went wrong/.test(await page.locator('[data-app-content]').innerText()));await menu.click();await page.locator('[data-app-sidebar]').getByTitle('Home',{exact:true}).first().click();assert.equal(new URL(page.url()).pathname,'/');assert.equal(await menu.getAttribute('aria-expanded'),'false');},page);
 if(width<=430)await check(`${width} A8 /crew has no sideways scroll`,async()=>{await go(page,'/crew');assert.equal(new URL(page.url()).pathname,'/crew');const m=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,vw:innerWidth,text:document.body.innerText.slice(0,40)}));assert(m.doc<=m.vw&&/crew/i.test(m.text),JSON.stringify(m));},page);
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
// B1: desktop screenshots against the base commit. The three directories come from scripts/capture-mobile-preview-desktop.mjs,
// each captured in its own process: screenshots taken inside this long run pick up raster noise from the earlier phone-width work.
{
 const baseDir=process.env.QA_DESKTOP_BASE,repeatDir=process.env.QA_DESKTOP_BASE_REPEAT,shots=process.env.QA_DESKTOP_AFTER,accept=process.env.QA_B1_ACCEPT_MAX_CHANNEL;
 if(!baseDir||!repeatDir||!shots){report.checks.push({name:'B1 desktop pixels vs base',pass:null,skipped:'QA_DESKTOP_BASE / QA_DESKTOP_BASE_REPEAT / QA_DESKTOP_AFTER not set'});console.log('B1 desktop pixels vs base: SKIPPED (no capture directories)');}
 else {
  const files=(await fs.readdir(baseDir)).filter(f=>f.endsWith('.png')).sort();assert(files.length>0,'no base screenshots');
  // Pixel comparison in a blank page (no dependency): decode both PNGs and count differing pixels.
  const blank=await (await browser.newContext()).newPage();
  const diff=async(a,b)=>blank.evaluate(async([x,y])=>{const load=async s=>{const im=await createImageBitmap(await (await fetch('data:image/png;base64,'+s)).blob());const c=new OffscreenCanvas(im.width,im.height),g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0);return g.getImageData(0,0,im.width,im.height);};const [p,q]=[await load(x),await load(y)];if(p.width!==q.width||p.height!==q.height)return {size_mismatch:[p.width,p.height,q.width,q.height]};let changed=0,max=0;for(let i=0;i<p.data.length;i+=4){let d=0;for(let k=0;k<4;k++)d=Math.max(d,Math.abs(p.data[i+k]-q.data[i+k]));if(d){changed++;if(d>max)max=d;}}return {changed_pixels:changed,max_channel_diff:max};},[(await fs.readFile(a)).toString('base64'),(await fs.readFile(b)).toString('base64')]);
  const rows=[];
  for(const f of files){const floor=await diff(`${baseDir}/${f}`,`${repeatDir}/${f}`),after=await diff(`${baseDir}/${f}`,`${shots}/${f}`);const again=process.env.QA_DESKTOP_AFTER_REPEAT?await diff(`${shots}/${f}`,`${process.env.QA_DESKTOP_AFTER_REPEAT}/${f}`):undefined;rows.push({file:f,after,base_repeat:floor,...(again?{after_vs_after_repeat:again}:{}),within_floor:!after.size_mismatch&&after.changed_pixels<=(floor.changed_pixels??-1)});}
  await blank.context().close();
  const over=rows.filter(r=>!r.within_floor),literal=over.length===0;
  const waived=!literal&&accept!==undefined&&over.every(r=>!r.after.size_mismatch&&r.after.max_channel_diff<=Number(accept));
  report.b1={base:baseDir,base_repeat:repeatDir,after:shots,exact:rows.filter(r=>r.after.changed_pixels===0).length,total:rows.length,literal_pass:literal,waived,accept_max_channel:accept??null,rows};
  report.checks.push({name:'B1 desktop pixels vs base (literal: no more than base differs from itself)',pass:literal,...(literal?{}:{error:over.map(r=>`${r.file}: ${JSON.stringify(r.after)} vs floor ${JSON.stringify(r.base_repeat)}`).join('; '),waived})});
  console.log('B1 desktop pixels vs base: '+(literal?'PASS':(waived?'LITERAL FAIL (waived: every difference within '+accept+' channel level) ':'FAIL ')+report.checks.at(-1).error));
 }
}
await browser.close();
const failures=report.checks.filter(c=>c.pass===false&&!c.waived),waived=report.checks.filter(c=>c.waived),skipped=report.checks.filter(c=>c.pass===null);
report.summary={checks:report.checks.length,passed:report.checks.filter(c=>c.pass===true).length,failed:failures.length,literal_failures_waived:waived.length,skipped:skipped.length,page_errors:report.errors.length,writes:writes.length,blocked:blocked.length};
await fs.writeFile(out+'/results.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({...report.summary,failures,waived,skipped,errors:report.errors,writes,blocked},null,2));
// H4: a refused request fails the run, not only a write.
if(failures.length||report.errors.length||writes.length||blocked.length)process.exitCode=1;
