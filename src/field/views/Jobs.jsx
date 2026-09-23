import { useState } from "react";
import { C } from "../../lib/tokens";
import { tripRange } from "../../schedule/lib/trips.js";
import FieldScreen, {
  StatStrip,
  FilterChips,
  StatusChip,
  ErrorNote,
  PlainTable,
  RefreshBtn,
} from "../components/FieldScreen";
import { useAsync } from "../lib/useAsync";
import { fetchFieldJobs } from "../lib/queries";
import { prettyStage, stageTone } from "../lib/display";

function isLiveStage(stage) {
  const s = String(stage || "").toLowerCase();
  return s === "in progress" || s === "in_progress" || s === "mobilized" || s === "ongoing";
}
function isScheduled(stage) {
  return String(stage || "").toLowerCase() === "scheduled";
}

export default function Jobs() {
  const { data: rows, loading, error, reload } = useAsync(fetchFieldJobs, []);
  const [chip, setChip] = useState("all");
  const list = rows || [];
  const live = list.filter((j) => isLiveStage(j.stage) && j.period === "current" && j.crewCount > 0);
  const scheduled = list.filter((j) => isScheduled(j.stage));
  const noCrew = list.filter((j) => j.stage !== "Complete" && j.crewCount === 0);
  const shown =
    chip === "live" ? live : chip === "scheduled" ? scheduled : chip === "none" ? noCrew : list;

  return (
    <FieldScreen
      title="Jobs"
      subtitle="Schedule jobs, with crew for the current or next trip."
      right={<RefreshBtn onClick={reload} loading={loading} />}
    >
      <StatStrip
        items={[
          { label: "Live", value: live.length, tone: "teal" },
          { label: "Scheduled", value: scheduled.length, tone: "amber" },
          { label: "No crew", value: noCrew.length, tone: "red" },
        ]}
      />
      <FilterChips
        value={chip}
        onChange={setChip}
        options={[
          { id: "all", label: "All", count: list.length },
          { id: "live", label: "Live", count: live.length },
          { id: "scheduled", label: "Scheduled", count: scheduled.length },
          { id: "none", label: "No crew", count: noCrew.length },
        ]}
      />
      {error ? (
        <ErrorNote>{error}</ErrorNote>
      ) : (
        <PlainTable
          keyField="jobPk"
          rows={shown}
          empty={loading ? "Loading…" : "No jobs match this view."}
          columns={[
            {
              key: "job",
              label: "Job #",
              render: (r) => (
                <span>
                  {r.jobNum ? <b style={{ color: C.textHead }}>#{r.jobNum}</b> : "—"}
                  {r.jobName && !r.jobNum?.endsWith(r.jobName) ? ` ${r.jobName}` : ""}
                </span>
              ),
            },
            {
              key: "stage",
              label: "Status",
              render: (r) => <StatusChip tone={stageTone(r.stage)}>{prettyStage(r.stage)}</StatusChip>,
            },
            {
              key: "crew",
              label: "Crew",
              render: (r) => r.crewCount == null
                ? <span style={{ color: C.textFaint }}>{r.period === "past" ? "No current trip" : "Dates to set"}</span>
                : <div title={r.crewNames.join(", ")}>
                    {r.crewCount === 0 ? <StatusChip tone="red">None</StatusChip> : r.crewCount}
                    <div style={{ color: C.textFaint, fontSize: 11.5, marginTop: 4 }}>
                      {r.period === "current" ? "Today onward" : "Upcoming trip"}
                    </div>
                  </div>,
            },
            {
              key: "dates",
              label: "Dates",
              render: (r) => <div>
                {r.contexts.length ? r.contexts.map(t => <div key={t.key} style={{ marginBottom: 4 }}>
                  <div>{tripRange(t)}</div>
                  <div style={{ color: C.textFaint, fontSize: 11.5 }}>
                    {r.period === "past" ? "Past" : r.period === "current" ? "Current" : r.period === "upcoming" ? "Next" : "Undated"}
                    {t.label ? ` · ${t.label}` : " trip"}
                  </div>
                </div>) : "Dates to set"}
                {r.otherTripCount > 0 && <div style={{ color: C.textFaint, fontSize: 11.5 }}>
                  {r.otherTripCount} other trip{r.otherTripCount === 1 ? "" : "s"}
                </div>}
              </div>,
            },
          ]}
        />
      )}
    </FieldScreen>
  );
}
