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

Authority resolved through the registry `assets/brand/subcon-command/SUBCON_COMMAND_CURRENT.md` in the AIOS checkout `/Users/chrisberger/aios` (sha256 `253e3637bdf6d87b…`; the directory is untracked there, so there is no commit to cite). Both source documents govern. Read by this T3 session:

| Source | What was opened |
|---|---|
| `source-docs/SUBCON_COMMAND_UI_STANDARD_LAUNCH.md` (sha256 `b9e80294646d1dd3…`) | §1, §10 (Sidebar, Top bar, Inputs, Modals / drawers), §13, §14, §17, §18 acceptance checklist. Other sections were not opened by this session. |
| `source-docs/Subcon_Command_Visual_Brand_Guide.docx` (sha256 `9833d17f2ec88c0a…`), read through the registry's faithful copy `Subcon_Command_Visual_Brand_Guide.readable.txt` (sha256 `b3f05c6eb526f3f5…`, which records that same DOCX hash) | In full: 02 Color System, 03 Surfaces, 04 Typography / Geometry / Motion, 05 Component Language, 07 Guardrails, 08 Implementation, The Locked Identity Mark. The DOCX itself was not unpacked by this session. |
| `visual/crew-schedule-canonical.png` | Opened. A 1672×941 desktop composition: persistent espresso sidebar, cyan active item, warm linen work surface. |

Changed surfaces: header menu button, drawer and scrim, Directory panel width, wizard layout, P1/P2 spacing and wrapping.

Checked against those sections:

- **Structure** (Standard §1; Guide 08 "Non-negotiable instruction") — information architecture and interactions preserved. The drawer is the existing sidebar: same groups, items, order, gating and active marker.
- **Color** (Guide 02; Standard §18 checklist) — no color value is added. The menu button takes its border and glyph from the tokens the header already uses; the scrim reuses the wizard overlay's existing `rgba(28,24,20,0.65)`; the drawer keeps the sidebar's existing espresso surface. No white-dominant surface is introduced.
- **Typography** (Guide 04) — no font family, weight or type role is added or changed. The only size change is text-entry controls to 16px at ≤600px on P1 screens and Login (plan Beat 6); the guide's 13–15px body/data range is stated without a phone case.
- **Geometry and spacing** (Guide 04, "4 / 6 / 9 / 12 px radius scale") — no radius is changed on an existing element. The new menu button uses 7px, matching the existing sidebar buttons rather than the scale. Phone padding (16px page, 12px header) and the 44 / 36px control sizes come from plan Beats 3 and 6; neither document states a phone value.
- **Mark** (Guide "The Locked Identity Mark"; registry "Preserve the official logo/icon") — the existing mark and wordmark components render unchanged in the drawer. No mark asset is added, redrawn, traced or generated. The mission line stays in the sidebar footer.
- **Modals / drawers** (Standard §10; Guide 05) — the drawer is the existing dark sidebar surface over a dimmed page, not a pure black slab.
- **Motion** (Standard §13; Guide 04) — 200ms `cubic-bezier(.2,.8,.2,1)`, inside 120–240ms; off under `prefers-reduced-motion`; nothing loops.

Deviations:

1. **Keyboard focus on the new controls is not cyan.** Standard §14: "Maintain visible keyboard focus using cyan"; Guide 07: "Use cyan for clear keyboard focus states". The slice's own rule (`mobile-shell.css`) is a 2px `currentColor` outline, so the ring takes each control's text color:
   - menu button — the header's heading ink (`#1c1814`);
   - inactive drawer rows, close and Sign out — translucent off-white;
   - the active drawer row — the legacy teal accent (`#30cfac`), which is not the guide's cyan (`#12D8F2`).

   The ring is visible in every case (coordinator's focus checks passed). On `/sales/calllog` only, the route theme's existing rule (`calllog-brand.css:113`, `!important`, `--cl-teal: #12D8F2`) should override the color to cyan for buttons inside the shell; that is read from the cascade in source and was not measured in a browser by this session. Reason for the deviation: plan Beat 9 forbids new colors on routes still on the legacy palette. No recolor was made.
2. **Legacy palette outside `/sales/calllog`** — teal accent and pre-standard opaque surfaces, against Guide 02 ("Do not drift back toward teal") and 03. Carried, not introduced: re-theming beyond the Call Log route is out of scope (plan Beat 9, §4).
3. **Menu button radius 7px** is off the guide's radius scale; it matches the sidebar buttons beside it.

Not performed:

- **Phone-width comparison against a brand reference** — none exists. Neither document defines a phone layout, breakpoint, phone navigation pattern or touch-target size, and the canonical image is desktop only.
- **Side-by-side comparison of the changed screens with the canonical image** — this session opened the reference but viewed no screenshot of the build, so it makes no fidelity claim. At desktop the build's rendering is unchanged apart from the pixel exception above.
- **WCAG contrast measurement** of the new controls and their focus rings.

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
