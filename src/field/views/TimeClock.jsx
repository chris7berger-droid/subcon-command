import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { C, F } from "../../lib/tokens";
import FieldScreen, { StatusChip, ErrorNote, PlainTable, RefreshBtn } from "../components/FieldScreen";
import { fetchTimeClockReview } from "../lib/queries";
import { reviewRowsToCsv } from "../lib/timeClockCsv";
import { formatDurationHours, reviewTimePunches } from "../lib/timeClockHours";
import { TIME_CLOCK_WRITES_AVAILABLE, TIME_CLOCK_WRITES_REASON } from "../lib/timeClockWrites";
import {
  assertPunchDateRange,
  createPunchRequestGuard,
  filterTimeClockRows,
  formatWorkDate,
  initialPunchLoad,
  pacificToday,
  punchFilterOptions,
  punchTypeLabel,
  punchTypeTone,
  reducePunchLoad,
} from "../lib/timeClock";

const FILTER_INPUT = {
  padding: "7px 12px",
  borderRadius: 7,
  border: `1.5px solid ${C.borderStrong}`,
  background: C.linenDeep,
  color: C.textBody,
  fontSize: 12.5,
  fontFamily: F.ui,
  WebkitAppearance: "none",
  outline: "none",
  minWidth: 0,
};
const FILTER_LABEL = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: C.textFaint,
  fontFamily: F.display,
  marginBottom: 3,
};

function rangeKey(from, to) {
  return `${from}|${to}`;
}

const EMPTY_ROWS = [];

function downloadCsv(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function hoursCell(ms) {
  return formatDurationHours(ms);
}

export default function TimeClock() {
  const today = useMemo(() => pacificToday(), []);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [jobId, setJobId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [load, setLoad] = useState(initialPunchLoad);
  const requests = useRef(createPunchRequestGuard());
  const activeKey = rangeKey(from, to);

  const loadRange = useCallback(async (nextFrom, nextTo) => {
    const key = rangeKey(nextFrom, nextTo);
    let parsed;
    try {
      parsed = assertPunchDateRange(nextFrom, nextTo);
    } catch (err) {
      const requestId = requests.current.start();
      setLoad({
        requestId,
        rangeKey: key,
        rows: [],
        contextRows: [],
        error: err?.message || "Enter a valid date range.",
        loading: false,
        publishedRangeKey: null,
      });
      return;
    }
    const requestId = requests.current.start();
    setLoad((state) => reducePunchLoad(state, { type: "start", requestId, rangeKey: key }));
    try {
      const result = await fetchTimeClockReview(parsed);
      setLoad((state) =>
        reducePunchLoad(state, {
          type: "success",
          requestId,
          rows: result.punches,
          contextRows: result.contextRows,
        })
      );
    } catch (err) {
      setLoad((state) =>
        reducePunchLoad(state, {
          type: "failure",
          requestId,
          error: err?.message || "Time punch query failed",
        })
      );
    }
  }, []);

  useEffect(() => {
    void loadRange(from, to);
  }, [from, to, loadRange]);

  const published = load.publishedRangeKey === activeKey && !load.loading && !load.error;
  const rows = published ? load.rows : EMPTY_ROWS;
  const contextRows = published ? load.contextRows || EMPTY_ROWS : EMPTY_ROWS;
  const review = useMemo(() => reviewTimePunches(contextRows, { from, to }), [contextRows, from, to]);
  const employeeOptions = useMemo(() => punchFilterOptions(rows, "employeeId", "employee"), [rows]);
  const jobOptions = useMemo(() => punchFilterOptions(rows, "jobId", "job"), [rows]);
  const customerOptions = useMemo(() => punchFilterOptions(rows, "customerId", "customer"), [rows]);
  const selectedEmployeeId = employeeOptions.some((option) => option.id === employeeId) ? employeeId : "";
  const selectedJobId = jobOptions.some((option) => option.id === jobId) ? jobId : "";
  const selectedCustomerId = customerOptions.some((option) => option.id === customerId) ? customerId : "";
  const shownPunches = useMemo(
    () => filterTimeClockRows(rows, { jobId: selectedJobId, employeeId: selectedEmployeeId, customerId: selectedCustomerId }),
    [rows, selectedJobId, selectedEmployeeId, selectedCustomerId]
  );
  const shownShifts = useMemo(
    () => filterTimeClockRows(review.rows, { jobId: selectedJobId, employeeId: selectedEmployeeId, customerId: selectedCustomerId }),
    [review.rows, selectedJobId, selectedEmployeeId, selectedCustomerId]
  );
  const filtered = selectedJobId || selectedEmployeeId || selectedCustomerId;
  const selected = shownShifts.find((row) => row.key === selectedKey) || null;

  useEffect(() => {
    if (!published) return;
    if (employeeId && !selectedEmployeeId) setEmployeeId("");
    if (jobId && !selectedJobId) setJobId("");
    if (customerId && !selectedCustomerId) setCustomerId("");
  }, [published, employeeId, jobId, customerId, selectedEmployeeId, selectedJobId, selectedCustomerId]);

  useEffect(() => {
    if (selectedKey && !shownShifts.some((row) => row.key === selectedKey)) setSelectedKey("");
  }, [selectedKey, shownShifts]);

  function exportCsv() {
    if (!published) return;
    downloadCsv(`time-clock-${from}-to-${to}.csv`, reviewRowsToCsv(shownShifts));
  }

  return (
    <FieldScreen
      title="Time Clock"
      subtitle={
        published
          ? `Recorded punches · ${formatWorkDate(from)} – ${formatWorkDate(to)} · Pacific time`
          : "Recorded punches · Pacific time"
      }
      right={
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={exportCsv}
            disabled={!published}
            style={{
              padding: "7px 12px",
              borderRadius: 7,
              border: "none",
              background: C.teal,
              color: C.dark,
              fontFamily: F.ui,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: published ? "pointer" : "not-allowed",
              opacity: published ? 1 : 0.55,
            }}
          >
            Export CSV
          </button>
          <RefreshBtn onClick={() => void loadRange(from, to)} loading={load.loading} />
        </div>
      }
    >
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "flex-end",
          marginBottom: 14,
        }}
      >
        <label style={{ display: "flex", flexDirection: "column" }}>
          <span style={FILTER_LABEL}>From</span>
          <input type="date" value={from} aria-label="From" onChange={(e) => setFrom(e.target.value)} style={{ ...FILTER_INPUT, width: 150 }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column" }}>
          <span style={FILTER_LABEL}>To</span>
          <input type="date" value={to} aria-label="To" onChange={(e) => setTo(e.target.value)} style={{ ...FILTER_INPUT, width: 150 }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column" }}>
          <span style={FILTER_LABEL}>Employee</span>
          <select value={selectedEmployeeId} aria-label="Employee" onChange={(e) => setEmployeeId(e.target.value)} style={{ ...FILTER_INPUT, width: 200, cursor: "pointer" }}>
            <option value="">All employees</option>
            {employeeOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column" }}>
          <span style={FILTER_LABEL}>Job</span>
          <select value={selectedJobId} aria-label="Job" onChange={(e) => setJobId(e.target.value)} style={{ ...FILTER_INPUT, width: 240, cursor: "pointer" }}>
            <option value="">All jobs</option>
            {jobOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column" }}>
          <span style={FILTER_LABEL}>Customer</span>
          <select value={selectedCustomerId} aria-label="Customer" onChange={(e) => setCustomerId(e.target.value)} style={{ ...FILTER_INPUT, width: 220, cursor: "pointer" }}>
            <option value="">All customers</option>
            {customerOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>
      <div style={{ fontSize: 12.5, color: C.textFaint, fontFamily: F.ui, margin: "0 0 10px" }}>
        {published
          ? `${shownPunches.length} ${shownPunches.length === 1 ? "punch" : "punches"}${filtered ? ` · ${rows.length} in range` : ""}`
          : "Loading punches…"}
      </div>
      {load.rangeKey === activeKey && load.error ? (
        <ErrorNote>{load.error}</ErrorNote>
      ) : (
        <PlainTable
          compact
          rows={shownShifts}
          keyField="key"
          empty={published ? (filtered ? "No punches match these filters." : "No punches in this date range.") : "Loading punches…"}
          columns={[
            { key: "employee", label: "Employee" },
            {
              key: "startDay",
              label: "Shift date",
              render: (row) => (row.startDay ? formatWorkDate(row.startDay) : ""),
            },
            { key: "jobNumber", label: "Job number" },
            { key: "jobName", label: "Job name" },
            { key: "customer", label: "Customer" },
            {
              key: "workMs",
              label: "Work hours",
              align: "right",
              render: (row) => hoursCell(row.workMs),
            },
            {
              key: "driveMs",
              label: "Drive",
              align: "right",
              render: (row) => hoursCell(row.driveMs),
            },
            {
              key: "statusLabel",
              label: "Status",
              render: (row) => <StatusChip tone={row.status === "classification_pending" ? "teal" : "muted"}>{row.statusLabel}</StatusChip>,
            },
            {
              key: "open",
              label: "",
              render: (row) => (
                <button
                  type="button"
                  onClick={() => setSelectedKey(row.key === selectedKey ? "" : row.key)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 6,
                    border: `1px solid ${C.dark}`,
                    background: row.key === selectedKey ? C.dark : C.linenDeep,
                    color: row.key === selectedKey ? C.teal : C.dark,
                    fontFamily: F.ui,
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {row.key === selectedKey ? "Close" : "Day"}
                </button>
              ),
            },
          ]}
        />
      )}
      {selected ? <DayDetail shift={selected} /> : null}
      <EditorNotice />
    </FieldScreen>
  );
}

function DayDetail({ shift }) {
  const punches = (shift.punches || []).slice().sort((a, b) => String(a.punchTimeIso || "").localeCompare(String(b.punchTimeIso || "")) || String(a.id).localeCompare(String(b.id)));
  return (
    <section style={{ marginTop: 16 }}>
      <div style={{ fontFamily: F.display, fontSize: 13, letterSpacing: "0.06em", textTransform: "uppercase", color: C.textHead, marginBottom: 6 }}>
        {shift.employee || "Employee"} · {shift.startDay ? formatWorkDate(shift.startDay) : "Day"}
      </div>
      <div style={{ fontSize: 12.5, color: C.textBody, fontFamily: F.ui, marginBottom: 8, lineHeight: 1.45 }}>
        Work hours {hoursCell(shift.workMs) || "—"} · Drive {hoursCell(shift.driveMs) || "—"}
        {shift.driveFlag ? ` · ${shift.driveFlag}` : ""}
        {" · "}
        {shift.statusLabel}
        {". Regular, OT, and double time stay blank."}
      </div>
      <PlainTable
        compact
        rows={punches}
        keyField="id"
        empty="No punches on this day."
        columns={[
          {
            key: "punchType",
            label: "Punch",
            render: (row) => <StatusChip tone={punchTypeTone(row.punchType)}>{punchTypeLabel(row.punchType)}</StatusChip>,
          },
          { key: "workDate", label: "Stored punch date" },
          { key: "pacificStamp", label: "Pacific time" },
          { key: "jobNumber", label: "Job number" },
          { key: "jobName", label: "Job name" },
          { key: "hoursRegular", label: "Stored regular", align: "right", render: (row) => row.hoursRegular },
          { key: "hoursOt", label: "Stored OT", align: "right", render: (row) => row.hoursOt },
          { key: "hoursDrive", label: "Stored drive", align: "right", render: (row) => row.hoursDrive },
        ]}
      />
    </section>
  );
}

function EditorNotice() {
  return (
    <section
      style={{
        marginTop: 16,
        padding: "12px 14px",
        borderRadius: 10,
        background: C.linenCard,
        border: `1px solid ${C.borderStrong}`,
      }}
    >
      <div style={{ fontFamily: F.display, fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", color: C.textHead, marginBottom: 6 }}>
        Punch editor
      </div>
      <p style={{ margin: "0 0 10px", fontSize: 13, lineHeight: 1.45, color: C.textBody, fontFamily: F.body }}>{TIME_CLOCK_WRITES_REASON}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <button type="button" disabled={!TIME_CLOCK_WRITES_AVAILABLE} style={disabledButton}>Add</button>
        <button type="button" disabled={!TIME_CLOCK_WRITES_AVAILABLE} style={disabledButton}>Edit</button>
        <button type="button" disabled={!TIME_CLOCK_WRITES_AVAILABLE} style={disabledButton}>Void</button>
      </div>
      <label style={{ display: "flex", flexDirection: "column", maxWidth: 420 }}>
        <span style={FILTER_LABEL}>Reason</span>
        <input aria-label="Reason" disabled placeholder="Required when corrections are enabled" style={{ ...FILTER_INPUT, width: "100%" }} />
      </label>
      <div style={{ marginTop: 10, fontSize: 12.5, color: C.textFaint, fontFamily: F.ui }}>
        Audit history will show the actor, reason, and before/after values. Nothing has been written.
      </div>
    </section>
  );
}

const disabledButton = {
  padding: "6px 12px",
  borderRadius: 7,
  border: `1px solid ${C.borderStrong}`,
  background: C.linenDeep,
  color: C.textFaint,
  fontFamily: F.ui,
  fontSize: 12.5,
  fontWeight: 700,
  cursor: "not-allowed",
};
