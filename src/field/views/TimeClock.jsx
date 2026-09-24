import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { C, F } from "../../lib/tokens";
import FieldScreen, { StatusChip, ErrorNote, PlainTable, RefreshBtn } from "../components/FieldScreen";
import { fetchTimeClockEmployees, fetchTimeClockReview, searchTimeClockJobs } from "../lib/queries";
import { reviewRowsToCsv } from "../lib/timeClockCsv";
import { formatDurationHours, reviewTimePunches } from "../lib/timeClockHours";
import { applyTimePunchCorrection, TIME_CLOCK_WRITES_REASON, timeClockWritesAvailable } from "../lib/timeClockWrites";
import {
  assertPunchDateRange,
  cleanJobName,
  createPunchRequestGuard,
  employeeChoices,
  filterTimeClockRows,
  formatWorkDate,
  initialPunchLoad,
  pacificDate,
  pacificLocalToIso,
  pacificTimeValue,
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
  const [selectedPunchId, setSelectedPunchId] = useState("");
  const [editorMode, setEditorMode] = useState("");
  const [employees, setEmployees] = useState([]);
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

  useEffect(() => {
    let cancelled = false;
    fetchTimeClockEmployees()
      .then((list) => {
        if (!cancelled) setEmployees(list);
      })
      .catch(() => {
        if (!cancelled) setEmployees([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const published = load.publishedRangeKey === activeKey && !load.loading && !load.error;
  const rows = published ? load.rows : EMPTY_ROWS;
  const contextRows = published ? load.contextRows || EMPTY_ROWS : EMPTY_ROWS;
  const review = useMemo(() => reviewTimePunches(contextRows, { from, to }), [contextRows, from, to]);
  const employeeOptions = useMemo(() => employeeChoices(employees, rows), [employees, rows]);
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
          <button type="button" onClick={() => { setEditorMode("add"); setSelectedPunchId(""); }} style={tealButton}>
            Add punch
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={!published}
            style={{ ...tealButton, cursor: published ? "pointer" : "not-allowed", opacity: published ? 1 : 0.55 }}
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
              key: "regularHours",
              label: "Regular hours",
              align: "right",
              render: (row) => row.regularHours,
            },
            {
              key: "otHours",
              label: "Overtime hours",
              align: "right",
              render: (row) => row.otHours,
            },
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
              key: "holidayHours",
              label: "Holiday hours",
              align: "right",
              render: (row) => row.holidayHours,
            },
            {
              key: "statusLabel",
              label: "Status",
              render: (row) => (row.statusLabel ? <StatusChip tone="muted">{row.statusLabel}</StatusChip> : ""),
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
      {selected ? (
        <DayDetail
          shift={selected}
          selectedPunchId={selectedPunchId}
          onEdit={(punch) => {
            setSelectedPunchId(punch.id);
            setEditorMode("edit");
          }}
        />
      ) : null}
      {editorMode ? (
        <PunchEditor
          key={`${editorMode}:${selectedPunchId}`}
          mode={editorMode}
          employees={employeeOptions}
          punch={editorMode === "edit" ? (selected?.punches || []).find((punch) => punch.id === selectedPunchId) : null}
          defaultDate={from}
          onClose={() => setEditorMode("")}
          onSaved={async () => {
            setEditorMode("");
            await loadRange(from, to);
          }}
        />
      ) : null}
    </FieldScreen>
  );
}

function DayDetail({ shift, selectedPunchId, onEdit }) {
  const punches = (shift.punches || []).slice().sort((a, b) => String(a.punchTimeIso || "").localeCompare(String(b.punchTimeIso || "")) || String(a.id).localeCompare(String(b.id)));
  return (
    <section style={{ marginTop: 16 }}>
      <div style={{ fontFamily: F.display, fontSize: 13, letterSpacing: "0.06em", textTransform: "uppercase", color: C.textHead, marginBottom: 6 }}>
        {shift.employee || "Employee"} · {shift.startDay ? formatWorkDate(shift.startDay) : "Day"}
      </div>
      <div style={{ fontSize: 12.5, color: C.textBody, fontFamily: F.ui, marginBottom: 8, lineHeight: 1.45 }}>
        Regular {shift.regularHours || "—"} · Overtime {shift.otHours || "—"} · Work {hoursCell(shift.workMs) || "—"} · Drive {hoursCell(shift.driveMs) || "—"}
        {shift.statusLabel ? ` · ${shift.statusLabel}` : ""}
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
          {
            key: "edit",
            label: "",
            render: (row) => (
              <button type="button" onClick={() => onEdit(row)} style={row.id === selectedPunchId ? selectedButton : quietButton}>
                Edit punch
              </button>
            ),
          },
        ]}
      />
    </section>
  );
}

const PUNCH_TYPES = [
  ["clock_in", "Clock in"],
  ["clock_out", "Clock out"],
  ["lunch_start", "Lunch start"],
  ["lunch_end", "Lunch end"],
  ["drive_start", "Drive start"],
  ["drive_end", "Drive end"],
];

function PunchEditor({ mode, employees, punch, defaultDate, onClose, onSaved }) {
  const [employeeId, setEmployeeId] = useState(punch?.employeeId || "");
  const [jobId, setJobId] = useState(punch?.jobId || "");
  const [jobLabel, setJobLabel] = useState(punch ? [punch.jobNumber, punch.jobName].filter(Boolean).join(" ") : "");
  const [jobQuery, setJobQuery] = useState("");
  const [jobHits, setJobHits] = useState({ query: "", rows: [] });
  const [punchType, setPunchType] = useState(punch?.punchType || "clock_in");
  const [date, setDate] = useState(pacificDate(punch?.punchTimeIso) || punch?.storedPunchDate || defaultDate);
  const [time, setTime] = useState(pacificTimeValue(punch?.punchTimeIso) || "08:00");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const jobSearch = jobQuery.trim();
  const visibleJobs = jobHits.query === jobSearch && jobSearch.length >= 2 ? jobHits.rows : [];

  useEffect(() => {
    if (jobSearch.length < 2) return undefined;
    let cancelled = false;
    const timer = setTimeout(() => {
      searchTimeClockJobs(jobSearch)
        .then((hits) => {
          if (!cancelled) setJobHits({ query: jobSearch, rows: hits });
        })
        .catch(() => {
          if (!cancelled) setJobHits({ query: jobSearch, rows: [] });
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [jobSearch]);

  function chooseJob(hit) {
    const number = hit.display_job_number || (hit.job_number == null ? "" : String(hit.job_number));
    const name = cleanJobName(number, hit.job_name);
    setJobId(String(hit.id));
    setJobLabel([number, name].filter(Boolean).join(" "));
    setJobQuery("");
  }

  async function submit(action) {
    if (!reason.trim()) {
      setMessage("A reason is required.");
      return;
    }
    if (action !== "void" && (!employeeId || !jobId || !date || !time || !punchType)) {
      setMessage("Employee, job, punch, date, and time are required.");
      return;
    }
    const stamp = action === "void" ? null : pacificLocalToIso(date, time);
    if (action !== "void" && !stamp) {
      setMessage("Enter a real date and time.");
      return;
    }
    if (!timeClockWritesAvailable()) {
      setMessage(TIME_CLOCK_WRITES_REASON);
      return;
    }
    const { error } = await applyTimePunchCorrection({
      p_action: action,
      p_punch_id: action === "add" ? null : punch?.id,
      p_employee_id: action === "void" ? punch?.employeeId : employeeId,
      p_job_id: action === "void" ? Number(punch?.jobId) : Number(jobId),
      p_punch_type: action === "void" ? punch?.punchType : punchType,
      p_punch_time: action === "void" ? punch?.punchTimeIso : stamp,
      p_punch_date: action === "void" ? punch?.storedPunchDate : date,
      p_reason: reason.trim(),
      p_expected_employee_id: punch?.employeeId || null,
      p_expected_job_id: punch?.jobId ? Number(punch.jobId) : null,
      p_expected_punch_type: punch?.punchType || null,
      p_expected_punch_time: punch?.punchTimeIso || null,
      p_expected_punch_date: punch?.storedPunchDate || null,
    });
    if (error) {
      setMessage(error.message || "The punch was not saved.");
      return;
    }
    await onSaved();
  }

  return (
    <section style={{ marginTop: 16, padding: "12px 14px", borderRadius: 10, background: C.linenCard, border: `1px solid ${C.borderStrong}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
        <div style={{ fontFamily: F.display, fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", color: C.textHead }}>
          {mode === "edit" ? "Edit punch" : "Add punch"}
        </div>
        <button type="button" onClick={onClose} style={quietButton}>Close</button>
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        <label style={{ display: "flex", flexDirection: "column" }}>
          <span style={FILTER_LABEL}>Employee</span>
          <select aria-label="Editor employee" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} style={{ ...FILTER_INPUT, width: 200 }}>
            <option value="">Select</option>
            {employees.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column" }}>
          <span style={FILTER_LABEL}>Job</span>
          <input
            aria-label="Job search"
            value={jobQuery}
            placeholder={jobLabel || "Search job"}
            onChange={(e) => setJobQuery(e.target.value)}
            style={{ ...FILTER_INPUT, width: 220 }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column" }}>
          <span style={FILTER_LABEL}>Punch</span>
          <select aria-label="Punch type" value={punchType} onChange={(e) => setPunchType(e.target.value)} style={{ ...FILTER_INPUT, width: 150 }}>
            {PUNCH_TYPES.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column" }}>
          <span style={FILTER_LABEL}>Date</span>
          <input aria-label="Punch date" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...FILTER_INPUT, width: 150 }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column" }}>
          <span style={FILTER_LABEL}>Time</span>
          <input aria-label="Punch time" type="time" value={time} onChange={(e) => setTime(e.target.value)} style={{ ...FILTER_INPUT, width: 130 }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", minWidth: 220, flex: 1 }}>
          <span style={FILTER_LABEL}>Reason</span>
          <input aria-label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} style={{ ...FILTER_INPUT, width: "100%" }} />
        </label>
      </div>
      {visibleJobs.length > 0 ? (
        <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {visibleJobs.map((hit) => {
            const number = hit.display_job_number || (hit.job_number == null ? "" : String(hit.job_number));
            const name = cleanJobName(number, hit.job_name);
            return (
              <button key={hit.id} type="button" onClick={() => chooseJob(hit)} style={quietButton}>
                {[number, name].filter(Boolean).join(" ")}
              </button>
            );
          })}
        </div>
      ) : null}
      {jobLabel ? <div style={{ marginTop: 8, fontSize: 12.5, color: C.textFaint, fontFamily: F.ui }}>{jobLabel}</div> : null}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button type="button" onClick={() => submit(mode === "edit" ? "edit" : "add")} style={tealButton}>
          {mode === "edit" ? "Save punch" : "Save punch"}
        </button>
        {mode === "edit" ? (
          <button type="button" onClick={() => submit("void")} style={quietButton}>Void punch</button>
        ) : null}
      </div>
      {message ? <div style={{ marginTop: 8, fontSize: 13, color: C.red, fontFamily: F.body }}>{message}</div> : null}
    </section>
  );
}

const tealButton = {
  padding: "7px 12px",
  borderRadius: 7,
  border: "none",
  background: C.teal,
  color: C.dark,
  fontFamily: F.ui,
  fontSize: 12.5,
  fontWeight: 700,
  cursor: "pointer",
};
const quietButton = {
  padding: "4px 8px",
  borderRadius: 6,
  border: `1px solid ${C.dark}`,
  background: C.linenDeep,
  color: C.dark,
  fontFamily: F.ui,
  fontSize: 11.5,
  fontWeight: 700,
  cursor: "pointer",
};
const selectedButton = {
  ...quietButton,
  background: C.dark,
  color: C.teal,
};
