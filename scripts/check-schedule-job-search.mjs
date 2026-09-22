import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// Exercise the actual query/matcher without loading the browser Supabase client.
const source = readFileSync(new URL('../src/schedule/lib/queries.js', import.meta.url), 'utf8')
const fn = source.match(/export async function searchExistingJobs\(term\) \{[\s\S]*?\n\}/)?.[0]
assert(fn, 'searchExistingJobs must exist')
let rows = [], queryError = null, calls = 0
const search = new Function('loadAllRows', `${fn.replace('export ', '')}; return searchExistingJobs;`)(
  async (table, select, options) => {
    calls++
    assert.equal(table, 'call_log')
    assert.equal(select, 'id, job_number, display_job_number, customer_name, job_name, jobs!inner(job_id, job_num, deleted, merged_into_job_id)')
    assert.deepEqual(options, { orderBy: 'id', orderAsc: false })
    return { data: rows, error: queryError }
  },
)

// Confirmed production identity; all input here is local fixture data.
const co = {
  id: 3947, job_number: 6507, display_job_number: '6507 CO8 - T&M',
  customer_name: 'Contract Flooring', job_name: 'T&M',
  jobs: [{ job_id: 1298, job_num: '6507 CO8 - T&M', deleted: 'No', merged_into_job_id: null }],
}
const base = {
  id: 3533, job_number: 6507, display_job_number: '6507 - Original work',
  customer_name: 'Contract Flooring', job_name: 'Original work',
  jobs: [{ job_id: 993, job_num: 'Legacy number', deleted: null, merged_into_job_id: null }],
}
rows = [co, base]
for (const term of ['6507 CO8', '6507CO8', '6507 CO 8', ' 6507 co8 ', 'T&M']) {
  const { data, error } = await search(term)
  assert.equal(error, null)
  assert.deepEqual(data.map(j => j.job_id), [1298], term)
  assert.equal(data[0].call_log_id, 3947)
  assert.equal(data[0].job_number, 6507, 'bare Sales number remains unchanged')
  assert.equal(data[0].display_job_number, '6507 CO8 - T&M')
}
for (const term of ['6507', 'contract flooring']) {
  assert.deepEqual((await search(term)).data.map(j => j.job_id), [1298, 993], term)
}
assert.deepEqual((await search('original work')).data.map(j => j.job_id), [993])
assert.deepEqual((await search('Legacy number')).data, [], 'Sales display identity takes precedence')
assert.deepEqual((await search('6507 CO9')).data, [])

rows = [{ ...co, display_job_number: null }]
assert.equal((await search('6507CO8')).data[0].display_job_number, '6507 CO8 - T&M', 'jobs.job_num fallback')
rows = [{ ...co, display_job_number: '', jobs: [{ ...co.jobs[0], job_num: null }] }]
assert.equal((await search('6507')).data[0].display_job_number, '6507', 'bare-number fallback')
rows = [{ ...base, jobs: base.jobs[0] }]
assert.equal((await search('6507')).data[0].job_id, 993, 'object-shaped embed remains supported')

rows = [
  { ...co, jobs: [{ ...co.jobs[0], deleted: 'Yes' }] },
  { ...co, jobs: [{ ...co.jobs[0], merged_into_job_id: 993 }] },
  { ...co, jobs: [] },
  { ...co, jobs: null },
]
assert.deepEqual((await search('6507')).data, [], 'deleted, merged and missing Schedule rows stay excluded')

rows = Array.from({ length: 30 }, (_, i) => ({ ...base, jobs: [{ ...base.jobs[0], job_id: 2000 + i }] }))
assert.equal((await search('6507')).data.length, 25, 'picker cap retained')
rows = [co]
queryError = { message: 'private database detail' }
assert.deepEqual(await search('6507'), { data: [], error: queryError }, 'partial data on failure is not a successful match')
const beforeEmpty = calls
assert.deepEqual(await search('   '), { data: [], error: null })
assert.equal(calls, beforeEmpty, 'blank search does not fetch')
console.log('PASS: CO spacing variants/identity, bare/customer/name searches, non-CO, fallback order, existing query/eligibility/IDs/cap, and query-error propagation.')
