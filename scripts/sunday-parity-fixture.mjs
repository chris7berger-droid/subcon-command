// Shared synthetic fixture for the Sunday = Saturday parity checks (F60,
// docs/plans/sunday-scheduling.md §5). Synthetic names only; nothing here is
// read from or written to a real database.
//
// Week W = Mon 2026-09-28 … Sun 2026-10-04.

export const WEEK = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']
export const SAT = '2026-10-03'
export const SUN = '2026-10-04'

export const P = {
  P1: 'Alder, Pat',     // Team-linked, free
  P2: 'Birch, Quinn',   // unlinked, free
  P3: 'Cedar, Ray',     // Scheduled Off on Sunday
  P4: 'Dogwood, Sam',   // Sick on Saturday
  P5: 'Elm, Tess',      // A1 + B1 on Saturday (double-booked)
  P6: 'Fir, Uma',       // A1 + C1 on Sunday (double-booked)
  P7: 'Gum, Vic',       // C1 on Sunday 10-04, D1 on Sunday 11-08, nothing else
  X: 'Hazel, Xan',      // A1 + A2 on Saturday and Sunday
  P8: 'Ivy, Wren',      // Scheduled Off Mon–Sat, nothing on Sunday, no crew days
  P9: 'Juniper, Yael',  // Scheduled Off Mon–Sun
}
export const P1_TEAM_ID = '11111111-1111-4111-8111-111111111111'

function job(job_id, num, name, start, end, extra = {}) {
  return {
    job_id, call_log_id: 100 + job_id, job_num: num, job_name: name, status: 'Scheduled', deleted: 'No',
    merged_into_job_id: null, start_date: start, end_date: end, crew_needed: null, lead: P.X, job_wtcs: [],
    call_log: { id: 100 + job_id, job_number: Number(num), display_job_number: num, job_name: name, customer_name: 'Fixture Customer' },
    ...extra,
  }
}

export function makeFixture() {
  const jobs = [
    job(1, '8101', 'Job A', '2026-09-28', '2026-10-09'),
    job(2, '8102', 'Job B', SAT, SAT),
    job(3, '8103', 'Job C', SUN, SUN, { status: 'Ongoing' }),
    job(4, '8104', 'Job N', '2026-09-28', '2026-10-09'),
    job(5, '8105', 'Job M', '2026-09-28', '2026-10-11'),
    job(6, '8106', 'Job R', '2026-09-28', SUN, { status: 'Ongoing', partial_billing: 'Yes', partial_bill_date: SUN, partial_percent: 50 }),
    job(7, '8107', 'Job D', '2026-11-08', '2026-11-08'),
  ]
  const trips = [
    { id: 'A1', job_id: 1, seq: 1, label: 'A1 main', start_date: '2026-09-28', end_date: '2026-10-09', crew_needed: 3, lead: P.X },
    { id: 'A2', job_id: 1, seq: 2, label: 'A2 weekend', start_date: SAT, end_date: SUN, crew_needed: 2, lead: P.X },
    { id: 'B1', job_id: 2, seq: 1, label: 'B1 Saturday', start_date: SAT, end_date: SAT, crew_needed: 2, lead: P.P5 },
    { id: 'C1', job_id: 3, seq: 1, label: 'C1 Sunday', start_date: SUN, end_date: SUN, crew_needed: 2, lead: P.P6 },
    { id: 'N1', job_id: 4, seq: 1, label: 'N1 two weeks', start_date: '2026-09-28', end_date: '2026-10-09', crew_needed: 1, lead: P.X },
    { id: 'D1', job_id: 7, seq: 1, label: 'D1 Sunday', start_date: '2026-11-08', end_date: '2026-11-08', crew_needed: 1, lead: P.P7 },
  ]
  const crew = Object.entries(P).map(([key, name]) => ({
    name, team: '1', archived: false, archived_on: null,
    team_member_id: key === 'P1' ? P1_TEAM_ID : null,
  }))
  let id = 1
  const a = (job_id, mobilization_id, crew_name, date) => ({ id: id++, job_id, mobilization_id, crew_name, date, team_member_id: null })
  const assignments = [
    a(1, 'A1', P.P5, SAT), a(2, 'B1', P.P5, SAT),
    a(1, 'A1', P.P6, SUN), a(3, 'C1', P.P6, SUN),
    a(3, 'C1', P.P7, SUN), a(7, 'D1', P.P7, '2026-11-08'),
    a(1, 'A1', P.X, SAT), a(1, 'A1', P.X, SUN), a(1, 'A2', P.X, SAT), a(1, 'A2', P.X, SUN),
  ]
  const statuses = [
    { crew_name: P.P3, date: SUN, status: 'scheduled-off' },
    { crew_name: P.P4, date: SAT, status: 'sick' },
    ...WEEK.slice(0, 6).map(date => ({ crew_name: P.P8, date, status: 'scheduled-off' })),
    ...WEEK.map(date => ({ crew_name: P.P9, date, status: 'scheduled-off' })),
  ]
  // Job R is partly billed: a live sold proposal with one sent, unpaid invoice.
  const proposals = [{ id: 'prop-R', call_log_id: 106, status: 'Sold', total: 10000, is_archive_proposal: false }]
  const invoices = [{
    id: 'inv-R1', call_log_id: 106, proposal_id: 'prop-R', amount: 4000, discount: 0, retention_amount: 0,
    retention_release_of: null, sent_at: '2026-09-15T17:00:00+00:00', paid_at: null, due_date: '2026-10-15',
    status: 'Sent', qb_invoice_id: null, tenant_id: 'fixture-tenant',
    call_log: { display_job_number: '8106', customer_id: 1, customers: { billing_terms: 30, requires_pay_app: false } },
    tenant_config: { default_billing_terms: 30 },
  }]
  return { jobs, trips, crew, assignments, statuses, proposals, invoices, nextId: () => id++ }
}
