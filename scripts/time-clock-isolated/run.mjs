// Isolated PostgREST + PowerSync check.
// The client is @powersync/web 1.37.1 (common 1.51.0), the same common
// package as the installed phone SDK. It is not the phone binary.
// Upload follows field-command/src/lib/connector.js without editing that file.

import "fake-indexeddb/auto";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const nativeFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input?.url;
  if (typeof url === "string" && url.startsWith("file:")) {
    const path = fileURLToPath(url);
    const bytes = await readFile(path);
    return new Response(bytes, { status: 200, headers: { "content-type": "application/wasm" } });
  }
  return nativeFetch(input, init);
};
import { createClient } from "@supabase/supabase-js";
import { column, PowerSyncDatabase, Schema, Table, UpdateType } from "@powersync/web";
import { DEFAULT_MODULE_FACTORIES, WASQLiteVFS } from "./node_modules/@powersync/web/lib/src/db/adapters/wa-sqlite/vfs.js";
import { reviewTimePunches, formatDurationHours } from "../../src/field/lib/timeClockHours.js";
import { reviewShiftCsvFields } from "../../src/field/lib/timeClockCsv.js";
import { signIsolatedJwt } from "../../src/field/lib/timeClockIsolated.js";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const POSTGREST = "http://127.0.0.1:54321";
const POWERSYNC = "http://127.0.0.1:8080";
const TENANT = "11111111-1111-1111-1111-111111111111";
const CREW = "66666666-6666-6666-6666-666666666666";
const ADMIN_MEMBER = "22222222-2222-2222-2222-222222222222";
const FIELD_AUTH = "55555555-5555-5555-5555-555555555555";
const PUNCH_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1";
const PUNCH_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2";
const PUNCH_C = "cccccccc-cccc-cccc-cccc-ccccccccccc3";
const OLD_TIME = "2026-09-21T15:00:00.000Z";
const OFFICE_TIME = "2026-09-21T15:30:00.000Z";
const FATAL_CODES = [/^22...$/, /^23...$/, /^42501$/];
const http = [];

function compose(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["compose", "-p", "time-clock-isolated", ...args], {
      cwd: ROOT,
      stdio: "inherit",
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`docker compose ${args.join(" ")} exited ${code}`));
    });
  });
}

function psql(sql) {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", [
      "compose", "-p", "time-clock-isolated", "exec", "-T", "postgres",
      "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-tA",
    ], { cwd: ROOT });
    let out = "";
    let err = "";
    child.stdout.on("data", (chunk) => { out += chunk; });
    child.stderr.on("data", (chunk) => { err += chunk; });
    child.on("exit", (code) => {
      if (code === 0) resolve(out.trim());
      else reject(new Error(err || out || `psql exited ${code}`));
    });
    child.stdin.end(sql);
  });
}

async function waitFor(url, label) {
  for (let attempt = 1; attempt <= 90; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.status < 500) return;
    } catch {
      // Service is still opening its port.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`${label} did not become ready at ${url}`);
}

function loggedFetch(url, options = {}) {
  return fetch(url, options).then(async (response) => {
    const body = await response.clone().text();
    if (String(url).includes("/rest/v1/")) {
      http.push({
        method: options.method || "GET",
        url: String(url),
        status: response.status,
        body: body.slice(0, 400),
      });
    }
    return response;
  });
}

function clientFor(token) {
  return createClient(POSTGREST, token, {
    global: { fetch: loggedFetch },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function uploadData(database, supabase) {
  const transaction = await database.getNextCrudTransaction();
  if (!transaction) return;
  let lastOp = null;
  try {
    for (const op of transaction.crud) {
      lastOp = op;
      const table = supabase.from(op.table);
      let result;
      if (op.op === UpdateType.PUT) result = await table.upsert({ ...op.opData, id: op.id });
      else if (op.op === UpdateType.PATCH) result = await table.update(op.opData).eq("id", op.id);
      else if (op.op === UpdateType.DELETE) result = await table.delete().eq("id", op.id);
      if (result?.error) throw result.error;
    }
    await transaction.complete();
  } catch (error) {
    if (typeof error.code === "string" && FATAL_CODES.some((pattern) => pattern.test(error.code))) {
      console.error("fatal upload, discarding batch", lastOp?.id, error.code, error.message);
      await transaction.complete();
      return;
    }
    throw error;
  }
}

DEFAULT_MODULE_FACTORIES[WASQLiteVFS.IDBBatchAtomicVFS] = async (options) => {
  const { default: factory } = await import("@journeyapps/wa-sqlite/dist/wa-sqlite-async.mjs");
  const sqlite = await factory();
  const { MemoryAsyncVFS } = await import("@journeyapps/wa-sqlite/src/examples/MemoryAsyncVFS.js");
  const vfs = new MemoryAsyncVFS(options.dbFileName, sqlite);
  await vfs.isReady();
  return { module: sqlite, vfs };
};

function punchRow(id, type, time) {
  return {
    id,
    punchType: type,
    punchTimeIso: time,
    storedPunchDate: "2026-09-22",
    employeeId: ADMIN_MEMBER,
    employee: "Office Admin",
    jobId: "1",
    jobNumber: "100",
    jobName: "Deck",
    customer: "Ada Co",
  };
}

async function main() {
  await compose(["down", "-v"]);
  await compose(["up", "-d", "--wait"]);
  await waitFor(`${POSTGREST}/`, "PostgREST");
  await waitFor(`${POWERSYNC}/probes/liveness`, "PowerSync");

  const adminToken = await signIsolatedJwt("33333333-3333-3333-3333-333333333333", "authenticated");
  const fieldToken = await signIsolatedJwt(FIELD_AUTH, "authenticated");
  const admin = clientFor(adminToken);
  const field = clientFor(fieldToken);

  const salesDenied = await field.rpc("apply_time_punch_correction", {
    p_action: "add",
    p_punch_id: null,
    p_employee_id: CREW,
    p_job_id: 1,
    p_punch_type: "clock_in",
    p_punch_time: OLD_TIME,
    p_punch_date: "2026-09-21",
    p_reason: "sales rep",
    p_expected_employee_id: null,
    p_expected_job_id: null,
    p_expected_punch_type: null,
    p_expected_punch_time: null,
    p_expected_punch_date: null,
  });
  if (salesDenied.error?.code !== "42501") {
    throw new Error(`sales rep was not rejected: ${JSON.stringify(salesDenied.error)}`);
  }

  await psql(`
    INSERT INTO public.time_punches (id, job_id, employee_id, punch_type, punch_time, punch_date, tenant_id)
    VALUES
      ('${PUNCH_A}', 1, '${CREW}', 'clock_in', '${OLD_TIME}', '2026-09-21', '${TENANT}'),
      ('${PUNCH_B}', 1, '${CREW}', 'clock_in', '${OLD_TIME}', '2026-09-21', '${TENANT}');
    UPDATE public.call_log SET stage = 'Scheduled' WHERE id IN (1, 2);
    DELETE FROM public.job_changes;
  `);

  const edited = await admin.rpc("apply_time_punch_correction", {
    p_action: "edit",
    p_punch_id: PUNCH_A,
    p_employee_id: CREW,
    p_job_id: 1,
    p_punch_type: "clock_in",
    p_punch_time: OFFICE_TIME,
    p_punch_date: "2026-09-21",
    p_reason: "office corrected the clock-in",
    p_expected_employee_id: CREW,
    p_expected_job_id: 1,
    p_expected_punch_type: "clock_in",
    p_expected_punch_time: OLD_TIME,
    p_expected_punch_date: "2026-09-21",
  });
  if (edited.error) throw new Error(`office edit failed: ${edited.error.message}`);

  const voided = await admin.rpc("apply_time_punch_correction", {
    p_action: "void",
    p_punch_id: PUNCH_B,
    p_employee_id: CREW,
    p_job_id: 1,
    p_punch_type: "clock_in",
    p_punch_time: OLD_TIME,
    p_punch_date: "2026-09-21",
    p_reason: "office voided the duplicate",
    p_expected_employee_id: CREW,
    p_expected_job_id: 1,
    p_expected_punch_type: "clock_in",
    p_expected_punch_time: OLD_TIME,
    p_expected_punch_date: "2026-09-21",
  });
  if (voided.error) throw new Error(`office void failed: ${voided.error.message}`);

  const schema = new Schema({
    time_punches: new Table({
      job_id: column.integer,
      employee_id: column.text,
      punch_type: column.text,
      punch_time: column.text,
      punch_date: column.text,
      latitude: column.real,
      longitude: column.real,
      on_site: column.integer,
      gps_override: column.integer,
      weather_temp: column.real,
      weather_condition: column.text,
      hours_regular: column.real,
      hours_ot: column.real,
      hours_drive: column.real,
      synced: column.integer,
      created_at: column.text,
    }),
  });
  const database = new PowerSyncDatabase({
    schema,
    database: { dbFilename: "time-clock-isolated.db" },
    flags: { useWebWorker: false, ssrMode: false, disableSSRWarning: true, enableMultiTabs: false },
  });
  await database.init();
  await database.writeTransaction(async (tx) => {
    const rows = [
      [PUNCH_A, 1, OLD_TIME],
      [PUNCH_B, 1, OLD_TIME],
      [PUNCH_C, 2, "2026-09-21T18:00:00.000Z"],
    ];
    for (const [id, jobId, time] of rows) {
      await tx.execute(
        `INSERT INTO time_punches (id, job_id, employee_id, punch_type, punch_time, punch_date, on_site, gps_override, synced, created_at)
         VALUES (?, ?, ?, 'clock_in', ?, '2026-09-21', 0, 0, 0, ?)`,
        [id, jobId, CREW, time, new Date().toISOString()]
      );
    }
  });

  const connector = {
    async fetchCredentials() {
      return { endpoint: POWERSYNC, token: fieldToken };
    },
    async uploadData(db) {
      await uploadData(db, field);
    },
  };
  await database.connect(connector);
  const deadline = Date.now() + 45000;
  let crudCount = null;
  let synced = false;
  while (Date.now() < deadline) {
    const rows = await database.getAll("SELECT count(*) AS n FROM ps_crud");
    crudCount = Number(rows[0]?.n ?? rows[0]?.["count(*)"] ?? -1);
    synced = database.currentStatus?.hasSynced === true;
    if (synced && crudCount === 0) break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  const local = await database.getAll("SELECT id, punch_time FROM time_punches ORDER BY id");
  await database.disconnect();
  await database.close();

  const serverPunches = await psql("SELECT id || ' ' || punch_time FROM public.time_punches ORDER BY id;");
  const serverAudit = await psql("SELECT action || ' ' || actor_id || ' ' || reason || ' ' || COALESCE(before_row->>'punch_time','') || ' ' || COALESCE(after_row->>'punch_time','') FROM public.time_punch_audit ORDER BY created_at;");
  const stages = await psql("SELECT id || ' ' || stage FROM public.call_log WHERE id IN (1, 2) ORDER BY id;");
  const voidStillGone = !(await psql(`SELECT 1 FROM public.time_punches WHERE id = '${PUNCH_B}';`));
  const voidAudit = await psql(`SELECT count(*) FROM public.time_punch_audit WHERE punch_id = '${PUNCH_B}' AND action = 'void' AND actor_id = '${ADMIN_MEMBER}';`);

  const clockIn = await admin.rpc("apply_time_punch_correction", {
    p_action: "add",
    p_punch_id: null,
    p_employee_id: ADMIN_MEMBER,
    p_job_id: 1,
    p_punch_type: "clock_in",
    p_punch_time: "2026-09-22T15:00:00.000Z",
    p_punch_date: "2026-09-22",
    p_reason: "missed clock-in",
    p_expected_employee_id: null,
    p_expected_job_id: null,
    p_expected_punch_type: null,
    p_expected_punch_time: null,
    p_expected_punch_date: null,
  });
  if (clockIn.error) throw new Error(`add clock-in failed: ${clockIn.error.message}`);
  const clockOut = await admin.rpc("apply_time_punch_correction", {
    p_action: "add",
    p_punch_id: null,
    p_employee_id: ADMIN_MEMBER,
    p_job_id: 1,
    p_punch_type: "clock_out",
    p_punch_time: "2026-09-22T23:00:00.000Z",
    p_punch_date: "2026-09-22",
    p_reason: "missed clock-out",
    p_expected_employee_id: null,
    p_expected_job_id: null,
    p_expected_punch_type: null,
    p_expected_punch_time: null,
    p_expected_punch_date: null,
  });
  if (clockOut.error) throw new Error(`add clock-out failed: ${clockOut.error.message}`);
  const stale = await admin.rpc("apply_time_punch_correction", {
    p_action: "edit",
    p_punch_id: clockOut.data,
    p_employee_id: ADMIN_MEMBER,
    p_job_id: 1,
    p_punch_type: "clock_out",
    p_punch_time: "2026-09-22T22:00:00.000Z",
    p_punch_date: "2026-09-22",
    p_reason: "stale editor",
    p_expected_employee_id: ADMIN_MEMBER,
    p_expected_job_id: 1,
    p_expected_punch_type: "clock_out",
    p_expected_punch_time: "2026-09-22T22:00:00.000Z",
    p_expected_punch_date: "2026-09-22",
  });
  if (stale.error?.code !== "P0001") {
    throw new Error(`stale save was not rejected: ${JSON.stringify(stale.error)}`);
  }
  const jobOne = await psql("SELECT stage FROM public.call_log WHERE id = 1;");

  const reloaded = await admin.from("time_punches").select("id, employee_id, punch_type, punch_time, punch_date, job_id").eq("employee_id", ADMIN_MEMBER);
  if (reloaded.error) throw new Error(reloaded.error.message);
  const review = reviewTimePunches(reloaded.data.map((row) => punchRow(
    row.id,
    row.punch_type,
    row.punch_time
  ).punchType ? {
    id: row.id,
    punchType: row.punch_type,
    punchTimeIso: row.punch_time,
    storedPunchDate: row.punch_date,
    employeeId: row.employee_id,
    employee: "Office Admin",
    jobId: String(row.job_id),
    jobNumber: "100",
    jobName: "Deck",
    customer: "Ada Co",
  } : null).filter(Boolean), { from: "2026-09-22", to: "2026-09-22" });
  const shift = review.rows[0];
  const csv = reviewShiftCsvFields(shift);

  const report = {
    http,
    serverPunches,
    serverAudit,
    stages,
    voidStillGone,
    voidAudit,
    local,
    synced,
    crudCount,
    jobOne,
    workHours: formatDurationHours(shift?.workMs),
    regularHours: shift?.regularHours,
    overtimeHours: shift?.otHours,
    csvRegular: csv?.[9],
    csvOvertime: csv?.[10],
  };
  console.log(JSON.stringify(report, null, 2));

  const failures = [];
  if (!serverPunches.includes(OFFICE_TIME.replace(".000Z", "")) && !serverPunches.includes("15:30")) failures.push("office edit did not survive");
  if (!voidStillGone || voidAudit !== "1") failures.push("void was not kept with its audit");
  if (!serverPunches.includes(PUNCH_C)) failures.push("new punch did not arrive");
  if (!synced || crudCount !== 0) failures.push(`queue did not finish synced=${synced} crud=${crudCount}`);
  if (!local.some((row) => row.id === PUNCH_A && String(row.punch_time).includes("15:30"))) failures.push("local row did not adopt the office time");
  if (local.some((row) => row.id === PUNCH_B)) failures.push("local voided punch remained");
  if (!local.some((row) => row.id === PUNCH_C)) failures.push("local new punch missing");
  if (!stages.includes("2|In Progress") && !stages.includes("2 In Progress")) failures.push(`job stage unexpected: ${stages}`);
  if (jobOne !== "Scheduled") failures.push(`office clock-in advanced the job: ${jobOne}`);
  if (report.workHours !== "8.00" || report.regularHours !== "8.00" || report.csvRegular !== "8.00" || report.overtimeHours !== "0.00" || report.csvOvertime !== "0.00") {
    failures.push("screen hours and CSV did not match");
  }
  if (failures.length) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
  console.log("PASS isolated time clock sync and save");
}

main().catch((error) => {
  console.error(error);
  console.log(JSON.stringify(http, null, 2));
  process.exit(1);
});
