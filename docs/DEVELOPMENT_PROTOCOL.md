# Development protocol

Canonical phase order for **feature work** in this repo. Detailed procedures stay in the docs they already live in. This file says what each phase is for, who may write, and what must be true before the next phase starts.

Locked order:

Planning → Plan Audit → Build → Build vs Plan → Code Review → Security Review → Smoke Test → Vercel Preview → Chris Acceptance → Merge/Closeout

Worked example of the split: `docs/handoffs/SC_Handoff_v152-original_planning_terminal.txt`, `SC_Handoff_v152-plan_audit_terminal.txt`, `SC_Handoff_v152-build_terminal.txt`, `SC_Handoff_v152-buildvsplan_terminal.txt`, `SC_Handoff_v152-codereview_terminal.txt`, `SC_Handoff_v152-security_terminal.txt`. Read them together. Do not collapse those lenses.

## RESULT-FIRST

Every phase leads with a recorded result: an artifact path or a verdict. Evidence comes after the verdict. A later phase reads that result. It does not treat the author's summary, a green local build, or a finished subtask as the result.

Completion claims follow `CLAUDE.md` Workflow Rule 10: separate code built, data applied, authenticated access verified, and Chris's acceptance. An unresolved case stays unresolved.

## Feature work

Feature work is a new or changed product behavior that has (or needs) a plan in `docs/plans/` or an approved `docs/agent-handoffs/ACTIVE.md`, or that the user named as a feature.

A single change already locked under `.cursor/rules/confirm-intent.mdc` stays on that rule: do only the named list, then preview, then stop. It does not restart Planning. If it changes the app, merge still follows `.cursor/rules/session-wrap.mdc`.

## How to know the current phase

Before any feature-work edit, name one line: `Phase: <name> — <which gate result is missing>`.

1. Read this file, `CLAUDE.md`, `docs/BACKLOG.md`, and the latest `docs/handoffs/SC_Handoff_v*.txt`.
2. Read the slice plan (`docs/plans/…` or `docs/agent-handoffs/ACTIVE.md`) and any v152-style handoff that names the slice.
3. Walk the locked order. The current phase is the **earliest phase whose gate result is not recorded**.
4. Do only that phase's writes.

Record each gate result where the next session can read it without the chat: the plan's audit manifest, `docs/agent-handoffs/BUILD-REPORT.md`, a `docs/handoffs/SC_Handoff_v*.txt`, or a `docs/AUDIT_LOG.md` row. Chat-only verdicts do not count.

## Independent reviews

Build, Build vs Plan, Code Review, and Security Review are four phases. One verdict does not satisfy another. The author of one of those four results does not write either of the other three for the same slice. Review phases are read-only on application code, migrations, and prod. Findings go back to Build. Reviewers do not apply them.

Bugbot during Merge/Closeout is the extra pass in `.cursor/rules/session-wrap.mdc`. It is not Code Review or Security Review.

## Phases

### Planning

- **Purpose.** Lock what is being built and why: problem, decisions, in/out of scope, acceptance. No implementation.
- **Read.** `CLAUDE.md`, `docs/BACKLOG.md`, latest handoff, the code the plan will cite. `CLAUDE_RLS.md` when the slice touches RLS, anon, public pages, or token-gated reads. `.cursor/rules/confirm-intent.mdc` until the words are locked.
- **Write.** The plan (`docs/plans/…` and/or `docs/agent-handoffs/ACTIVE.md`). No application code. No migrations.
- **Gate.** Chris has locked that plan (explicit lock, or an approved ACTIVE.md). Then Plan Audit.

### Plan Audit

- **Purpose.** Adversarial review of the plan document. Catch silent no-ops, wrong citations, and fixes that would violate the plan. Same role as `SC_Handoff_v152-plan_audit_terminal.txt`.
- **Read.** The plan, and the code it cites, to check the plan. `CLAUDE.md`. `CLAUDE_RLS.md` when the plan touches policy, anon, or public access.
- **Write.** Findings and plan-revision notes. May edit the plan's audit manifest and amendments. Read-only on source, migrations, and prod. Does not build.
- **Gate.** A recorded converged / build-ready verdict from a reviewer who did not write the plan, or findings returned to Planning. Do not build an unconverged plan. Do not lower the bar the v152 loop actually used.

### Build

- **Purpose.** Implement the converged plan. The plan defines what. The builder decides how, inside existing patterns.
- **Read.** The plan or approved `docs/agent-handoffs/ACTIVE.md`. `CLAUDE.md`. `CLAUDE_RLS.md` before any RLS, SQL, anon, or public-page change. `.claude/commands/build.md` when acting as the build terminal. `.cursor/rules/approved-handoff.mdc` when ACTIVE.md is the spec.
- **Write.** The implementation on the slice branch. Migrations, when required, are authored in `command-suite-db` as `CLAUDE.md` says. After implementation, `docs/agent-handoffs/BUILD-REPORT.md` as `approved-handoff.mdc` requires. Backlog updates per `CLAUDE.md`.
- **Gate.** The build result is committed on the slice branch and the builder stops. The builder does not write the Build vs Plan, Code Review, or Security Review verdict. `approved-handoff.mdc`'s "ready for Chris review" means this gate is met, not that later gates are skipped.

Inside this phase, an approved ACTIVE.md plus Chris's instruction to implement authorizes routine edits covered by that handoff (`approved-handoff.mdc`). `confirm-intent.mdc` still applies when intent is ambiguous, the change is outside the handoff, two product outcomes are possible, or a protected behavior would change.

### Build vs Plan

- **Purpose.** Read-only check that the build matches the plan. Same role as `SC_Handoff_v152-buildvsplan_terminal.txt`.
- **Read.** Plan, diff, and read-only probes the plan's gate needs.
- **Write.** A punch-list and a GO or NO-GO. No source edits, push, deploy, or mutating database calls.
- **Gate.** GO recorded by a reviewer who did not build the slice. Gaps return to Build.

### Code Review

- **Purpose.** Independent correctness and integrity review of the diff. Not spec-coverage (Build vs Plan) and not the security lens. Same role as `SC_Handoff_v152-codereview_terminal.txt`.
- **Read.** The diff. `CLAUDE.md` data-integrity and style rules. The plan's accept-list, so settled decisions are not re-opened.
- **Write.** Findings for triage. Nothing auto-applied. No source edits.
- **Gate.** Blockers return to Build and the review is repeated on the fix. Non-blockers are deferred in `docs/BACKLOG.md` or explicitly accepted. The reviewer is not the builder.

### Security Review

- **Purpose.** Independent security review of this change. Separate from Code Review. Same role as `SC_Handoff_v152-security_terminal.txt`.
- **Read / write.** Follow `.claude/commands/audit.md` for the mode. Feature slices use per-PR review unless Chris selects another mode. Follow `.claude/skills/security-audit/SKILL.md` for the spec hierarchy, severity rubric, `file:line` contract, and coverage. A clean pass states what was checked. Weekly full audit stays that skill's full workflow; this phase does not shorten it and does not replace it. `CLAUDE_RLS.md` applies to any policy, anon, or public-access finding. The 6-gate deploy pattern in `CLAUDE_RLS.md` still applies to RLS and auth changes.
- **Auditor limits from `/audit`.** Do not fix. Do not open a PR. Do not commit `docs/AUDIT_LOG.md` (the build terminal commits that row on its next pass). Drop any finding whose `file:line` you cannot verify.
- **Gate.** A recorded security verdict with coverage. Blockers return to Build. Pre-existing findings are filed on their own track, not folded into this slice.

### Smoke Test

- **Purpose.** Run the plan's acceptance checks on the built result, including any keystone the plan says warnings cannot see.
- **Read.** The plan's acceptance checks. The environment the plan names.
- **Write.** Pass/fail per check, in the slice handoff or `BUILD-REPORT.md`. No drive-by fixes. Failures return to Build.
- **Gate.** Required checks pass. A local build is not this gate (`CLAUDE.md` Workflow Rule 8).

### Vercel Preview

- **Purpose.** For an app slice (UI, layout, routing, client state, rendered data), walk the affected flow on a Ready Vercel preview.
- **Read.** `.cursor/rules/session-wrap.mdc` preview step. `CLAUDE.md` Workflow Rule 8. `.claude/commands/pre-ship.md` check 10.
- **Write.** Preview URL, Ready status, and the flow walked, in the handoff or `BUILD-REPORT.md`.
- **Gate.** Preview is Ready and the flow was walked. No preview: stop. Docs/rules-only slices skip this step, as `session-wrap.mdc` already says. Feature work does not use that skip.

### Chris Acceptance

- **Purpose.** Chris accepts the result he will live with.
- **Read.** Preview URL, smoke record, `BUILD-REPORT.md`. `.cursor/rules/approved-handoff.mdc` merge-safety section.
- **Write.** Nothing until he accepts. Do not merge.
- **Gate.** His explicit accept. An instruction to implement is not acceptance. Silence is not acceptance.

### Merge/Closeout

- **Purpose.** Land an accepted slice and leave the next session a clean tree.
- **Read / write.** Follow `.cursor/rules/session-wrap.mdc` in order. Run `.claude/commands/pre-ship.md` as the make-it-live checklist before push, edge deploy, or migration apply. That command reports; it does not push or deploy. His wrap / merge / go / done-for-now is the confirmation that checklist waits for. Then session-wrap performs the close-out. Do not merge an app slice without a Ready preview and his accept.
- **Gate.** The safe-to-close checklist in `session-wrap.mdc`.

## Existing rules this file does not replace

- `CLAUDE.md` — session start, backlog, style, data integrity, columns, commits, security.
- `CLAUDE_RLS.md` — RLS anti-pattern and deploy gates.
- `.claude/commands/build.md` — build-terminal orient and wait-for-pick.
- `.claude/commands/audit.md` and `.claude/skills/security-audit/SKILL.md` — audit modes, rubric, full audit. Not restated here.
- `.claude/commands/pre-ship.md` — pre-flight checklist before make-it-live.
- `.cursor/rules/confirm-intent.mdc` — lock the words before an unlocked product edit.
- `.cursor/rules/approved-handoff.mdc` — how to build from an approved ACTIVE.md. Not merge approval.
- `.cursor/rules/session-wrap.mdc` — close-out mechanics.
