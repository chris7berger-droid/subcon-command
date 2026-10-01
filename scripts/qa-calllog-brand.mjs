import { waitForHomePhoto } from './qa-calllog-brand-checks.mjs';
import process from 'node:process';
// Synthetic-only UI regression. See SC_CallLog_Brand_Revision_Build.md for invocation.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run=promisify(execFile);
let assetCount=0;
const output = process.env.QA_OUTPUT_DIR || '/tmp/subcon-calllog-brand-qa';
await fs.mkdir(output, { recursive: true });
const day = new Date().toLocaleDateString('en-CA');
const old = '2026-07-01';
const member = { id:'11111111-1111-4111-8111-111111111111', auth_id:'22222222-2222-4222-8222-222222222222', name:'Alex Morgan', role:'Admin', email:'alex@example.test', onboarded:true, apps:['sales','schedule','field','ar'] };
const customers = ['Northline Builders','Summit Construction','Cedar Commercial','Westward Projects','Stonebridge Group','Harbor Works'].map((name,i)=>({id:`customer-${i}`,name, phone:null}));
const stages=['Wants Bid','Wants Bid','Has Bid','Has Bid','Sold','New Inquiry'];
const rows=customers.map((c,i)=>({id:900+i,job_number:10420+i, display_job_number:String(10420+i), job_name:['Commerce Center','Warehouse Floor','Retail Surface Prep','Office Fitout','Service Yard','Entry Restoration'][i], customer_id:c.id,customer_name:c.name,customers:c,sales_name:member.name, stage:stages[i],created_at:i===4?day:old,updated_at:old,bid_due:i===0?day:i===1?old:null,follow_up:i===2?day:null,archived:false,jobsite_address:'100 Example Avenue',job_work_types:[{work_type_id:1}]}));
rows.push({...rows[5],id:906,job_number:10426,display_job_number:'10426',stage:'Lost',archived:true});
if(process.env.QA_ARCHIVE_CANDIDATE==='1')rows.push({...rows[6],id:907,job_number:10427,display_job_number:'10427',archived:false,created_at:'2020-01-01'});
const proposals=rows.slice(0,5).map((r,i)=>({id:`proposal-${i}`,call_log_id:r.id,customer_id:r.customer_id,status:i===4?'Sold':'Sent',created_at:i===4?day:old,approved_at:i===4?day:null,total:0,proposal_wtc:[{regular_hours:10,burden_rate:75,markup_pct:30,materials:[],travel:[],discount:0,size:1}],proposal_recipients:[{sent_at:old,viewed_at:old}]}));
const wtc={id:'wtc-0',proposal_id:'proposal-0',work_type_id:1,work_types:{name:'Surface preparation'},regular_hours:10,ot_hours:0,burden_rate:75,ot_burden_rate:112.5,markup_pct:30,size:1000,unit:'SQFT',materials:[],travel:{},discount:0,field_sow:[],sub_areas:[],sales_sow:'Prepare the existing concrete surface.',created_at:old};
proposals.forEach((p,i)=>Object.assign(p,{proposal_number:20000+i,call_log:rows[i],job_name:rows[i].job_name,customer_name:rows[i].customer_name,mobilizations:[],intro:'Synthetic proposal for visual review only.'}));
if(process.env.QA_EMPTY==='1'){rows.length=0;proposals.length=0;}
const browser=await chromium.launch({executablePath:process.env.QA_BROWSER_PATH || undefined,headless:true});
const context=await browser.newContext({ viewport:{width:1440,height:1000},deviceScaleFactor:1 });
const errors=[],writes=[];
const base=process.env.QA_URL || 'http://127.0.0.1:5187';
const storageKey='sb-'+new URL(process.env.VITE_SUPABASE_URL || 'https://calllog-fixture.supabase.co').hostname.split('.')[0]+'-auth-token';
await context.addInitScript(({member,storageKey})=>{
 const session={access_token:'fixture.jwt.only',refresh_token:'fixture-only',token_type:'bearer',expires_at:Math.floor(Date.now()/1000)+7200,user:{id:member.auth_id,email:member.email}};
 localStorage.setItem(storageKey,JSON.stringify(session));
}, {member,storageKey});
await context.route('**/*',async route=>{
 const req=route.request(),u=new URL(req.url());
 if(u.hostname.endsWith('.supabase.co')){
  if(u.pathname.startsWith('/storage/v1/object/list/'))return route.fulfill({json:[]});
  if(req.method()!=='GET' && req.method()!=='HEAD' && req.method()!=='OPTIONS'){writes.push(req.method()+' '+u.pathname);return route.fulfill({status:403,json:{message:'QA blocks writes'}});}
  if(u.pathname.endsWith('/auth/v1/user'))return route.fulfill({json:{id:member.auth_id,email:member.email}});
  const table=u.pathname.split('/').pop();
  let data=({team_members:[member],call_log:rows,customers,proposals,proposal_wtc:[wtc],work_types:[{id:1,name:'Surface preparation',tenant_id:'fixture-tenant',active:true}],tenant_config:[{id:'fixture-tenant',company_name:'Example Contractor',apps:member.apps,archive_stages:process.env.QA_ARCHIVE_CANDIDATE==='1'?['Lost']:[],monthly_billing_goal:100000}],outreach_log:[]})[table]||[];
  if(table==='call_log' && u.searchParams.get('select')==='id' && u.searchParams.has('archived') && u.searchParams.has('created_at'))data=rows.filter(r=>r.id===907);
  if(['call_log','proposals','proposal_wtc'].includes(table)){
   for(const key of ['id','call_log_id','proposal_id','parent_job_id']){
    const filter=u.searchParams.get(key);
    if(filter?.startsWith('eq.'))data=data.filter(r=>String(r[key])===filter.slice(3));
    if(filter?.startsWith('in.('))data=data.filter(r=>filter.slice(4,-1).split(',').includes(String(r[key])));
   }
  }
  if(req.headers().accept?.includes('vnd.pgrst.object'))data=data[0]||null;
  return route.fulfill({json:data,headers:{'content-range':`0-${Math.max(0,(Array.isArray(data)?data.length:1)-1)}/${Array.isArray(data)?data.length:1}`}});
 }
 if(u.hostname===new URL(base).hostname && process.env.QA_VERCEL_CURL==='1'){
  const file=output+'/deployed-asset-'+(++assetCount);
  const result=await run(process.env.VERCEL_CLI || 'vercel',['curl',u.pathname+u.search,'--deployment',base,'--','-sS','-o',file,'-w','%{http_code}'],{cwd:process.env.QA_VERCEL_PROJECT_DIR || process.cwd(),maxBuffer:1024*1024});
  const status=Number(result.stdout.trim().slice(-3));
  if(status!==200)throw new Error('Authenticated deployed asset status '+status+' '+u.pathname);
  const type=u.pathname.endsWith('.js')?'application/javascript':u.pathname.endsWith('.css')?'text/css':u.pathname.endsWith('.png')?'image/png':u.pathname.endsWith('.webp')?'image/webp':u.pathname.endsWith('.jpg')?'image/jpeg':u.pathname.endsWith('.svg')?'image/svg+xml':'text/html';
  return route.fulfill({status,body:await fs.readFile(file),contentType:type});
 }
 if(u.hostname===new URL(base).hostname && process.env.VERCEL_OIDC_TOKEN)return route.continue({headers:{...req.headers(),'x-vercel-trusted-oidc-idp-token':process.env.VERCEL_OIDC_TOKEN}});
 if(u.hostname==='127.0.0.1'||u.hostname===new URL(base).hostname||u.hostname==='fonts.googleapis.com'||u.hostname==='fonts.gstatic.com')return route.continue();
 return route.abort();
});
const page=await context.newPage();
page.on('pageerror',e=>errors.push(e.message));
await page.goto(base+'/sales/calllog');
try { await page.getByRole('heading',{name:'Call Log',exact:true}).waitFor({timeout:15000}); } catch(e) { await page.screenshot({path:output+'/deployment-blocker.png'});console.log(JSON.stringify({url:page.url(),title:await page.title(),text:(await page.locator('body').innerText()).slice(0,1500),oidcAvailable:!!process.env.VERCEL_OIDC_TOKEN,errors}));await browser.close();throw e; }
await page.getByText('Where To Hunt',{exact:true}).waitFor();
await page.waitForLoadState('networkidle');
await page.evaluate(()=>document.fonts.ready);
console.log('PHOTO_DECODE',await waitForHomePhoto(page));
await page.screenshot({animations:'disabled',path:output+'/'+(process.env.QA_LABEL||'baseline')+'.png',fullPage:true});
console.log(JSON.stringify({title:await page.title(),headings:await page.locator('h2').allTextContents(),errors,writes}));
if(process.env.QA_INTERACTIVE==='1'){
 const { runChecks }=await import('./qa-calllog-brand-checks.mjs');
 await runChecks(page,context,output,base);
}
console.log(JSON.stringify({finalErrors:errors,blockedWrites:writes}));
if(process.env.QA_EXPECT_ARCHIVE){const expected=process.env.QA_EXPECT_ARCHIVE==='write';const hasArchive=writes.some(w=>w==='PATCH /rest/v1/call_log');if(hasArchive!==expected)throw new Error('Archive guard mismatch: expected '+process.env.QA_EXPECT_ARCHIVE+'; attempted '+hasArchive);console.log('ARCHIVE_GUARD_PASS '+process.env.QA_EXPECT_ARCHIVE);}
if(errors.length)throw new Error(JSON.stringify(errors));
if(writes.length)throw new Error('Unexpected blocked write attempts: '+JSON.stringify(writes));
await browser.close();
