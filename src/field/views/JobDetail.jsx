import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { C } from "../../lib/tokens";
import Btn from "../../components/Btn";
import FieldScreen, { EmptyNote, ErrorNote, RefreshBtn } from "../components/FieldScreen";
import { useAsync } from "../lib/useAsync";
import { fetchMaterialChecksForCallLog } from "../lib/queries";
import { loadJobWithWTCs } from "../../schedule/lib/queries";
import LoadOutModal from "../../schedule/components/LoadOutModal";
import PRTModal from "../../schedule/components/PRTModal";

function jobTitle(job) {
  const num = job.job_num || "";
  const name = job.job_name || "";
  const numPart = num ? `#${num}` : "—";
  const namePart = name && !String(num).endsWith(name) ? ` ${name}` : "";
  return `${numPart}${namePart}`;
}

async function loadJobDetail(jobId) {
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

export default function JobDetail() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync(() => loadJobDetail(jobId), [jobId]);
  const [openJob, setOpenJob] = useState(null);
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState(null);

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

  const back = (
    <div style={{ display: "flex", gap: 8 }}>
      <Btn v="dark" sz="sm" onClick={() => navigate("/field/jobs")}>Back</Btn>
      <RefreshBtn onClick={reload} loading={loading} />
    </div>
  );

  if (!data) {
    return (
      <FieldScreen title="Job" right={back}>
        {error ? <ErrorNote>{error}</ErrorNote> : <EmptyNote>{loading ? "Loading…" : "Job not found."}</EmptyNote>}
      </FieldScreen>
    );
  }

  const job = data.job;
  const callLogId = job.call_log_id;

  return (
    <FieldScreen title={jobTitle(job)} right={back}>
      {callLogId ? (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <Btn v="dark" sz="sm" onClick={() => navigate(`/field/dailylogs?job=${callLogId}`)}>Daily Logs</Btn>
          <Btn v="dark" sz="sm" onClick={() => navigate(`/field/timeclock?job=${callLogId}`)}>Time Clock</Btn>
        </div>
      ) : null}

      <div className="schedule-root" style={{ marginBottom: 16 }}>
        <PRTModal job={job} embedded />
      </div>

      <div style={cardStyle}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: C.textHead }}>Load-Out</div>
          <div style={{ fontSize: 12, color: C.textFaint, marginTop: 4 }}>
            {`${data.loaded || 0} of ${data.total || 0} loaded`}
          </div>
        </div>
        <Btn v="teal" sz="sm" onClick={() => openLoadOut(job.job_id)} disabled={opening}>
          {opening ? "…" : "Load-out"}
        </Btn>
      </div>
      {openError ? <ErrorNote>{openError}</ErrorNote> : null}

      {openJob && (
        <div className="schedule-root">
          <LoadOutModal job={openJob} onClose={() => setOpenJob(null)} />
        </div>
      )}
    </FieldScreen>
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
};
