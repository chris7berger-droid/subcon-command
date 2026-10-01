// Synthetic-only regression for the preview auto-archive guard. No network.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import process from 'node:process';
const source = await fs.readFile(new URL('../src/pages/CallLog.jsx', import.meta.url), 'utf8');
const block = source.slice(source.indexOf('    const months = config?.archive_after_months'), source.indexOf('    // Paginate call_log'));
assert(block.includes('import.meta.env.VITE_VERCEL_ENV'), 'guard must cover the actual archive block');
const original = block.replace('import.meta.env.VITE_VERCEL_ENV !== "preview" && ', '');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
async function run(code, env, stages = ['Lost']) {
  const calls = [], banners = [];
  const chain = new Proxy({}, { get: (_target, key) => {
    if (key === 'then') return (resolve) => resolve({data:[{id:901},{id:902}]});
    return (...args) => { calls.push([key,...args]); return chain; };
  }});
  const execute = new AsyncFunction('supabase','config','setArchiveBanner', code.replaceAll('import.meta.env.VITE_VERCEL_ENV', JSON.stringify(env)));
  await execute({from:(table)=>{calls.push(['from',table]);return chain;}}, {archive_after_months:12,archive_stages:stages}, n=>banners.push(n));
  return {calls,banners};
}
const baseline = await run(original, 'production');
assert.deepEqual(baseline.calls.filter(c=>c[0]==='update'), [['update',{archived:true}]]);
assert.deepEqual(baseline.calls.at(-1), ['in','id',[901,902]]);
assert.deepEqual(baseline.banners,[2]);
assert.deepEqual(await run(block,'production'),baseline,'production must keep the exact existing query/write/banner behavior');
assert.deepEqual(await run(block,''),baseline,'non-Vercel builds keep existing behavior');
assert.deepEqual(await run(block,'development'),baseline);
assert.deepEqual(await run(block,'preview'),{calls:[],banners:[]},'preview must not query candidates, update jobs or show a false archive banner');
assert.deepEqual(await run(block,'production',[]),{calls:[],banners:[]});
const saved=process.env.VERCEL_ENV;
try {
  for (const env of ['preview','production','development','']) {
    if(env)process.env.VERCEL_ENV=env;else delete process.env.VERCEL_ENV;
    const {default:config}=await import(`../vite.config.js?archive-check=${env}`);
    assert.equal(config.define['import.meta.env.VITE_VERCEL_ENV'],JSON.stringify(env));
  }
} finally { if(saved===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=saved; }
console.log('PASS: preview skips archive query/write/banner; production and non-preview match original behavior; Vite maps all four environment cases. All Supabase calls were local stubs.');
