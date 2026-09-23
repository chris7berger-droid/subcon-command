import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { C, F } from "../../lib/tokens";
import FieldScreen, { StatStrip, StatusChip, ErrorNote, PlainTable, RefreshBtn } from "../components/FieldScreen";
import { fetchTimeClockPunches } from "../lib/queries";
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

export default function TimeClock() {
  const today = useMemo(() => pacificToday(), []);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [jobId, setJobId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [customerId, setCustomerId] = useState("");
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
        error: err?.message || "Enter a valid date range.",
        loading: false,
        publishedRangeKey: null,
      });
      return;
    }
    const requestId = requests.current.start();
    setLoad((state) => reducePunchLoad(state, { type: "start", requestId, rangeKey: key }));
    try {
      const rows = await fetchTimeClockPunches(parsed);
      setLoad((state) => reducePunchLoad(state, { type: "success", requestId, rows }));
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
  const employeeOptions = useMemo(() => punchFilterOptions(rows, "employeeId", "employee"), [rows]);
  const jobOptions = useMemo(() => punchFilterOptions(rows, "jobId", "job"), [rows]);
  const customerOptions = useMemo(() => punchFilterOptions(rows, "customerId", "customer"), [rows]);
  const selectedEmployeeId = employeeOptions.some((option) => option.id === employeeId) ? employeeId : "";
  const selectedJobId = jobOptions.some((option) => option.id === jobId) ? jobId : "";
  const selectedCustomerId = customerOptions.some((option) => option.id === customerId) ? customerId : "";
  const shown = useMemo(
    () => filterTimeClockRows(rows, { jobId: selectedJobId, employeeId: selectedEmployeeId, customerId: selectedCustomerId }),
    [rows, selectedJobId, selectedEmployeeId, selectedCustomerId]
  );
  const filtered = selectedJobId || selectedEmployeeId || selectedCustomerId;

  useEffect(() => {
    if (!published) return;
    if (employeeId && !selectedEmployeeId) setEmployeeId("");
    if (jobId && !selectedJobId) setJobId("");
    if (customerId && !selectedCustomerId) setCustomerId("");
  }, [published, employeeId, jobId, customerId, selectedEmployeeId, selectedJobId, selectedCustomerId]);

  return (
    <FieldScreen
      title="Time Clock"
      subtitle={
        published
          ? `Recorded punches · ${formatWorkDate(from)} – ${formatWorkDate(to)} · Pacific time`
          : "Recorded punches · Pacific time"
      }
      right={<RefreshBtn onClick={() => void loadRange(from, to)} loading={load.loading} />}
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
          <input
            type="date"
            value={from}
            aria-label="From"
            onChange={(e) => setFrom(e.target.value)}
            style={{ ...FILTER_INPUT, width: 150 }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column" }}>
          <span style={FILTER_LABEL}>To</span>
          <input
            type="date"
            value={to}
            aria-label="To"
            onChange={(e) => setTo(e.target.value)}
            style={{ ...FILTER_INPUT, width: 150 }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column" }}>
          <span style={FILTER_LABEL}>Employee</span>
          <select
            value={selectedEmployeeId}
            aria-label="Employee"
            onChange={(e) => setEmployeeId(e.target.value)}
            style={{ ...FILTER_INPUT, width: 200, cursor: "pointer" }}
          >
            <option value="">All employees</option>
            {employeeOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column" }}>
          <span style={FILTER_LABEL}>Job</span>
          <select
            value={selectedJobId}
            aria-label="Job"
            onChange={(e) => setJobId(e.target.value)}
            style={{ ...FILTER_INPUT, width: 240, cursor: "pointer" }}
          >
            <option value="">All jobs</option>
            {jobOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column" }}>
          <span style={FILTER_LABEL}>Customer</span>
          <select
            value={selectedCustomerId}
            aria-label="Customer"
            onChange={(e) => setCustomerId(e.target.value)}
            style={{ ...FILTER_INPUT, width: 220, cursor: "pointer" }}
          >
            <option value="">All customers</option>
            {customerOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <StatStrip
        items={[
          {
            label: "Punches",
            value: published ? shown.length : "—",
            hint: published && filtered ? `${rows.length} in range` : null,
            tone: "teal",
          },
        ]}
      />
      {load.rangeKey === activeKey && load.error ? (
        <ErrorNote>{load.error}</ErrorNote>
      ) : (
        <PlainTable
          rows={shown}
          keyField="id"
          empty={published ? (filtered ? "No punches match these filters." : "No punches in this date range.") : "Loading punches…"}
          columns={[
            { key: "workDate", label: "Work date" },
            { key: "punchDate", label: "Punch date (Pacific)" },
            { key: "punchTime", label: "Punch time (Pacific)" },
            { key: "employee", label: "Employee" },
            { key: "job", label: "Job" },
            { key: "customer", label: "Customer" },
            {
              key: "punchType",
              label: "Punch",
              render: (row) => <StatusChip tone={punchTypeTone(row.punchType)}>{punchTypeLabel(row.punchType)}</StatusChip>,
            },
            {
              key: "hoursRegular",
              label: "Regular hours",
              align: "right",
              render: (row) => row.hoursRegular,
            },
            {
              key: "hoursOt",
              label: "OT hours",
              align: "right",
              render: (row) => row.hoursOt,
            },
          ]}
        />
      )}
    </FieldScreen>
  );
}
