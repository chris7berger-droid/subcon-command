import { getJobStatus } from "../../schedule/lib/jobStatus.js";
import { buildJobTrips, tripPeriod } from "../../schedule/lib/trips.js";

// A Field view of Schedule rows, never a second lifecycle. Saved trip UUIDs
// establish crew ownership, using the same projection as the Crew board.
export function buildFieldJobs(jobs, mobilizations, assignments, today) {
  const tripsByJob = new Map();
  const crewByJob = new Map();
  for (const trip of mobilizations) {
    const key = String(trip.job_id);
    if (!tripsByJob.has(key)) tripsByJob.set(key, []);
    tripsByJob.get(key).push(trip);
  }
  for (const assignment of assignments) {
    const key = String(assignment.job_id);
    if (!crewByJob.has(key)) crewByJob.set(key, []);
    crewByJob.get(key).push(assignment);
  }

  return jobs.map(job => {
    const saved = tripsByJob.get(String(job.job_id)) || [];
    const crew = crewByJob.get(String(job.job_id)) || [];
    const projected = buildJobTrips(saved, crew, job).filter(t => !t.legacy);
    // Parent dates are a fallback only when no saved trip has dates. They never
    // bridge a gap between trips or override a dated saved trip.
    const dated = projected.filter(t => t.start_date || t.end_date);
    const parent = !dated.length ? buildJobTrips([], [], job).filter(t => t.parent) : [];
    const contexts = (dated.length ? projected : parent.length ? parent : projected)
      .map(t => ({ ...t, period: tripPeriod(t, today) }));
    const current = contexts.filter(t => t.period === "current");
    const upcoming = contexts.filter(t => t.period === "upcoming")
      .sort((a, b) => a.start_date.localeCompare(b.start_date));
    const undated = contexts.filter(t => t.period === "undated");
    const past = contexts.filter(t => t.period === "past")
      .sort((a, b) => b.end_date.localeCompare(a.end_date));
    const selected = current.length ? current
      : upcoming.length ? upcoming.filter(t => t.start_date === upcoming[0].start_date)
        : undated.length ? undated : past.slice(0, 1);
    const period = selected[0]?.period || "undated";
    const scoped = ["current", "upcoming"].includes(period) &&
      selected.every(t => t.start_date && t.end_date && t.end_date >= t.start_date);
    const names = new Set();
    if (scoped) {
      for (const trip of selected) {
        // A parent-date fallback is explicitly job-scoped, not a guessed trip.
        // Unknown trip links must not be represented as verified staffing.
        const rows = trip.parent ? crew.filter(a => !a.mobilization_id || saved.some(t => t.id === a.mobilization_id)) : trip.assignments;
        const from = trip.start_date < today ? today : trip.start_date;
        for (const a of rows) {
          if (a.crew_name && a.date >= from && a.date <= trip.end_date) names.add(a.crew_name);
        }
      }
    }
    return {
      jobPk: job.job_id,
      callLogId: job.call_log_id,
      jobNum: job.job_num,
      jobName: job.job_name,
      stage: getJobStatus(job),
      contexts: selected,
      otherTripCount: Math.max(0, contexts.length - selected.length),
      period,
      crewCount: scoped ? names.size : null,
      crewNames: [...names].sort(),
    };
  }).sort((a, b) => {
    const order = { current: 0, upcoming: 1, undated: 2, past: 3 };
    return order[a.period] - order[b.period] ||
      String(a.contexts[0]?.start_date || "").localeCompare(String(b.contexts[0]?.start_date || "")) ||
      String(a.jobPk).localeCompare(String(b.jobPk));
  });
}
