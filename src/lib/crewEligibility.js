/**
 * Team → Crew Schedule eligibility.
 *
 * Team is the source of truth for WHO. A linked crew row
 * (crew.team_member_id = team_members.id, archived = false) is WHO may
 * appear on Crew Scheduler. This module plans and applies that link.
 * It never writes assignments, never sends invites, never creates
 * placeholder team_members.
 */
import { tod } from "./utils.js";

export function defaultCrewScheduleEligibility(role) {
  return role === "Field";
}

export function inviteNeedsEmail(sendInvite, email) {
  return Boolean(sendInvite) && !String(email || "").trim();
}

export const EMAIL_FORMAT_ERROR = "Requires a valid email address.";

export function isValidEmailFormat(email) {
  const value = String(email || "").trim();
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function teamEmailBlockReason(sendInvite, email, { fieldApp = false } = {}) {
  if (inviteNeedsEmail(sendInvite, email)) {
    return fieldApp
      ? "Email is required before inviting someone with Field app access."
      : "Email is required to send an invite.";
  }
  if (!isValidEmailFormat(email)) return EMAIL_FORMAT_ERROR;
  return null;
}

export function normalizePersonName(name) {
  return String(name || "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function flipPersonName(name) {
  const raw = String(name || "").trim();
  if (!raw) return "";
  const parts = raw.split(",");
  if (parts.length !== 2) return raw;
  const last = parts[0].trim();
  const first = parts[1].trim();
  if (!last || !first) return raw;
  return `${first} ${last}`;
}

export function nameKeys(name) {
  const exact = normalizePersonName(name);
  const flipped = normalizePersonName(flipPersonName(name));
  return new Set([exact, flipped].filter(Boolean));
}

export function namesMatchSafely(a, b) {
  if (!normalizePersonName(a) || !normalizePersonName(b)) return false;
  const kb = nameKeys(b);
  for (const key of nameKeys(a)) {
    if (kb.has(key)) return true;
  }
  return false;
}

export function findSafeUnlinkedMatches(teamName, crewRows) {
  return (crewRows || []).filter(
    (row) => !row.team_member_id && namesMatchSafely(teamName, row.name),
  );
}

function otherNameConflicts(crewRows, desiredName, { ignoreName, ignoreTeamMemberId } = {}) {
  return (crewRows || []).filter((row) => {
    if (ignoreName && row.name === ignoreName) return false;
    if (ignoreTeamMemberId && row.team_member_id === ignoreTeamMemberId) return false;
    return namesMatchSafely(row.name, desiredName);
  });
}

function linkedRowsFor(crewRows, teamMemberId) {
  if (!teamMemberId) return [];
  return (crewRows || []).filter((row) => row.team_member_id === teamMemberId);
}

/**
 * Decide how to reconcile a Team member with crew. Pure — no I/O.
 */
export function planCrewEligibility({
  available,
  teamMemberId,
  teamName,
  teamPhone,
  crewRows,
} = {}) {
  const name = String(teamName || "").trim();
  const phone = String(teamPhone || "").trim() || null;
  if (!name) {
    return { ok: false, code: "name_required", error: "Name is required." };
  }

  const linked = linkedRowsFor(crewRows, teamMemberId);
  if (linked.length > 1) {
    return {
      ok: false,
      code: "duplicate_link",
      error: "This team member is linked to more than one crew row. Fix that before saving.",
    };
  }
  const linkedRow = linked[0] || null;

  const renameConflict = (fromName) => {
    const conflicts = otherNameConflicts(crewRows, name, {
      ignoreName: fromName,
      ignoreTeamMemberId: teamMemberId,
    });
    if (conflicts.length === 0) return null;
    if (conflicts.length > 1 && conflicts.every((row) => !row.team_member_id)) {
      return {
        ok: false,
        code: "ambiguous",
        error: `More than one existing crew row looks like "${name}". Not linking automatically.`,
      };
    }
    return {
      ok: false,
      code: "conflict",
      error: `Crew name "${name}" is already used by a different person. Not linking or renaming.`,
    };
  };

  if (!available) {
    if (!linkedRow) return { ok: true, action: "noop" };
    const conflict = renameConflict(linkedRow.name);
    if (conflict) return conflict;
    return {
      ok: true,
      action: "archive",
      crewName: linkedRow.name,
      nextName: name,
      nextPhone: phone,
    };
  }

  if (linkedRow) {
    const conflict = renameConflict(linkedRow.name);
    if (conflict) return conflict;
    return {
      ok: true,
      action: "update",
      crewName: linkedRow.name,
      nextName: name,
      nextPhone: phone,
    };
  }

  const unlinkedMatches = findSafeUnlinkedMatches(name, crewRows);
  if (unlinkedMatches.length > 1) {
    return {
      ok: false,
      code: "ambiguous",
      error: `More than one existing crew row looks like "${name}". Not linking automatically.`,
    };
  }
  if (unlinkedMatches.length === 1) {
    return {
      ok: true,
      action: "link",
      crewName: unlinkedMatches[0].name,
      nextName: name,
      nextPhone: phone,
    };
  }

  const taken = otherNameConflicts(crewRows, name, { ignoreTeamMemberId: teamMemberId });
  if (taken.length > 0) {
    return {
      ok: false,
      code: "conflict",
      error: `Crew name "${name}" is already used by a different person. Not creating a duplicate.`,
    };
  }

  return {
    ok: true,
    action: "create",
    nextName: name,
    nextPhone: phone,
  };
}

export function crewPatchFromPlan(plan, { teamMemberId, archivedOn } = {}) {
  if (!plan?.ok || plan.action === "noop") return null;
  if (plan.action === "create") {
    return {
      insert: {
        name: plan.nextName,
        phone: plan.nextPhone,
        team: "Floater",
        archived: false,
        archived_on: null,
        team_member_id: teamMemberId,
      },
    };
  }
  const patch = {
    phone: plan.nextPhone,
    archived: plan.action === "archive",
    archived_on: plan.action === "archive" ? (archivedOn || tod()) : null,
    team_member_id: teamMemberId,
  };
  if (plan.nextName && plan.nextName !== plan.crewName) {
    patch.name = plan.nextName;
  }
  return { update: { matchName: plan.crewName, patch } };
}

/**
 * Apply a plan through a Supabase-shaped client. Crew table only.
 * Never touches assignments or crew_status (IDENT-1 CASCADE covers rename).
 */
export async function applyCrewEligibility(client, plan, { teamMemberId, tenantId } = {}) {
  if (!plan?.ok) {
    return { ok: false, error: plan?.error || "Crew eligibility plan failed.", wroteAssignments: false };
  }
  if (plan.action === "noop") {
    return { ok: true, action: "noop", wroteAssignments: false };
  }

  const ops = crewPatchFromPlan(plan, { teamMemberId });
  if (ops.insert) {
    const row = { ...ops.insert };
    if (tenantId) row.tenant_id = tenantId;
    const { error } = await client.from("crew").insert(row);
    if (error) return { ok: false, error: error.message, wroteAssignments: false };
    return { ok: true, action: "create", wroteAssignments: false };
  }

  const { error } = await client
    .from("crew")
    .update(ops.update.patch)
    .eq("name", ops.update.matchName);
  if (error) return { ok: false, error: error.message, wroteAssignments: false };
  return { ok: true, action: plan.action, wroteAssignments: false };
}
