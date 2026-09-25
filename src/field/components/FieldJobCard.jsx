import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { C } from "../../lib/tokens";
import Btn from "../../components/Btn";
import { getWtcChips } from "../../schedule/lib/jobCardLabel";
import { effectiveEnd, effectiveStart, loadJobWithWTCs } from "../../schedule/lib/queries";
import PRTModal from "../../schedule/components/PRTModal";
import LoadOutModal from "../../schedule/components/LoadOutModal";
import { ErrorNote } from "../components/FieldScreen";
import { fetchMaterialChecksForCallLog } from "../lib/queries";

function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysBetween(dateStr, refDate) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  const r = new Date(refDate);
  r.setHours(0, 0, 0, 0);
  return Math.ceil((d - r) / (1000 * 60 * 60 * 24));
}

function fmtMD(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = String(dateStr).slice(0, 10).split("-");
  if (!y || !m || !d) return null;
  return `${Number(m)}/${Number(d)}`;
}

function workTypeLabel(job) {
  const wtcs = job._wtcs || [];
  const chips = getWtcChips(wtcs);
  if (chips.length > 1) return `${chips.length} work types`;
  if (chips.length === 1) return wtcs[0]?.work_type_name || job.work_type || "—";
  return job.work_type || "—";
}

function badgeClass(status) {
  if (status === "Scheduled") return "staged";
  if (status === "In Progress" || status === "Ongoing") return "active";
  if (status === "On Hold") return "on-hold";
  if (status === "Complete") return "complete";
  return "active";
}

function timeSignal(job, today) {
  const startStr = effectiveStart(job);
  const dtk = startStr ? daysBetween(startStr, today) : null;
  if (job.stage === "In Progress") {
    const end = effectiveEnd(job);
    const totalDays = startStr && end ? daysBetween(end, new Date(startStr + "T00:00:00")) + 1 : null;
    const elapsed = startStr ? daysBetween(ymd(today), new Date(startStr + "T00:00:00")) : null;
    const dayNum = totalDays && elapsed != null ? Math.min(totalDays, Math.max(1, elapsed + 1)) : null;
    if (dayNum != null) return `day ${dayNum} of ${totalDays}`;
  }
  if (dtk == null) return null;
  if (dtk < 0) return `${Math.abs(dtk)}d overdue`;
  if (dtk === 0) return "today";
  return `in ${dtk}d`;
}

async function loadExpandedJob(jobId) {
  const { data, error } = await loadJobWithWTCs(jobId);
  if (!data) {
    if (error && error.code !== "PGRST116") throw new Error(error.message || "Could not load job");
    return null;
  }
  const counts = data.call_log_id
    ? await fetchMaterialChecksForCallLog(data.call_log_id)
    : { loaded: 0, total: 0 };
  return { job: data, loaded: counts.loaded, total: counts.total };
}

export default function FieldJobCard({ row, today = new Date(), autoOpen = false }) {
  const navigate = useNavigate();
  const cardRef = useRef(null);
  const [expanded, setExpanded] = useState(!!autoOpen);
  const [seenAuto, setSeenAuto] = useState(autoOpen);
  const [seenExpanded, setSeenExpanded] = useState(!!autoOpen);
  const [seenJob, setSeenJob] = useState(row.jobPk);
  const [detail, setDetail] = useState(null);
  const [loadedFor, setLoadedFor] = useState(null);
  const [detailError, setDetailError] = useState(null);
  const [openJob, setOpenJob] = useState(null);
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState(null);

  if (seenAuto !== autoOpen) {
    setSeenAuto(autoOpen);
    if (autoOpen) setExpanded(true);
  }
  if (seenJob !== row.jobPk) {
    setSeenJob(row.jobPk);
    setDetail(null);
    setLoadedFor(null);
    setDetailError(null);
    setOpenJob(null);
    setOpenError(null);
  }
  if (seenExpanded !== expanded) {
    setSeenExpanded(expanded);
    if (expanded) {
      setDetail(null);
      setLoadedFor(null);
      setDetailError(null);
    }
  }

  useLayoutEffect(() => {
    if (autoOpen && expanded && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "instant", block: "start" });
    }
  }, [autoOpen, expanded, row.jobPk]);

  useEffect(() => {
    if (!expanded) return undefined;
    const jobPk = row.jobPk;
    let alive = true;
    loadExpandedJob(jobPk)
      .then((next) => {
        if (!alive) return;
        setDetail(next);
        setDetailError(null);
        setLoadedFor(jobPk);
      })
      .catch((err) => {
        if (!alive) return;
        setDetail(null);
        setDetailError(err?.message || "Could not load job");
        setLoadedFor(jobPk);
      });
    return () => {
      alive = false;
    };
  }, [expanded, row.jobPk]);

  async function openLoadOut(jobPk) {
    setOpening(true);
    setOpenError(null);
    try {
      const { data: job, error: err } = await loadJobWithWTCs(jobPk);
      if (err || !job) throw err || new Error("Job not found");
      setOpenJob(job);
    } catch (e) {
      setOpenError(e?.message || "Could not open load-out");
    } finally {
      setOpening(false);
    }
  }

  const label = workTypeLabel(row);
  const loc = [row.jobsite_city, row.jobsite_state].filter(Boolean).join(", ") || "—";
  const startStr = effectiveStart(row);
  const signal = timeSignal(row, today);
  const crew = row.crewCount == null ? "—" : row.crewCount;

  if (!expanded) {
    return (
      <div
        className="jtp-row"
        onClick={() => setExpanded(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded(true);
          }
        }}
      >
        <span className={`jtp-badge jtp-badge-${badgeClass(row.stage)}`}>{row.stage}</span>
        <span className="jtp-jobname"><b>{row.job_num || "—"}</b> {row.job_name || ""}</span>
        <span className="jtp-cell jtp-customer">{row.customer_name || "—"}</span>
        <span className="jtp-pill">{label}</span>
        <span className="jtp-cell jtp-loc">{loc}</span>
        <span className="jtp-cell jtp-date">
          {startStr ? fmtMD(startStr) : "—"}
          {signal && <span className="jtp-time"> · {signal}</span>}
        </span>
        <span className="jtp-cell jtp-crew">{crew}</span>
      </div>
    );
  }

  const job = detail?.job;
  const callLogId = job?.call_log_id || row.callLogId;
  const detailLoading = loadedFor !== row.jobPk;

  return (
    <div
      ref={cardRef}
      className="sjc-card sjc-card-home-expanded"
      style={autoOpen ? { boxShadow: "0 0 0 3px #30cfac", borderRadius: 8 } : undefined}
    >
      <div className="sjc-header">
        <span className="sjc-header-title">{row.job_num || "—"} {row.job_name || ""}</span>
        <button className="jtp-collapse" type="button" onClick={() => setExpanded(false)} title="Collapse">Close ✕</button>
      </div>

      <div className="sjc-identity">
        <div className="sjc-id-bubble">
          <span className="sjc-id-label">JOB</span>
          <span className="sjc-id-value">{row.job_num || "—"} {row.job_name || ""}</span>
        </div>
        <div className="sjc-id-bubble">
          <span className="sjc-id-label">CUSTOMER</span>
          <span className="sjc-id-value">{row.customer_name || "—"}</span>
        </div>
        <div className="sjc-id-bubble">
          <span className="sjc-id-label">WORK TYPES</span>
          <span className="sjc-id-value">{label}</span>
        </div>
      </div>

      {detailError ? <ErrorNote>{detailError}</ErrorNote> : null}
      {detailLoading && !job ? <div className="jh-empty">Loading…</div> : null}
      {job ? (
        <div className="schedule-root">
          <PRTModal job={job} embedded />
        </div>
      ) : null}

      {callLogId ? (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "12px 0" }}>
          <Btn v="dark" sz="sm" onClick={() => navigate(`/field/dailylogs?job=${callLogId}`)}>Daily Logs</Btn>
          <Btn v="dark" sz="sm" onClick={() => navigate(`/field/timeclock?job=${callLogId}`)}>Time Clock</Btn>
        </div>
      ) : null}

      <div style={cardStyle}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: C.textHead }}>Load-Out</div>
          <div style={{ fontSize: 12, color: C.textFaint, marginTop: 4 }}>
            {`${detail?.loaded || 0} of ${detail?.total || 0} loaded`}
          </div>
        </div>
        <Btn v="teal" sz="sm" onClick={() => openLoadOut(row.jobPk)} disabled={opening || !job}>
          {opening ? "…" : "Load-out"}
        </Btn>
      </div>
      {openError ? <ErrorNote>{openError}</ErrorNote> : null}

      {openJob && (
        <div className="schedule-root">
          <LoadOutModal job={openJob} onClose={() => setOpenJob(null)} />
        </div>
      )}
    </div>
  );
}

const cardStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
  padding: "12px 16px",
  background: C.linenCard,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  marginTop: 12,
};
