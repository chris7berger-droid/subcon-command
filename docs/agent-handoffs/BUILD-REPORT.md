## Status

Mobile web preview (F65) — T3 build complete on `feat/mobile-web-preview`, **not pushed**. T4 Build vs Plan, T5 Code Review and T6 Security Review are pending; Smoke Test and the Vercel preview follow them. **Do not merge.**

    Role:        T3 Build · mode: build (initial) · agent/session t3-mobile-finish / 59b45299-39fb-407c-b796-c5c77532256b
                 (continues builder session 0dd426b3-d40d-4c3a-97af-393dc105f6f3, which wrote most of the source)
    Plan:        docs/plans/mobile_web_preview.md @ 87e820f · gates: T2 CONVERGED recorded in docs/AUDIT_LOG.md `## Gate records` @ a4b831b
                 · plan diff 87e820f → working tree is inside `## Audit manifest` only
                 · T1: no personal lock exists; build authorised by Chris directly (plan §A)
    Branch:      feat/mobile-web-preview · base a4b831b · this commit
    Outcome:     bar met within planned scope (build self-check; not the Smoke gate)
    Completion:  code built yes · data applied n.a. (none) · access verified no (not exercised) · Chris accepted: not T3's to claim
    Push:        not pushed
    Next:        T7

## Summary

At ≤768px the sidebar leaves the layout and becomes a drawer opened from a menu button in the header. The sales phone flow (both homes, Call Log list and detail, New Inquiry, Login) and the sales read lists (Leads, Proposals, Invoices, Customers, Customer detail) fit phone widths. ≥769px and print are unchanged in source: every new rule sits in a `@media screen` query at ≤768px or ≤600px, and the desktop markup changes are attributes and class names only.

No data fetching, backend call, auth, guard, route, validation, save handler, calculation, table column or row action changed.

## What changed

- **Shell (P0)** — `src/App.jsx`, `src/components/AppSidebar.jsx`: one `matchMedia` listener at 768px and one drawer boolean, independent of the desktop sidebar state. The drawer closes on a destination (including the current one), the Directory, the scrim, Escape and its close control. While closed it is `inert`. Focus moves in on open and back to the menu button on close. The desktop Collapse control is hidden in drawer mode.
- **Layers** — while the drawer is open, the content column becomes one layer under the scrim, so an embedded sticky header (AR's top bar is z 100) cannot cover the drawer. An open `aria-modal` dialog lifts that, so modals stay above the drawer. The Directory sits outside the column at z 200.
- **Dialog semantics** — `role="dialog" aria-modal="true"` and a name on the existing containers of New Inquiry, the Directory, Log Outcome, the job-list modal and the Hunt results modal. Attributes only.
- **New Inquiry (P1)** — dialog inside the viewport; Back/Next/Save pinned at the bottom; the title row is sticky so Close stays on screen while a tall step scrolls. The customer picker's search box (rendered on `<body>` by `SearchSelect`) is 16px while the wizard is open.
- **P1/P2 screens** — class hooks plus scoped rules in `src/styles/mobile-shell.css`: one-column field grids, wrapping header actions and KPI rows, 16px text entry and 36px buttons on P1 screens and Login, scrollable table frames on Customer detail, wrapping status tabs on Proposals.
- **QA scripts** — `scripts/check-mobile-preview.mjs`, `scripts/mobile-preview-fixtures.mjs` (written and run by the coordinator). Playwright is loaded from an existing local runtime via `PLAYWRIGHT_MODULE`; no dependency or `package.json` change.

P2 deferrals: none. No screen needed a no-touch file.

## Evidence

All browser checks are the coordinator's synthetic self-check runs against the local dev server with fixture data: backend default-deny, service workers blocked, WebSockets mocked. They are **not** the Smoke gate, a review or a hosted walk. Result files and screenshots stay in the task's local `qa/` directory and are not committed.

| Run | Checks | Result |
|---|---|---|
| `qa/mobile-final` — widths 360, 390, 430, 640, 768 | 126 | all passed · 0 page errors · 0 attempted writes |
| `qa/mobile-tall-step` — 360 | 20 | all passed · 0 page errors · 0 attempted writes |
| `qa/wizard-matrix` — earlier separate wizard run, 5 widths | 66 | all passed · 0 page errors · 0 attempted writes |

- `mobile-final` covers: P1/P2 layout and table headers, all three Customer detail table tabs, drawer close modes / focus / draft preservation, Call Log pipeline count, search and View opening the selected job, the ten standard wizard steps and the Change Order path (stopping before Save), the Manager route and the Sales Settings guard, Login at 360, and desktop sidebar 228/56 preservation after a resize.
- It also loads 28 smoke-only routes at 390 and 768 (all 11 Schedule, 6 Field, 6 AR, Proposal and Invoice detail, Team, Archive, Settings) and leaves each through the drawer, AR included. Those routes load without error; nothing is claimed about their inner workflows on a phone.
- `mobile-tall-step` covers, on both wizard paths at 360: three unsaved contact rows added, the tall step scrolled to its end, Close still visible, 44px and hit; the customer picker search box at 16px; Enter advancing the step.
- Local checks by T3 after the last source change: `npm run build` passes; ESLint 176 errors / 43 warnings, equal to the pre-build baseline; `git diff --check` clean; zero diff under `src/schedule`, `src/field`, `src/ar` and the rest of the plan's no-touch list.

### Desktop at 1440 — exception to B1

B1 asks for zero pixel difference from base beyond base-vs-base. That bar is **not met literally**:

| Screens | Difference from base |
|---|---|
| 10 of 13 | exact |
| Call Log | 9 pixels, max channel difference 1 |
| Calendar | 127 pixels, max channel difference 1 |
| New Inquiry | 28 pixels, max channel difference 18 (base repeated against itself: 30 pixels, max 18) |

New Inquiry is inside base jitter. Call Log and Calendar are 136 pixels one level off with no geometry or content change observed; base-vs-base on those two was zero. Not polished further; the reviewer judges whether it is a practical desktop regression.

## Brand check

Sources, resolved through the registry `assets/brand/subcon-command/SUBCON_COMMAND_CURRENT.md` in the AIOS checkout (`/Users/chrisberger/aios`; the directory is untracked there, so no commit — sha256 `253e3637bdf6d87b…`):

- `source-docs/SUBCON_COMMAND_UI_STANDARD_LAUNCH.md` (sha256 `b9e80294646d1dd3…`), sections opened by this session: §1, §10 (Sidebar, Top bar, Inputs, Modals / drawers), §13, §14, §17, §18 acceptance checklist.
- Visual Brand Guide and "Locked Subcon Command identity mark": not opened by this session. The slice adds no theme, surface, typography, imagery, mark or icon.

Changed surfaces: header menu button, drawer and scrim, Directory panel width, wizard layout, P1/P2 spacing and wrapping.

- §1 — information architecture and interactions preserved: the drawer is the existing sidebar, same groups, items, order and gating.
- §10 Modals / drawers — the drawer keeps the sidebar's existing espresso surface; the scrim reuses the wizard overlay's existing `rgba(28,24,20,0.65)`. No pure black slab.
- §13 — drawer transition 200ms `cubic-bezier(.2,.8,.2,1)`, inside the 120–240ms range, off under `prefers-reduced-motion`. No looping motion.
- Plan Beat 9 — no new color, font or radius; no logo or mark asset added. `.sc-calllog` is not extended to other routes; outside `/sales/calllog` new chrome uses the legacy palette those screens already carry.
- Sizes — 44px drawer and wizard controls, 36px buttons, 16px text entry. The standard states 36–44px for desktop only; the phone values are the plan's Beat 6.

Deviations:

1. **Focus ring is not cyan outside the Call Log route.** §14 says "Maintain visible keyboard focus using cyan". The menu button and drawer buttons use a 2px `currentColor` outline. On `/sales/calllog` the route theme makes it cyan; elsewhere it is the control's text color. Reason: Beat 9 forbids new colors on routes still on the legacy palette.
2. **Legacy palette outside `/sales/calllog`** (teal accent, pre-standard surfaces) is carried, not introduced: re-theming is out of scope (plan §4).

Not performed:

- **Phone-width comparison against a brand reference** — none exists; the canonical Crew Schedule image is a 1672×941 desktop composition (plan §0.7).
- **Canonical image comparison at desktop** — not run by this session; desktop rendering is unchanged apart from the pixel exception above.
- **WCAG contrast measurement** of the new controls.

## Scope boundaries

- No push, merge, release, migration, schema, RLS, auth, edge-function or environment change. `package.json`, `vite.config.js`, `vercel.json` untouched.
- No real sign-in, credential, cookie or backend request by any agent. Authenticated access to real records is unchanged, not re-verified.
- The Vercel preview shares the production database. A look on a phone should be read-only (plan §5, "What a pass does not prove").
- Not proven by emulated Chrome: iPhone Safari and Android Chrome toolbars, on-screen keyboard, safe areas, focus zoom. That is Chris's look on a real phone.
- A desktop window under 769px gets the drawer layout. Only 360, 390, 430, 768 and 1440 (plus 640 for the wizard) were checked.
- Schedule, Field web, AR, Proposal and Invoice detail, WTC, Settings, Team, History Locker and Import are reachable at full width and otherwise unchanged; several will scroll sideways or clip (plan §4).
- `:has()` carries the drawer layer rule and the picker rule; the repo already relies on it (`schedule/App.css`).

## Remaining

T4 → T5 → T6 on this commit · Smoke Test (plan §5 A–F) on the reviewed commit · coordinator push and Vercel preview (G1–G4), SHA and URL to be added by the coordinator · Chris's acceptance.
