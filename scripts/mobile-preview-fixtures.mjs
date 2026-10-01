// Synthetic-only mobile preview QA. Every Supabase HTTP request is answered locally; WebSockets never connect.

export const BASE = process.env.QA_URL || 'http://127.0.0.1:5193';
const today = '2026-10-01';
const old = '2026-07-01';
const member = { id: '11111111-1111-4111-8111-111111111111', auth_id: '22222222-2222-4222-8222-222222222222', name: 'Alex Morgan', role: process.env.QA_ROLE || 'Admin', email: 'alex@example.test', onboarded: true, apps: process.env.QA_ROLE === 'Sales' ? ['sales'] : ['sales', 'schedule', 'field', 'ar'], active: true };
const custNames = ['Northline Builders', 'Summit Construction', 'Cedar Commercial', 'Westward Projects', 'Stonebridge Group', 'Harbor Works'];
const customers = custNames.map((name, i) => ({ id: `customer-${i}`, name, customer_type: 'Commercial', phone: '555-0100', email: `office${i}@example.test`, contact_phone: '555-0100', contact_email: `office${i}@example.test`, first_name: 'Pat', last_name: 'Rivera', business_address: '100 Example Avenue', business_city: 'Sample City', business_state: 'CA', business_zip: '90000', billing_terms: 30, billing_same: true, requires_pay_app: false }));
const stages = ['Wants Bid', 'Wants Bid', 'Has Bid', 'Has Bid', 'Sold', 'New Inquiry'];
const jobNames = ['Commerce Center Long Operational Job Name', 'Warehouse Floor', 'Retail Surface Prep', 'Office Fitout', 'Service Yard', 'Entry Restoration'];
const rows = customers.map((c, i) => ({ id: 900 + i, job_number: 10420 + i, display_job_number: `${10420 + i} - ${jobNames[i]}`, job_name: jobNames[i], customer_id: c.id, customer_name: c.name, customer_type: 'Commercial', customers: c, sales_name: member.name, stage: stages[i], created_at: i === 4 ? today : old, updated_at: old, bid_due: i === 0 ? today : i === 1 ? old : null, follow_up: i === 2 ? today : null, archived: false, jobsite_address: i === 3 ? null : '100 Example Avenue', jobsite_city: 'Sample City', jobsite_state: 'CA', jobsite_zip: '90000', notes: 'Synthetic fixture note.', is_change_order: i === 5, parent_job_id: i === 5 ? 900 : null, job_work_types: [{ work_type_id: 1 }] }));
const proposals = rows.slice(0, 5).map((r, i) => ({ id: `proposal-${i}`, proposal_number: 1, call_log_id: r.id, customer_id: r.customer_id, customer: r.customer_name, status: i === 4 ? 'Sold' : 'Sent', created_at: i === 4 ? today : old, approved_at: i === 4 ? today : null, sent_at: old, total: i === 4 ? 1248500 : 48500, deleted_at: null, call_log: { display_job_number: r.display_job_number, job_name: r.job_name, customer_name: r.customer_name, sales_name: r.sales_name, id: r.id, job_number: r.job_number }, proposal_wtc: [{ id: `wtc-${i}`, regular_hours: i === 0 ? 15000 : 10, ot_hours: 0, burden_rate: 75, ot_burden_rate: 110, markup_pct: 30, materials: [], travel: [], discount: 0, size: 1, work_types: { name: 'Surface preparation' } }], proposal_recipients: [{ sent_at: old, viewed_at: old }] }));
const invoices = rows.slice(0, 4).map((r, i) => ({ id: String(20010 + i), job_id: r.id, call_log_id: r.id, job_name: r.display_job_number, status: ['New', 'Sent', 'Paid', 'Past Due'][i], amount: 12500 + i * 1000, discount: 0, sent_at: old, due_date: today, proposal_id: `proposal-${i}`, created_at: old, deleted_at: null, voided_at: null, retention_amount: 0, invoice_lines: [], call_log: { display_job_number: r.display_job_number, customer_name: r.customer_name, sales_name: r.sales_name, job_name: r.job_name }, proposals: { call_log_id: r.id, customer: r.customer_name } }));
const tenant = { id: 'fixture-tenant', company_name: 'Example Contractor', apps: member.apps, archive_stages: [], archive_after_months: 12, monthly_billing_goal: 100000, leads_enabled: true };
export function setRole(role) { member.role = role; member.apps = role === 'Sales' ? ['sales'] : ['sales','schedule','field','ar']; }
const FIX = { team_members: [member], call_log: rows, customers, proposals, invoices, work_types: [{ id: 1, name: 'Surface preparation', cost_code: 'SP-01', tenant_id: 'fixture-tenant', active: true }, { id: 2, name: 'Polished concrete', cost_code: 'PC-02', tenant_id: 'fixture-tenant', active: true }], tenant_config: [tenant], outreach_log: [], leads: [{ id: 'lead-1', name: 'Taylor Example', phone: '555-0123', email: 'taylor@example.test', status: 'new', channel: 'google', campaign: 'Synthetic campaign', message: 'Fixture inquiry', received_at: today }], customer_contacts: [] };

export const writes = [], blocked = [], sockets = [], unknownTables = new Set();
let CUR = '(boot)';
export function setCurrent(value) { CUR = value; }

function fulfillRest(route, req, u) {
  const method = req.method();
  const table = decodeURIComponent(u.pathname.split('/').pop());
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    writes.push(`${CUR} :: ${method} ${u.pathname}`);
    return route.fulfill({ status: 403, json: { message: 'T1 probe blocks writes' } });
  }
  if (!(table in FIX)) unknownTables.add(table);
  let data = FIX[table] || [];
  const sp = u.searchParams;
  // Honor the CallLog on-load auto-archive selection so the probe never provokes its write.
  if (table === 'call_log' && sp.get('archived') === 'eq.false' && sp.has('stage') && sp.has('created_at')) data = [];
  for (const [k, v] of sp) {
    if (['select', 'order', 'limit', 'offset'].includes(k)) continue;
    if (v.startsWith('eq.')) { const want = v.slice(3); if (data.some(r => k in r)) data = data.filter(r => String(r[k]) === want); }
  }
  const wantsObject = (req.headers()['accept'] || '').includes('vnd.pgrst.object');
  const n = data.length;
  const headers = { 'content-range': n ? `0-${n - 1}/${n}` : '*/0', 'access-control-expose-headers': 'content-range' };
  if (method === 'HEAD') return route.fulfill({ status: 200, headers, body: '' });
  if (wantsObject) {
    if (!n) return route.fulfill({ status: 406, headers, json: { code: 'PGRST116', message: 'no rows', details: 'The result contains 0 rows' } });
    return route.fulfill({ json: data[0], headers });
  }
  return route.fulfill({ json: data, headers });
}

export async function makeContext(browser, width) {
  const phone = width <= 430, tablet = width === 768;
  const context = await browser.newContext({
    viewport: { width, height: ({360:740,390:844,430:932,640:900,768:1024})[width] || 1000 },
    deviceScaleFactor: 1, reducedMotion: 'reduce', serviceWorkers: 'block',
    isMobile: phone || tablet, hasTouch: phone || tablet,
  });
  await context.addInitScript(({ member, storageKey }) => {
    const session = { access_token: 'fixture.jwt.only', refresh_token: 'fixture-only', token_type: 'bearer', expires_at: Math.floor(Date.now() / 1000) + 7200, expires_in: 7200, user: { id: member.auth_id, email: member.email } };
    localStorage.setItem(storageKey, JSON.stringify(session));
    const mk = (cn, i) => { const inv = b => ({ date: '2026-08-0' + (i + 1), type: 'Invoice', num: String(5000 + i * 3 + ['current','days30','over90'].indexOf(b)), job: 'Job ' + (10420 + i), fullName: cn + ':Job ' + (10420 + i), location: '', dueDate: '2026-09-0' + (i + 1), amount: 12500, openBalance: 12500, bucket: b, customer: cn }); const invoices = ['current', 'days30', 'over90'].map(inv); return { name: cn, invoices, current: 12500, days30: 12500, days60: 0, days90: 0, over90: 12500, total: 37500 }; };
    const arCust = ['Northline Builders', 'Summit Construction', 'Cedar Commercial', 'Westward Projects'].map(mk);
    if (window.__T1_SEED_AR !== false) localStorage.setItem('ar7-report', JSON.stringify({ customers: arCust, invoices: arCust.flatMap(c => c.invoices), reportDate: '2026-09-30' }));
  }, { member, storageKey: process.env.QA_STORAGE_KEY || 'sb-calllog-fixture-auth-token' });
  await context.routeWebSocket(/.*/, ws => { sockets.push(ws.url()); /* mocked: never connected to a server */ });
  await context.route('**/*', async route => {
    const req = route.request(), u = new URL(req.url());
    if (u.hostname.endsWith('.supabase.co') && req.method() === 'OPTIONS') return route.fulfill({ status: 204, body: '' });
    if (u.hostname.endsWith('.supabase.co')) {
      const p = u.pathname;
      if (p.startsWith('/auth/v1/')) {
        if (req.method() === 'GET' && p.endsWith('/user')) return route.fulfill({ json: { id: member.auth_id, email: member.email } });
        blocked.push(`auth ${req.method()} ${p}`);
        if (!['GET','HEAD','OPTIONS'].includes(req.method())) writes.push(`${CUR} :: ${req.method()} ${p}`);
        return route.fulfill({ status: 200, json: {} });
      }
      if (req.method() === 'POST' && p === '/functions/v1/create-billing-session' && req.postDataJSON()?.action === 'status') return route.fulfill({ json: { status: 'active' } });
      if (req.method() === 'POST' && p === '/functions/v1/qb-auth' && req.postDataJSON()?.action === 'status') return route.fulfill({ json: { connected: false } });
      if (req.method() === 'POST' && p === '/rest/v1/rpc/get_filter_options') return route.fulfill({ json: [] });
      if (req.method() === 'POST' && p.startsWith('/storage/v1/object/list/')) return route.fulfill({ json: [] });
      if (p.startsWith('/rest/v1/rpc/') || p.startsWith('/functions/v1/') || p.startsWith('/storage/v1/')) {
        writes.push(`${CUR} :: ${req.method()} ${p}`);
        return route.fulfill({ status: 403, json: { message: 'T1 probe blocks writes' } });
      }
      if (p.startsWith('/rest/v1/')) return fulfillRest(route, req, u);
      blocked.push(`${req.method()} ${p}`);
      return route.fulfill({ status: 404, json: {} });
    }
    if (['GET','HEAD','OPTIONS'].includes(req.method()) && (u.origin === new URL(BASE).origin || u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com')) return route.continue();
    blocked.push(`external ${req.method()} ${u.hostname}${u.pathname}`);
    return route.abort();
  });
  return context;
}

