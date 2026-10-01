import process from 'node:process';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
export async function runChecks(page,context,output,base){
 page.setDefaultTimeout(12000);
 const checks=[];
 const pass=s=>{checks.push(s);console.log(s);};
 const count=async n=>{await page.waitForFunction(n=>document.querySelectorAll('tbody tr').length===n,n);};
 const clear=async()=>{const b=page.getByRole('button',{name:'Clear',exact:true});if(await b.count())await b.click();};
 await page.getByTitle('View Has Bid jobs',{exact:true}).click();
 await count(2); assert.match(await page.locator('.cl-jobs').innerText(),/Showing: Has Bid \(2\)/);pass('Pipeline drill-down matches its two rows');
 await clear();await count(6);
 await page.getByRole('textbox',{name:'Search jobs',exact:true}).fill('Northline');await count(1);
 await clear();await count(6);
 await page.getByRole('textbox',{name:'Search jobs',exact:true}).fill('does-not-exist');await count(0);pass('Search and zero results');
 await page.screenshot({animations:'disabled',path:output+'/empty-search.png'});
 await clear();
 await page.getByRole('button',{name:/^Old Jobs/}).click();await count(1);pass('Old Jobs');
 await page.getByRole('button',{name:/^Active Jobs/}).click();await count(6);
 await page.locator('.cl-jobs').getByRole('button',{name:/^Has Bid/}).click();await count(2);
 await clear();await count(6);pass('Stage filtering and combined Clear');
 await page.locator('.cl-jobs select').first().selectOption('Alex Morgan');await count(6);
 await page.locator('.cl-jobs input[type=date]').first().fill('2026-08-01');await count(1);
 await clear();await count(6);pass('Sales Rep and date filter');
 const before=await page.locator('tbody tr td:first-child').allTextContents();
 await page.getByRole('columnheader',{name:/Job #/}).click();
 await page.getByRole('columnheader',{name:/Job #/}).click();
 const after=await page.locator('tbody tr td:first-child').allTextContents();assert.notDeepEqual(before,after);pass('Repeated table sort');
 await page.locator('.cl-jobs').screenshot({animations:'disabled',path:output+'/jobs-desktop.png'});
 await page.getByRole('button',{name:'Command Center',exact:true}).first().click();
 await page.getByRole('button',{name:'Whole company',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Whole company',exact:true}).getAttribute('aria-pressed'),'true');
 await page.getByRole('button',{name:'Just me',exact:true}).click();pass('Manager scope toggles');
 await page.getByRole('button',{name:/See all/}).click();await page.getByRole('button',{name:/Hide list/}).click();pass('Priority list expand/collapse');
 await page.getByTitle('Serve the next angle').click();await page.getByTitle('Step back').click();
 await page.getByTitle('Pin to return to this one').click();await page.getByTitle('Serve the next angle').click();await page.getByRole('button',{name:'★ back to pinned',exact:true}).click();await page.getByTitle('Unpin',{exact:true}).click();pass('Hunt refresh, back, pin and return');
 for(let i=0;i<2;i++){
  await page.getByRole('button',{name:'Log',exact:true}).first().click();
  await page.getByText('Log Outcome',{exact:true}).waitFor();
  if(i===0){await page.getByRole('button',{name:'Save',exact:true}).click();await page.getByText('Pick an outcome.',{exact:true}).waitFor();await page.screenshot({animations:'disabled',path:output+'/outcome-validation.png'});}
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
 }
 pass('Log Outcome opens repeatedly, validation and Cancel write nothing');
 for(let i=0;i<2;i++){
  await page.getByRole('button',{name:'+ New Inquiry',exact:true}).click();
  await page.getByRole('button',{name:/Commercial Business name/}).click();
  await page.getByText('Select or Add Customer',{exact:true}).waitFor();
  await page.screenshot({animations:'disabled',path:output+'/new-inquiry.png'});
  await page.getByRole('button',{name:'✕',exact:true}).click();
 }
 pass('New Inquiry repeated open/advance/close');
 await page.getByRole('button',{name:'+ New Inquiry',exact:true}).focus();
 await page.keyboard.press('Tab');
 assert.match(await page.evaluate(()=>getComputedStyle(document.activeElement).outlineColor),/18, 216, 242/);pass('Keyboard cyan focus');
 await page.getByRole('button',{name:/^View$/}).first().click();await page.waitForURL('**/sales/calllog/*');await page.waitForTimeout(100);
 await page.goBack();await page.locator('.sc-calllog').waitFor();pass('Job detail navigation and browser Back');
 await page.getByTitle('Proposals',{exact:true}).click();await page.waitForURL('**/sales/proposals');await page.waitForTimeout(100);await page.screenshot({animations:'disabled',path:output+'/proposals-unaffected.png'});
 await page.getByTitle('Customers',{exact:true}).click();
 await page.waitForURL('**/sales/customers');
 await page.locator('.sc-calllog').waitFor({state:'detached'});
 pass('Customers remains outside scoped theme');
 await page.getByTitle('Call Log',{exact:true}).click();await page.getByText('Where To Hunt',{exact:true}).waitFor();pass('Sidebar navigation away and back');
 await checkInteriors(page,output,base,pass);
 for(const width of [1440,1024,768,390]){
  await page.setViewportSize({width,height:1000});
  // The app's existing Collapse control remains the phone navigation affordance;
  // a separate responsive task owns changes to that shared navigation behavior.
  if(width===390){await page.getByRole('button',{name:/Collapse/}).click();await page.waitForFunction(()=>parseFloat(getComputedStyle(document.querySelector('[data-app-sidebar]')).width)<57);}
  await page.locator('[data-app-content]').evaluate(el=>el.scrollTop=0);
  await page.waitForLoadState('networkidle');
  await waitForHomePhoto(page);
  await page.screenshot({animations:'disabled',path:output+`/calllog-${width}.png`});
  const dims=await page.locator('[data-app-content]').evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth}));
  assert.ok(dims.scroll<=dims.client+1,`${width}px page overflow ${JSON.stringify(dims)}`);
 }
 pass('1440/1024/768 desktop and tablet, 390 with existing collapsed sidebar; no content overflow');
 await fs.writeFile(output+'/checks.json',JSON.stringify(checks,null,2));console.log(JSON.stringify(checks));
}

async function checkInteriors(page,output,base,pass){
 await page.goto(base+'/sales/calllog/900');
 await page.getByRole('button',{name:'Edit',exact:true}).first().waitFor();
 await page.screenshot({path:output+'/job-detail.png',fullPage:true});
 for(let i=0;i<2;i++){
  await page.getByRole('button',{name:'Edit',exact:true}).first().click();
  await page.getByRole('button',{name:'Cancel',exact:true}).last().click();
 }
 pass('Job detail edit/cancel repeated without save');
 for(let i=0;i<2;i++){
  await page.getByRole('button',{name:'+ New Proposal',exact:true}).click();
  await page.getByRole('heading',{name:'New Proposal',exact:true}).waitFor();
  await page.screenshot({path:output+'/new-proposal.png',fullPage:true});
  assert.equal(await page.locator('.sc-calllog-interior').count(),1);
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.goto(base+'/sales/calllog/900');
  await page.getByRole('button',{name:'Edit',exact:true}).first().waitFor();
 }
 pass('Job to New Proposal dialog: branded, repeated open/cancel without creation');
 await page.goto(base+'/sales/proposals/proposal-0');
 await page.getByRole('button',{name:'Edit WTC',exact:true}).first().waitFor();
 await page.screenshot({path:output+'/proposal-detail.png',fullPage:true});
 assert.match(await page.locator('[data-app-content]').innerText(),/\$975/);
 pass('Existing proposal fixture total remains $975');
 await page.getByRole('button',{name:'Edit WTC',exact:true}).first().click();
 await page.getByText(/Work Type Calculator/).first().waitFor();
 await page.screenshot({path:output+'/wtc-bidding.png',fullPage:true});
 for(const tab of ['Labor','Materials','Scope of Work','Travel','Discount','Summary']){
  await page.getByRole('button',{name:new RegExp('· '+tab+'$')}).click();
  await page.screenshot({path:output+'/wtc-'+tab.toLowerCase().replaceAll(' ','-')+'.png',fullPage:true});
 }
 await page.getByRole('button',{name:/· Bidding Info$/}).click();
 pass('All seven WTC tabs open and return to Bidding without saving');
 await page.getByRole('button',{name:/Close/}).last().click();
 await page.getByRole('button',{name:'Edit WTC',exact:true}).first().waitFor();
 pass('Proposal detail, existing WTC editor and Close');
 for(let i=0;i<2;i++){
  await page.getByRole('button',{name:'Generate PDF',exact:true}).click();
  await page.locator('[data-pdf-modal-inner]').waitFor();
  await page.screenshot({path:output+'/proposal-preview.png',fullPage:true});
  await page.getByRole('button',{name:'×',exact:true}).click();
  await page.getByRole('button',{name:'Edit WTC',exact:true}).first().waitFor();
 }
 pass('Proposal document preview chrome: repeated open/close, no send or print');
 for(const width of [1024,390]){
  await page.setViewportSize({width,height:1000});
  if(width===390){await page.getByRole('button',{name:/Collapse/}).click();await page.waitForFunction(()=>parseFloat(getComputedStyle(document.querySelector('[data-app-sidebar]')).width)<57);}
  for(const [route,label] of [['/sales/calllog/900','job'],['/sales/proposals/proposal-0','proposal']]){
   await page.goto(base+route);
   if(width===390){await page.getByRole('button',{name:/Collapse/}).click();await page.waitForFunction(()=>parseFloat(getComputedStyle(document.querySelector('[data-app-sidebar]')).width)<57);}
   await page.getByRole('button',{name:label==='job'?'Edit':'Edit WTC',exact:true}).first().waitFor();
   await page.screenshot({path:output+'/'+label+'-'+width+'.png',fullPage:true});
   const dims=await page.locator('[data-app-content]').evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth}));
   console.log('INTERIOR_DIMENSIONS',label,width,dims);
   assert.ok(dims.scroll<=dims.client+1,`${label} ${width}px overflow ${JSON.stringify(dims)}`);
   if(label==='proposal'){
    await page.getByRole('button',{name:'Edit WTC',exact:true}).first().click();
    await page.getByText(/Work Type Calculator/).first().waitFor();
    await page.screenshot({path:output+'/wtc-'+width+'.png',fullPage:true});
    const d=await page.locator('[data-app-content]').evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth}));
    console.log('INTERIOR_DIMENSIONS','wtc',width,d);
    assert.ok(d.scroll<=d.client+1,`wtc ${width}px overflow ${JSON.stringify(d)}`);
    if(width===390){
     for(const tab of ['Labor','Materials','Scope of Work','Travel','Discount','Summary']){
      await page.getByRole('button',{name:new RegExp('· '+tab+'$')}).click();
      await page.screenshot({path:output+'/wtc-phone-'+tab.toLowerCase().replaceAll(' ','-')+'.png',fullPage:true});
      const dim=await page.locator('[data-app-content]').evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth}));
      assert.ok(dim.scroll<=dim.client+1,`${tab} phone overflow ${JSON.stringify(dim)}`);
     }
    }

   }
  }
 }
 await page.setViewportSize({width:1440,height:1000});
 await page.getByRole('button',{name:'▶',exact:true}).click();
 pass('Job/proposal/WTC tablet and phone: no content overflow');
 await page.goto(base+'/sales/calllog');
 await page.getByText('Where To Hunt',{exact:true}).waitFor();
}

// CSS backgrounds may still be decoding after the app data and even networkidle.
// Require the approved photo to decode before any home visual assertion/capture.
export async function waitForHomePhoto(page){
 return page.evaluate(async()=>{
  const bg=getComputedStyle(document.querySelector('[data-app-shell]')).backgroundImage;
  const match=bg.match(/url\("([^"]+)"\)/);
  if(!match)throw new Error('Home background photo URL is missing');
  const img=new Image();img.src=match[1];await img.decode();
  if(img.naturalWidth!==1672||img.naturalHeight!==941)throw new Error('Unexpected home photo dimensions');
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  return {width:img.naturalWidth,height:img.naturalHeight};
 });
}
