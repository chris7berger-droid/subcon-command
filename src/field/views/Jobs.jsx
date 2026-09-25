import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import FieldScreen, { ErrorNote, RefreshBtn } from "../components/FieldScreen";
import FieldJobCard from "../components/FieldJobCard";
import { useAsync } from "../lib/useAsync";
import { fetchFieldJobs } from "../lib/queries";
import { effectiveEnd, effectiveStart, fmtD, getMonday } from "../../schedule/lib/queries";

const CAP = 25;
const DATE_ORDER = ["week", "month", "quarter", "all"];
const EMPTY_JOBS = [];

const FILTER_OPTIONS = [
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "quarter", label: "This Quarter" },
  { key: "all", label: "All Time" },
];

const STAGE_OPTIONS = [
  { key: "all", label: "All" },
  { key: "Scheduled", label: "Scheduled" },
  { key: "In Progress", label: "In Progress" },
  { key: "On Hold", label: "On Hold" },
  { key: "Complete", label: "Complete" },
  { key: "Ongoing", label: "Ongoing" },
];

function rangeForKey(key, now) {
  switch (key) {
    case "week": {
      const mon = getMonday(now);
      const fri = new Date(mon);
      fri.setDate(fri.getDate() + 4);
      return { from: fmtD(mon), to: fmtD(fri) };
    }
    case "month": {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { from: fmtD(first), to: fmtD(last) };
    }
    case "quarter": {
      const q = Math.floor(now.getMonth() / 3) * 3;
      const first = new Date(now.getFullYear(), q, 1);
      const last = new Date(now.getFullYear(), q + 3, 0);
      return { from: fmtD(first), to: fmtD(last) };
    }
    default:
      return null;
  }
}

function jobInRange(j, range) {
  if (!range) return true;
  const start = effectiveStart(j);
  const end = effectiveEnd(j);
  if (!start && !end) return true;
  return (start || "1900-01-01") <= range.to && (end || "2999-12-31") >= range.from;
}

function matchesSearch(j, q) {
  if (!q) return true;
  return (j.job_num || "").toLowerCase().includes(q) ||
    (j.job_name || "").toLowerCase().includes(q) ||
    (j.work_type || "").toLowerCase().includes(q);
}

export default function Jobs() {
  const [searchParams] = useSearchParams();
  const rawJob = searchParams.get("job");
  const focusJobId = rawJob && rawJob.trim() ? rawJob.trim() : null;
  const { data: rows, loading, error, reload } = useAsync(fetchFieldJobs, []);
  const jobs = rows || EMPTY_JOBS;
  const today = useMemo(() => new Date(), []);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState(focusJobId ? "all" : "month");
  const [stageFilter, setStageFilter] = useState("all");
  const [manualDate, setManualDate] = useState(!!focusJobId);
  const [seenFocus, setSeenFocus] = useState(focusJobId);
  if (seenFocus !== focusJobId) {
    setSeenFocus(focusJobId);
    if (focusJobId) {
      setSearch("");
      setStageFilter("all");
      setDateFilter("all");
      setManualDate(true);
    }
  }

  const q = search.toLowerCase().trim();

  const stageSearched = useMemo(() => {
    return jobs.filter((j) => {
      if (!matchesSearch(j, q)) return false;
      if (stageFilter !== "all" && j.stage !== stageFilter) return false;
      return true;
    });
  }, [jobs, q, stageFilter]);

  const effectiveDate = useMemo(() => {
    if (manualDate) return dateFilter;
    if (stageSearched.length === 0) return dateFilter;
    const now = new Date();
    if (stageSearched.some((j) => jobInRange(j, rangeForKey(dateFilter, now)))) return dateFilter;
    return DATE_ORDER.find((k) => stageSearched.some((j) => jobInRange(j, rangeForKey(k, now)))) || "all";
  }, [manualDate, dateFilter, stageSearched]);

  const filtered = useMemo(() => {
    const range = rangeForKey(effectiveDate, new Date());
    return stageSearched
      .filter((j) => jobInRange(j, range))
      .sort((a, b) => {
        const sa = effectiveStart(a);
        const sb = effectiveStart(b);
        if (!sa && !sb) return 0;
        if (!sa) return 1;
        if (!sb) return -1;
        return sa.localeCompare(sb);
      });
  }, [stageSearched, effectiveDate]);

  let shown = filtered.slice(0, CAP);
  if (focusJobId) {
    const target = jobs.find((j) => String(j.job_id) === String(focusJobId));
    if (target) shown = [target, ...shown.filter((j) => String(j.job_id) !== String(focusJobId))];
  }
  const n = filtered.length;
  const stageLabel = STAGE_OPTIONS.find((s) => s.key === stageFilter)?.label || "All";

  return (
    <FieldScreen
      title="Jobs"
      subtitle="Schedule jobs, with crew for the current or next trip."
      right={<RefreshBtn onClick={reload} loading={loading} />}
    >
      {error ? <ErrorNote>{error}</ErrorNote> : null}
      <div className="schedule-root">
        <div className="jtp-toolbar">
          <div className="jtp-toolbar-left">
            <input
              className="jtp-search"
              type="text"
              placeholder="Search jobs by name, number, or work type…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setManualDate(false); }}
            />
            <div className="jtp-chips">
              {FILTER_OPTIONS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  className={`jtp-chip${effectiveDate === f.key ? " active" : ""}`}
                  onClick={() => { setManualDate(true); setDateFilter(f.key); }}
                >{f.label}</button>
              ))}
            </div>
          </div>
          <div className="jtp-toolbar-right">
            <span className="jtp-count">Showing {Math.min(CAP, n)} of {n} jobs</span>
            <select className="jtp-stage-select" value={stageFilter} aria-label="Status" onChange={(e) => { setStageFilter(e.target.value); setManualDate(false); }}>
              {STAGE_OPTIONS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <span className="jtp-viewing">Viewing {stageLabel}</span>
          </div>
        </div>

        <div className="jtp-list">
          {!error && shown.length === 0 && (
            <div className="jtp-empty">{loading ? "Loading…" : "No jobs match the current filters."}</div>
          )}
          {shown.map((j) => (
            <FieldJobCard
              key={j.jobPk}
              row={j}
              today={today}
              autoOpen={focusJobId != null && String(j.job_id) === String(focusJobId)}
            />
          ))}
        </div>
      </div>
    </FieldScreen>
  );
}
