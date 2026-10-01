# Mobile web preview — phone shell and sales phone flow

**Status:** REVISION 1 for T2 — answers the round-1 audit of `7efcebb` (see Revision notes). **Not locked by Chris personally.** The plan-lock pause is waived by the authorization quoted in §A, which makes independent T2 agreement the gate before build.
**Author:** T1 / `t1-mobile-plan` (Claude Code session `6eec194e-6dce-4608-99a5-140945e49feb`) · 2026-09-30
**Slice:** `mobile-web-preview` · branch `feat/mobile-web-preview` · **build base `34af3751f1c72895e2d416ac36ebeda702961f98`** (Call Log brand preview commit). This slice's handoff is v299.
**Phase:** Planning → next gate Plan Audit (T2, independent). Mode: FOCUSED. No later gate is skipped by this plan.

Tags
- `[LOCKED]` — fixed for this revision. Each names its source: **user** (words quoted in §A) · **delegated** (chosen by T1 under the scope/technical-choice delegation in §A; not Chris's own word on that item; T2 may challenge it; Chris sees it at preview) · **brand** (governing brand document) · **repo** (repo rule).
- `[DERIVED]` — T1's reading of code or measurements, for T2 to verify.
- `[DESIGN-OPEN]` — undecided. None is in scope; deferred ones are in §4.
- `[BLOCKED]` — none.

---

## §A Authorization record (quoted — not a lock)

The words as they reached this T1 session. T1 has not seen the root request itself.

1. Spawn brief (coordinator-written): "Chris explicitly authorized assessment then independently reviewed plan then build and Vercel preview, without re-asking technical choices." … "User authorizes scope selection within mobile browser objective; record quoted user authorization rather than inventing personal acceptance. T2 independent review required."
2. Session message, 2026-09-30 17:38 PDT: "Parent/user clarification: User explicitly authorized plan then build; independent T2 agreement is gate within this request, no artificial user plan-lock pause. Inventory all key route families and assess achievable breadth; do not prematurely restrict scope just because sibling starts CallLog. Practical useful preview, explicit tested scope vs remaining limitations. Preserve complex scheduling interactions; no generic CSS claim. No App edits before sibling SHA. No additional architecture."
3. Session message, 17:48 PDT: "Sibling complete and pushed:34af3751f1c72895e2d416ac36ebeda702961f98, clean. … Source base changes accepted dependency. Include final build base34af375; handoffv298 exists, mobile usesv299."
4. Session message, 17:53 PDT: "Existing root request authorizes your scope judgment then independent T2 approval before build. Preserve no backend/auth/data/prod changes. Write plan and stop; coordinator will commit it. Do not wait for another personal plan-lock approval…"
5. Session message, 18:16 PDT, directing this revision (its opening was cut off in delivery): "…never acquire/reuse user cookie. Push by coordinator after independent reviews authorized preview, exactSHAReady then hostedfixture tests if accessible. Directory responsive overlay in scope, explicit high modal layering, allow drawer UIhandlers whilebusiness handlers unchanged, Backwhereexisting. P2 remains coherent useful partial with per-screen acceptance/clearly deferred failedones. Managerfixture for Managerroute. CSS screen-only media to protectprint. Preserve existing branch/file no-touch. … No personal approval is needed for false attributed lock or prohibited production writes."

What this establishes, and what it does not:
- It replaces the Planning lock step (`docs/DEVELOPMENT_PROTOCOL.md` Planning gate; AIOS dev protocol §3) with T2 agreement, for this request. T1 followed it and records the departure here instead of resolving it silently.
- The AIOS brand rule asks T1 to settle unsettled brand decisions with Chris before lock. That was not done; the decisions are made under the delegation and shown in ID8 beats 3–6.
- No personal lock, acceptance or approval of this document by Chris is recorded or claimed. Items 2–5 are relayed wording. T2/T7 can check the root request at its source.
- Chris Acceptance after the Vercel preview is unchanged and still required before any merge.

---

## §0 Baseline — observed 2026-09-30

### 0.1 Evidence
- **Code** read at `34af375`, worktree clean.
- **T1 browser probe**, 17:47–17:50 PDT (after the 17:46:41 fast-forward, so it measured `34af375`; confirmed by the Call Log theme in its screenshots). Headless Chrome, touch/mobile emulation at 360, 390, 430, 768; local dev server; synthetic fixtures; every Supabase request answered inside the browser; WebSockets mocked. 40 routes × 4 widths, 0 page errors, 0 writes. Its 1440 pass stopped early (11 routes). Output is in T1's session scratch (`…/scratchpad/baseline/t1-baseline-34af375.json` + screenshots) and is ephemeral; the numbers that matter are copied below.
- **Coordinator baseline** at `90f890d` (before the fast-forward): `task-3/qa/baseline.json` (9 routes × 390/768/1440, no errors, no writes), nine 390px screenshots, `lint-baseline.txt` (176 errors, 43 warnings). Its shell numbers equal T1's. Its `/sales/leads` capture shows Sales Home, because the fixture left `leads_enabled` off (`Leads.jsx:71` redirects).

### 0.2 Shell — every in-shell route
| Viewport | Sidebar | Content region | Usable width after padding |
|---|---|---|---|
| 360 | 228 | 132 | 68 |
| 390 | 228 | 162 | 98 |
| 430 | 228 | 202 | 138 |
| 768 | 228 | 540 | 476 |
| 1440 | 228 | 1212 | 1148 |

- Cause: the sidebar is a flex child with inline `width: open ? 228 : 56` (`AppSidebar.jsx:37`); `open` starts `true` at every viewport (`App.jsx:141`); the shell is `display:flex; height:100vh; overflow:hidden` (`App.jsx:400`); content padding is inline `28px 32px` (`App.jsx:431`). `index.html:6` already has the viewport meta. No `matchMedia` or breakpoint hook exists in `src`.
- Collapsing by hand (the existing Collapse control) leaves 240 / 270 / 310px usable at 360 / 390 / 430. The rail is icon-only with `title` tooltips.
- Sidebar rows are 31–41px tall. Sign out is a 54×12px text button off the Call Log route (36px on it, `calllog-brand.css:18`).
- The Call Log jump button (`CallLog.jsx:525–529`, right/bottom 24, z 150) overlaps the page badge (`TableOfContents.jsx:388–398`, right/bottom 18, z 90) and covers its centre at 360–768. The geometry does not depend on width, so it overlaps on desktop too `[DERIVED]`. Pre-existing.

### 0.3 The sales phone flow at 360 / 390 / 430
- **New Inquiry** (`NewInquiryWizard.jsx`): the dialog shrinks to the full viewport width with no margin. The Next/Save control is placed at `right: calc(50% - 364px)` (`:879`) and sits outside the viewport: x = 496–544, 511–559, 531–579. The page cannot scroll sideways to reach it. Back mirrors it (`:871`). A step without an auto-advancing choice cannot be passed. At 768 both are on screen (Next at 700–748). By the same arithmetic they are off screen below 728px `[DERIVED]`.
- **Call Log detail** (`CallLogDetail.jsx`): the header row (`:520–578`) does not wrap. Its action group (`:533`) starts off screen; all five actions for an Admin (Edit, + New Proposal, + Add CO, Merge Job, Move to Old Jobs) are reached only by scrolling the page sideways (overflow 391 / 361 / 321px). Field grids are fixed two-column (`:589`, `:721`, `:758`). Linked-proposal rows carry a fixed 340px label (`:1053`). The totals strip is fixed three-column (`:1002`). It fits at 768.
- **Call Log list**: the table has 8 columns (`CallLog.jsx:476–510`), an 850px minimum (`calllog-brand.css:103`) and its own horizontal scroller (`DataTable.jsx:53–54`). The Call Log theme already stacks its panels at ≤900 and tightens padding at ≤600 (`calllog-brand.css:123–133`). Outside the table the page needs about 185px `[DERIVED]`.
- **Homes**: Subcon Home needs 340px of content width (its `minmax(340px, 1fr)` grid, `SubconHome.jsx:311`), Sales Home about 318px. With 16px side padding a 360 viewport offers 328px: Sales Home fits; Subcon Home is 12px over at 360 and fits from 390.
- **Login** fits at every width. Inputs are 14px (`Login.jsx:142`). iPhone Safari zooms the page when a focused field is under 16px; the repo already overrides this for `/crew` (`App.jsx:238`).
- Text fields under 16px: Call Log list 7 of 7, detail 8 of 8 (`NewInquiryWizard.jsx:15`, `CallLogDetail.jsx:20`, `calllog-brand.css:99`).

### 0.4 Route-family inventory
Widths are the content width a screen needs (usable width + measured overflow + right padding), measured at `34af375` with synthetic fixtures. After the shell change a viewport offers 328 / 358 / 398px at 360 / 390 / 430.

| Family | Routes | Observed | This slice |
|---|---|---|---|
| Shell | `/` Subcon Home | 340px | P1 |
| Sales | `/sales/home` | ~318px | P1 |
| Sales | `/sales/calllog` | ~185px + 850px table in its own scroller | P1 |
| Sales | `/sales/calllog/:id` | 491px; actions off screen | P1 |
| Sales | New Inquiry / Change Order wizard (modal) | Back/Next off screen below 728px | P1 |
| Pre-auth | `/login` | fits; 14px inputs | P1 (input size only) |
| Sales | `/sales/leads` (needs `leads_enabled`) | 184px; table 604px, 7 columns | P2 |
| Sales | `/sales/proposals` | 363px; table 1140px, 11 columns | P2 |
| Sales | `/sales/invoices` | 228px; table 872px, 9 columns | P2 |
| Sales | `/sales/customers`, `/sales/customers/:id` | 178px (table 448px, 5 columns); 243px, with three 352px tables in `overflow: hidden` frames (`Customers.jsx:679`, `:702`, `:726`) | P2 |
| Sales | `/sales/proposals/:id` + WTC calculator, PDF/send, Multi-GC | 776px — overflows at 768 too | Remaining |
| Sales | `/sales/invoices/:id` + new-invoice and pay-app modals | 456px | Remaining |
| Sales | `/sales/team`, `/sales/archive` (+ import wizards), `/sales/managers` | 250px, 245px; Managers not measured (Manager role only, `App.jsx:335`) | Smoke only |
| Global | `/settings` | 344px; holds QuickBooks and billing actions | Smoke only |
| Global | `/import` (standalone, Admin) | document is 502px wide at 360–430 | Untouched; remaining |
| Schedule | 11 routes: home, jobs, schedule, calendar, daily, materials, billing, production-rate, schedules, import, settings | Empty fixtures only. Content reaches ~825px (Crew Schedule), ~567px (Home), ~410px (Jobs), 198–289px elsewhere. Crew Schedule assigns crew by HTML5 drag-and-drop (`Schedule.jsx:894–896`, `:1129–1131`, `:1273–1275`); `src` has no touch or pointer handlers. Calendar sizes its grid from window height (`Calendar.jsx:275`). | Smoke only; zero code diff |
| Field web | 6 routes: today, jobs, crews, timeclock, dailylogs, loadouts | 135–291px with empty fixtures; not measured with data. Time Clock has add/edit/void flows. | Smoke only; zero code diff |
| AR | 6 tabs (data is browser-local, from a QuickBooks export) | ~491px with a seeded synthetic report | Smoke only; zero code diff |
| Phone page | `/crew`, `/crew-texts` | already fits 360–430 | Untouched; regression check |
| Public / pre-auth | `/sign/:token`, `/invoice/:token`, `/invoice-paid`, `/suite`, `/features/:slug`, `/checkout`, `/qb/callback`, Welcome screen, password-recovery mode | not assessed | Untouched |

### 0.5 Requests pages send on load that are not GET
These decide how "blocked writes" must be built.
- `/sales/invoices`: `POST functions/v1/qb-auth`, body `{action:"status"}` (`Invoices.jsx:3251`). A read.
- `/sales/archive`: `POST rest/v1/rpc/get_filter_options` (`HistoryLocker/ArchiveSearchView.jsx`). A read.
- `/settings`: `POST functions/v1/create-billing-session`, body `{action:"status"}` (`Settings.jsx:477–479`). A read.
- Call Log list with `leads_enabled` on: `HEAD rest/v1/leads` for a count (`CallLog.jsx:128–131`). A read. Cross-origin calls also send `OPTIONS` preflights.
- Call Log detail: storage list for attachments (`CallLogDetail.jsx:159–161`). A read.
- Call Log list: selects archive candidates and, if any exist, sends `PATCH call_log` (`CallLog.jsx:81–90`). **A real write, in any signed-in session.** Unchanged by this slice.
- Schedule Home and Jobs open Supabase realtime WebSockets (`schedule/views/Jobs.jsx:232–243`, `schedule/views/Home.jsx:103–104`).

### 0.6 Mechanisms already in the repo
- A stylesheet imported once in `App.jsx:13`, with media queries (`src/styles/calllog-brand.css:117–133`).
- `data-app-*` hooks overridden with `!important` where an inline style must lose (`WTCCalculator.jsx:2502–2506`, `schedule/App.css:478`).
- A menu button at `max-width: 768px` on the marketing page (`SubConCommandPage.jsx:82–88`).
- A phone-only 16px input override (`App.jsx:238`).

### 0.7 Brand sources read
Registry: `assets/brand/subcon-command/SUBCON_COMMAND_CURRENT.md` in the AIOS checkout.
- UI standard `source-docs/SUBCON_COMMAND_UI_STANDARD_LAUNCH.md`, read in full. Applies to "mobile/tablet views". Relevant: §1 (do not redesign; preserve information architecture and interactions), §10 (sidebar, top bar, inputs 36–44px on desktop, cyan focus), §13 (120–240ms motion), §14 (accessibility), §17 step 10 ("Check mobile/tablet behavior"), §18 checklist, "Locked Subcon Command identity mark".
- Visual Brand Guide `.docx`: text extracted from the DOCX by T1 and found identical to the registry's reading copy (265 paragraphs); DOCX sha256 `9833d17f…0a80` matches the hash the copy records.
- Canonical image `visual/crew-schedule-canonical.png` opened; byte-identical to the DOCX's embedded image. It is a 1672×941 desktop composition.
- **No governing document defines a phone layout, a breakpoint, a phone navigation pattern or a touch-target size.** A phone-width brand comparison cannot be performed; no reference exists.

### 0.8 The Vercel preview, and overlay layers
- **Preview and production share one database.** `SC_Handoff_v188.txt:80–81`: "Preview + prod share the one Supabase DB, so a save made on the preview is already in prod data."
- Previews sit behind Vercel deployment protection. An earlier slice reached one with a stored Vercel cookie (`SC_Handoff_v258.txt:57–58`). This slice does not (Beat 10).
- Layers today: the wizard is z 100–101 (`NewInquiryWizard.jsx:869–879`), the jump button z 150, the page badge z 90, the Directory overlay a fixed 640px panel at z 200 with a ✕ close (`TableOfContents.jsx:429–454`). At phone widths T1 measured the Directory panel shrinking to the full viewport width with no margin.

---

## ID8 decisions

- **Beat 1 — Objective `[LOCKED · user]`:** a practical, useful mobile-browser preview with tested scope stated against remaining limits. No backend, auth, data or production change. No native Field Command work.
- **Beat 2 — Base `[LOCKED · user]`:** build from `34af375`. No `App.jsx` edit happened before it.
- **Beat 3 — Breakpoints `[LOCKED · delegated]`; test widths `[LOCKED · user]`:**
  - ≤768px: phone/tablet-portrait layout (drawer shell, wizard controls in view, non-overlapping fixed controls).
  - ≤600px: phone details (single-column field grids, 16px text entry, 36px buttons, 16px side padding).
  - ≥769px: today's layout, untouched.
  - Verified at 360, 390, 430, 768 and 1440 only.
  - Reason: 768 is listed as a mobile test width and is the repo's only existing menu-button breakpoint; 600 is the Call Log theme's existing phone threshold.
- **Beat 4 — Phone navigation `[LOCKED · delegated]`** — affected UI: sidebar and header on every in-shell route.
  - Options: (A) the existing sidebar as an off-canvas drawer with a header menu button; (B) the 56px icon rail, collapsed by default; (C) a bottom tab bar.
  - Chosen: **A.** B leaves 240–310px, keeps an icon-only rail with hover tooltips, and still needs every screen reworked. C changes the information architecture, which UI standard §1 and "no additional architecture" rule out. A keeps one navigation component and one navigation model.
- **Beat 5 — Tables on phones `[LOCKED · delegated]`:** tables stay tables. Every column, sort header and row action is kept. The table scrolls sideways inside its own frame; the page never does. A card layout is deferred (§4).
- **Beat 6 — Sizes on phones `[LOCKED · delegated]`:** menu button, drawer rows, drawer close, Sign out and the wizard's Back/Next/Save/Close are at least 44×44 CSS px. Other buttons on P1 screens are at least 36px tall. Text-entry controls on P1 screens and Login are at least 16px. The 36–44 range is borrowed from UI standard §10, which states it for desktop.
- **Beat 7 — Breadth `[LOCKED · delegated]`:** P0 shell on every in-shell route; P1 the sales phone flow; P2 sales read lists, verify-first; everything else smoke only. Reason: the P1/P2 screens were measured with data and either fit or have a bounded fix. Schedule, Field and AR were measured only empty, or need 420–825px, or carry interactions this slice must not touch.
- **Beat 8 — Mechanism:** `[LOCKED · user]` the words "No additional architecture". `[LOCKED · delegated]` T1's reading of them:
  - What §0.6 lists, plus one viewport listener (`matchMedia` at 768px — a browser API, no dependency) and one new boolean for the phone drawer. No new dependency, framework, component library, state library, router change, service worker, manifest or viewport-meta change.
  - State model: the desktop sidebar state (`open`, `App.jsx:141`, expanded or collapsed) and the phone drawer state (open or closed) are independent. The drawer starts closed on load and whenever the viewport enters ≤768px, and always shows the expanded sidebar content. Drawer actions never change `open`.
  - Every rule this slice adds sits in a `@media screen` query, so print output is untouched.
- **Beat 9 — Theme `[LOCKED · brand + repo]`:** no re-theming. New chrome uses the tokens the route already uses: the Call Log theme on `/sales/calllog`, the legacy palette elsewhere. `.sc-calllog` is not extended to other routes (handoff v298). No new colors, fonts or radii. No logo or mark asset is added, redrawn or generated.
- **Beat 10 — QA `[LOCKED · user]`:** synthetic fixtures; all backend traffic intercepted; writes blocked. No agent signs in with real credentials anywhere, including the Vercel preview, and none acquires or reuses a user's cookie or session. The coordinator pushes the branch, after the independent reviews; hosted checks run only if the preview can be reached without one.
- **Beat 11 — Preserve `[LOCKED · user]`:** business logic, auth, data, table columns and actions, selected-job context, scheduling interactions.

---

## §1 Problem / intent

On a phone the app is unusable. The sidebar takes 228 of 360–430px and leaves 68–138px for the page. New Inquiry cannot be completed because its Next control is off screen. Job actions are hidden off the right edge.

Intent: Chris can open a Vercel preview on a phone and work the sales loop — sign in, read both home screens, open Call Log, open a job, start a new inquiry, look up proposals, invoices, customers and leads — while desktop stays exactly as it is.

## §2 Proposed change

### P0 — Phone shell (≤768px, every in-shell route)
1. The sidebar leaves the layout. The content region spans the full viewport width. The sidebar becomes a drawer over the content, closed on load.
2. A menu button in the header opens it. It closes on choosing a destination or the Directory action, tapping outside it, Escape, or its close control.
3. The drawer is the existing sidebar: same groups, items, order, app/role/flag gating, active marker, Directory action, Settings, user block and Sign out. Nothing is added, removed, renamed or reordered. The desktop Collapse control is not shown in drawer mode.
4. Opening or closing the drawer never remounts the page. Unsaved input, filters, scroll position, the selected job and the URL stay as they were.
5. Accessible: the menu button has a name and exposes its expanded state; the drawer is exposed as navigation; while closed nothing in it is focusable or announced; focus moves into it on open and back to the menu button on close; focus is visible; sizes per Beat 6.
6. The header stays one 50px row. The current page name is always fully visible; the group label may truncate.
7. Shell height follows the visible viewport on mobile browsers, falling back to today's `100vh`.
8. At ≤600px side padding is 16px, except where a route already sets its own (Schedule's zero padding, `schedule/App.css:478`; the Call Log theme's, `calllog-brand.css:128`).
9. The page badge and the Call Log jump button stop overlapping at ≤768px, and each can be tapped.
10. Motion stays inside UI standard §13 and respects reduced-motion.
11. The Directory overlay, opened from the drawer or the page badge, fits the viewport at ≤768px. Its close control is visible and tappable. Its content scrolls inside it.
12. Layer order at ≤768px, lowest to highest: page · page badge and Call Log jump button · drawer scrim · drawer · modal dialogs (New Inquiry, Directory, Log Outcome, job lists). Nothing floats above an open modal or the open drawer.
13. Sidebar and drawer state follow Beat 8. After 1440 → 390 → 1440 the desktop sidebar is as it was before.

### P1 — Sales phone flow
- **Subcon Home, Sales Home:** read top to bottom with no sideways page scroll. Numbers do not overflow their boxes or collide.
- **Call Log list:** no sideways page scroll. The table follows Beat 5.
- **Call Log detail:** every header action is in view without sideways scrolling. Field grids are one column at ≤600px. Linked proposal and invoice rows show label, status and amount. The three totals are readable.
- **New Inquiry wizard** (also the Change Order path and lead conversion — same component): the dialog sits inside the viewport. Next/Save and Close — and Back on the steps that show it today — are always visible and tappable at ≤768px. Step content scrolls inside the dialog.
- **Login:** inputs are at least 16px at ≤600px. Nothing else changes.

### P2 — Sales read lists (per screen)
Leads, Proposals list, Invoices list, Customers list, Customer detail. Each has its own check in §5 D. Predicted from §0.4:
- Leads, Invoices and Customers lists pass on the shell change alone.
- Proposals needs a list-level fix at 360 and 390 (363px against 328 and 358).
- Customer detail needs its three table frames made scrollable.

A screen that can pass only by editing a no-touch file (§3) is not fixed. It is marked **deferred** in the build report and the backlog with its measurement, and its D check and its part of G no longer apply. A screen that fails for any other reason is a failure. P0 and P1 are never deferred.

### Everything else in the shell
Still loads and navigates at 390 and 768 with no error. No other claim.

### Constraints
- `[LOCKED · user]` No change to data fetching, backend calls, auth, guards, routing, validation, save handlers, calculations, or table columns and actions.
- `[LOCKED · user]` Rules that alter a screen's inner layout are scoped to the named P1/P2 screens. No app-wide phone rule for inputs, tables or grids.
- `[LOCKED · user]` ≥769px is unchanged.
- `[LOCKED · user]` New CSS applies to screen media only. Print output is unchanged.

### Expectation check
What the phone preview will show:
- Sign-in fits and does not zoom. The app uses the full screen width. A menu button opens the same sidebar as a drawer.
- Both home screens and Call Log read without sideways page scrolling. The job table scrolls inside its own frame with every column.
- A job opens with all its actions visible and its fields in one column.
- A new inquiry can be walked to its last step with its step controls always on screen.
- Proposals, Invoices, Customers and Leads lists open and behave like the Call Log table.

What it will not do:
- Schedule, Field web, AR, Proposal detail and the WTC calculator, Invoice detail, Settings, Team, History Locker and Import are reachable and get the full width. They are not reworked or checked for phone use; several will scroll sideways or clip.
- Lists do not become cards.
- Crew Schedule drag-and-drop on touch is not addressed and not assessed.

**Gap, unresolved:** T1 could not confirm with Chris whether "mobile web preview" means the sales loop working on a phone (this plan) or every screen being phone-ready (not this plan).

---

## §3 Files / surfaces likely touched `[DERIVED]`

Likely edited:
- `src/App.jsx` — menu button, drawer state and its closing rules, scrim.
- `src/components/AppSidebar.jsx` — drawer semantics, close control.
- A new stylesheet under `src/styles/`, imported once.
- `src/components/NewInquiryWizard.jsx`, `src/components/CallLogDetail.jsx`, `src/components/TableOfContents.jsx` (page badge) — class hooks.
- `src/pages/SubconHome.jsx`, `src/pages/Home.jsx`, `src/pages/CallLog.jsx`, `src/pages/Login.jsx` — class hooks where a rule needs one.
- `src/pages/Proposals.jsx`, and `Leads.jsx` / `Customers.jsx` only if a measured overflow remains.
- A smoke script and its results (§5).
- `docs/agent-handoffs/BUILD-REPORT.md`, a `docs/BACKLOG.md` row (none exists for this slice), `docs/handoffs/SC_Handoff_v299.txt`.

No-touch — zero diff `[LOCKED · user/repo]`:
- `src/schedule/**`, `src/field/**`, `src/ar/**`
- `src/pages/PublicSigningPage.jsx`, `PublicInvoicePage.jsx`, `InvoicePaidPage.jsx`, `QBCallbackPage.jsx`, `CheckoutPage.jsx`, `SubConCommandPage.jsx`, `FeatureDetailPage.jsx`, `src/pages/Import/**`
- Money path: `src/lib/calc.js`, `src/pages/Invoices.jsx`, `src/pages/WTCCalculator.jsx`, `src/components/ProposalDetail.jsx`, `ProposalPDFModal.jsx`, `BillingScheduleSection.jsx`, `NewPayAppModal.jsx`, `PayAppDetailModal.jsx`, `src/lib/invoicePdf.js`, `payAppPdf.js`, `sovPdf.js`
- `src/lib/auth.js`, `supabase.js`, `supabasePublic.js`, `supabaseHelpers.js`, `followUp.js`, `nav.js`, `tokens.js`, `config.js`
- `supabase/`, `db/`, `sql/`, `package.json`, `package-lock.json`, `vite.config.js`, `vercel.json`, `index.html`, `eslint.config.js`

Notes for T3, not binding:
- Inline styles beat stylesheet rules unless the rule is `!important`. Most target elements have no class hook yet.
- Sidebar labels render only when `open` is true (`AppSidebar.jsx:41`, `:78`, `:82`).
- The Call Log theme's shell-padding rules are `!important` (`calllog-brand.css:39`, `:118`, `:128`).
- `[data-app-content]:has(.schedule-root)` and `:has(.sch-layout)` (`schedule/App.css:478–494`) must keep winning.

---

## §4 Out of scope / deferred

Remaining dense screens — unchanged, not assessed for phone use (details in §0.4):
- Proposal detail, WTC calculator, PDF/send, Multi-GC wizard.
- Invoice detail, new-invoice and pay-app modals.
- All eleven Schedule routes, including Crew Schedule drag-and-drop and Calendar.
- All six Field web routes; all six AR tabs.
- Settings, Our Team, History Locker and its import wizards, Managers, `/import`.
- Public and pre-auth pages other than the Login input size; the Welcome screen.

Deferred design items `[DESIGN-OPEN]`, not in scope:
- Card-style rows for lists on phones.
- A pinned first column on wide tables.
- Any phone treatment of Crew Schedule or Calendar.

Also out:
- The badge/jump-button overlap at ≥769px.
- The Call Log on-load archive write (`CallLog.jsx:81–90`).
- Widths other than the five tested; landscape phones.
- Applying the brand theme beyond `/sales/calllog`.
- Schema, backend, auth, RLS, edge functions, migrations, environment variables.
- Native Field Command; `main`; production; merge.

---

## §5 Acceptance bar

### Harness — applies to every check
- H1. The checks are one script, following the repo's `scripts/check-*.mjs` practice and adding no dependency. It runs against a local build of the reviewed commit, and against the hosted preview under G. Its path, the result file and the screenshots are named in `BUILD-REPORT.md`. Results and screenshots hold synthetic names only and follow repo practice on what is committed (handoff v298 kept them out of the repo).
- H2. Chrome with touch/mobile emulation at 360×740, 390×844, 430×932, 768×1024; desktop at 1440×1000. Clock fixed; animations disabled for screenshots.
- H3. Default-deny. A request to any host other than the app origin is aborted, except GET to the two Google Fonts hosts. A request to a Supabase host is never forwarded: HTTP is answered inside the browser from fixtures and WebSockets are mocked. Service workers are blocked.
- H4. Method plus allowlist. `GET`, `HEAD` and `OPTIONS` to a Supabase host are answered from fixtures. Four `POST` reads are answered synthetically: `functions/v1/qb-auth` and `functions/v1/create-billing-session` with body `action: "status"`, `rest/v1/rpc/get_filter_options`, `storage/v1/object/list/*`. Every other request is refused and logged, and **fails the run**. The Call Log archive-candidate query returns no rows. The walk never activates a save, send, delete or invite control.
- H5. Fixtures: an Admin with all four apps, a Manager with all four apps, and a non-manager with Sales only; at least six jobs across stages, one with a 40-character name, one change order, one without a site address; a proposal total of at least $1,000,000; `leads_enabled` on with at least one lead.
- H6. No real credentials and no user cookie, on any URL. The session is a synthetic object written to the Supabase client's storage key in the browser before the app loads; `auth/v1/user` is answered from the fixture; a call to `auth/v1/token` fails the run. No agent signs in. None acquires, exports or reuses a user's Vercel or Supabase cookie or session.

"No sideways page scroll" means `document.documentElement.scrollWidth === window.innerWidth` and `[data-app-content]` has `scrollWidth === clientWidth`.

### A. Shell — 360, 390, 430, 768
- A1. On load the content region's width equals the viewport width and no part of the sidebar is visible.
- A2. The header is one 50px row. The menu button is visible, at least 44×44, has an accessible name, and reports its expanded state. The page name is not truncated.
- A3. Tapping the menu button opens the drawer. For each fixture user its groups and items — text, order, active marker — equal the 1440 sidebar's for that user. Rows, close and Sign out are at least 44px tall. At 360 at least 44px of the page remains tappable beside the drawer.
- A4. The drawer closes on item tap (URL changes, new page shown), on the Directory action (the overlay opens), on outside tap, Escape and its close control. Focus returns to the menu button. While closed, Tab from the menu button does not enter the drawer and its controls are absent from the accessibility tree.
- A5. State survives the drawer. On a job in edit mode with text typed in Notes, open and close the drawer: text and URL unchanged. On the Call Log list with a stage tab and search text set: both unchanged.
- A6. Shell height equals the viewport height. The last row of the Call Log table can be scrolled clear of the jump button.
- A7. On Call Log the badge and the jump button do not intersect, and a tap at each one's centre lands on it.
- A8. Smoke: every in-shell route in §0.4 loads at 390 and 768 with no error screen and no page error, and can be left through the drawer. `/sales/managers` is loaded with the Manager fixture. `/crew` still has no sideways scroll at 360–430.
- A9. Directory overlay, opened from the drawer and from the badge: its edges are inside the viewport; its close is at least 44×44 and a tap at its centre lands on it; its content scrolls inside it.
- A10. Layers: with the drawer open, a tap at the centre of the badge or of the jump button does not reach them. With the wizard or the Directory open, a tap at the centre of each of its controls lands on that control.

### B. Desktop — 1440
- B1. Screenshots of `/`, `/sales/home`, `/sales/calllog`, `/sales/calllog/:id`, the open New Inquiry dialog, `/sales/proposals`, `/sales/invoices`, `/sales/customers`, `/schedule/schedule`, `/schedule/calendar`, `/field/timeclock`, `/ar/triage` and `/settings` differ from base `34af375` by no more than base differs from itself (expected: zero pixels).
- B2. No menu button is visible. Collapse still toggles the sidebar between 228 and 56px.
- B3. Resizing 1440 → 390 → 1440 in one session does not remount the page, leaves no stuck overlay, and returns the sidebar to the state it had before: 228px by default, 56px if it had been collapsed.

### C. P1 screens — 360, 390, 430 (768 where stated)
- C1. Subcon Home and Sales Home: no sideways page scroll. With the $1,000,000 fixture no number overflows its box or intersects a neighbour. A "Your Book" tile opens Call Log with that stage and rep applied.
- C2. Call Log list: no sideways page scroll. "+ New Inquiry" is in view. A pipeline number filters the table and the count shown matches. The table's header cells, in order, equal the 1440 table's. The table scrolls sideways inside its frame. A job number opens that job; "View" is reachable by scrolling the table.
- C3. Call Log detail: no sideways page scroll. Every header action present at 1440 for the same user and job is present and fully inside the viewport. In edit mode Save Changes and Cancel are in view. Field grids are one column. Each linked row shows label, status and amount inside the viewport. Billed, Remaining on contract and % Invoiced show in full with a seven-digit fixture. Back returns to where the job was opened from.
- C4. New Inquiry, at 360, 390, 430, 640 and 768: the dialog's edges are inside the viewport. On each of the ten standard steps, and on the Change Order path opened from "+ Add CO", Next and Close — and Back on the steps where 1440 shows it (`NewInquiryWizard.jsx:872`) — are fully inside the viewport, at least 44×44, and a tap at each one's centre lands on it. No step scrolls sideways. A step taller than the viewport scrolls inside the dialog. The last step shows an enabled Save, which the walk does not press. The job-number preview updates as it does at 1440.
- C5. On P1 screens and Login every text input, select and textarea computes to at least 16px, and every button is at least 36px tall.
- C6. Login at 360 has no sideways scroll and its submit button is in view (signed-out context; no sign-in is performed).

### D. P2 screens — 360, 390, 430, 768
Common to each: no sideways page scroll; every table's header cells, in order, equal the 1440 table's; every table is fully visible or scrolls inside its frame.
- D1. Leads: the common checks only.
- D2. Proposals list: "+ New Proposal" is in view; opening a row lands on the proposal route with no error.
- D3. Invoices list: its header actions are in view; opening a row lands on the invoice route with no error.
- D4. Customers list: "+ Add Customer" is in view; opening a row lands on Customer detail.
- D5. Customer detail: Back, Merge, Delete and Edit are in view; no column of its three tables is clipped.

Proposal and Invoice detail are judged on "loads with no error" only. A screen deferred under §2 P2 is listed as deferred in the results, with its measurement; its check is then not required.

### E. Preservation
- E1. `git diff 34af375..HEAD` shows zero changes in the §3 no-touch list.
- E2. In touched files the diff adds or changes only markup attributes, style values, layout wrappers, the menu button, the scrim, and drawer UI handlers: open, close, Escape, outside tap, focus move and return, close on route change, and the wrapping that makes a drawer item or the Directory action (`AppSidebar.jsx:87`) also close the drawer. A wrapped handler still calls the same function with the same arguments. No fetch, backend call, save, validation, guard, route or computed value changes (read from the diff by T4).
- E3. `npm run build` passes. Full ESLint reports no more than 176 errors and 43 warnings, with no new finding in a touched file.
- E4. `/settings` still shows "Not authorized" for the non-manager fixture.
- E5. Every media query this slice adds includes `screen`.

### F. Brand check (in `BUILD-REPORT.md`)
The block names the documents and sections checked (§0.7) and the changed surfaces. It states:
- on `/sales/calllog`, the menu button and drawer use the Call Log theme, with a visible focus outline;
- on other routes they use the legacy palette — reported as pre-existing, not as "no deviations";
- no new color, font, radius or mark asset was introduced;
- a phone-width comparison against a brand reference was **not performed**, because none exists.

### G. Vercel preview — after the reviews
A–F are the Smoke Test: run locally on the reviewed commit once Build vs Plan, Code Review and Security Review are clear. A run during Build is a self-check and does not count.
- G1. The coordinator pushes the reviewed commit to `feat/mobile-web-preview`, under the root request's preview authorization. No push before the reviews; never to `main`; never forced.
- G2. The Vercel deployment whose commit SHA equals the reviewed commit is Ready. SHA and URL are recorded.
- G3. If the preview can be reached without a user cookie or session, the same script passes A, C and the non-deferred D checks at 390 and 768 against it, under H3–H6. If it cannot, G3 is recorded as **not performed**, with the reason.
- G4. A commit after the reviews re-opens them, and G re-runs on the new reviewed commit.

### What a pass does not prove
- **Real devices.** Emulated Chrome cannot show iPhone Safari's toolbar, on-screen keyboard, safe areas or focus zoom, nor Android Chrome's. Chris's own look on a phone is the check; it is his step.
- **Real data and access.** Fixtures prove layout and interaction. They do not prove signed-in users see their records (repo `CLAUDE.md` Workflow Rule 10). No data path changes here, so authenticated access is unchanged rather than re-verified.
- **The preview writes to production.** Preview and production share one database (§0.8). A real sign-in on the preview runs the Call Log archive update on load, exactly as production does. Save, Send, Delete, Move to Old Jobs and Invite change real records. A look on a phone should be read-only: open, scroll, navigate; in New Inquiry stop at the last step and close without Save. No agent performs that walk.
- **Narrow desktop windows.** A desktop window under 769px gets the drawer layout.
- **Other widths.** Only the five named widths, plus 640 for the wizard, are checked.
- **Smoke-only screens.** "Loads without error" is the whole claim.

Completion claims stay separate: code built · data applied (none) · authenticated access (not exercised) · Chris's acceptance (pending).

---

## §6 Estimate

Agent elapsed time: about 45–60 minutes of build and local self-check. The reviews follow and are separate. After them, about 10 minutes for the local Smoke Test, the push, the deployment and the hosted run.

Uncertainties:
- whether the P2 lists pass on the shell change alone;
- how the wizard's controls behave with the on-screen keyboard, which cannot be checked locally;
- whether the preview can be reached without a user cookie; if not, the hosted run is not performed.

---

## Revision notes

### Revision 1 — response to round 1
Audit of `7efcebb` by T2 `t2-mobile-audit` (manifest `b268478`): NOT CONVERGED, 7 in cap (0C/4H/3M/0L). Findings: `task-3/qa/t2-review.txt`. Directions for the fixes: §A item 5.

| Finding | Outcome | Where |
|---|---|---|
| A1 High — preview shares the production database | Fixed | §0.8; H3; "What a pass does not prove" |
| A2 High — write rule failed required routes | Fixed | §0.5; H4; H6 |
| A3 High — protected preview, unnamed push, G before reviews | Fixed | Beat 10; H1; H6; G1–G4; §6 |
| B1 High — one boolean, no permitted viewport detection | Fixed | Beat 8; P0.13; B3 |
| B2 Med — preservation rule forbade required handlers; Back not on every step | Fixed | P0.2; A4; C4; E2 |
| C1 Med — P2 bar contradicted its escape clause; no Manager fixture | Fixed | §2 P2; D1–D5; H5; A8 |
| C2 Med — Directory overlay and layer order unspecified | Fixed | §0.8; P0.11–P0.12; A9; A10; C4 |

Also changed:
- **Print (O3, over cap), by direction:** screen-only media — Beat 8, §2 constraint, E5.
- **T1 correction:** the "width needed" figures in `7efcebb` left out the 32px right padding, and the Call Log figure came from the wrong route. §0.3 and §0.4 are corrected. Effect: Subcon Home is 12px over at 360, and Proposals is over at 360 and 390. Both were already in scope under a check that catches them (O5).

Not changed: scope, breadth, the no-touch list. The other over-cap items and the adjacent items are left for the backlog.

On the two human gates T2 raised:
- **B1 / Beat 8.** The `[LOCKED · user]` tag on the mechanism detail was T1's mis-attribution. The user's words were "No additional architecture"; the detail was T1's reading. It is re-tagged; no decision of Chris's is changed.
- **A1 / production data.** The plan now bars any agent sign-in or write on the preview. It neither asks for nor records approval of a production write.

---

## Audit manifest

_Generated by `/auditcriteria` on 2026-09-30 by T2 / `t2-mobile-audit` (session `305301ea-87e7-48e4-bee4-659a345aebf0`). Consumed by `/runaudit` to size the adversarial audit pass._

### Bottom line (plain English)
A screen-layout change with no database, sign-in or money logic in it, but it rewires the frame every screen sits in and promises a long list of pass/fail checks. Three reviewers: one on the shared frame and desktop staying identical, one on whether the sales screens can really be fixed inside the plan's own no-touch limits, one on whether the checks can actually be run safely against a Vercel preview.

### Round
- Plan type: feature (new phone layout surface; no pre-existing defect being fixed)
- Current round: 2
- Plan revision under audit: `87e820f`
- Sizing basis: DELTA since `7efcebb` — round 2. Scoped delta recheck by T2 inline, no agents, as routed; the fields below this section are the round-1 full-surface sizing and are kept as the record of that round.
- Delta scope (round N>1 only): the resolutions of A1–A3, B1–B2, C1–C2 only — §0.5, §0.8, Beats 8 and 10, P0.2/P0.11–P0.13, §2 P2, H1–H6, A4/A8–A10, B3, C4, D1–D5, E2/E5, G1–G4. New mechanism: one `matchMedia` listener and one drawer boolean. Everything else unchanged; not re-audited.
- Findings trend: round 1 (7 in cap) → round 2 (0)

### Prior rounds
- Round 1: `7efcebb` (manifest `b268478`) · 0C/4H/3M/0L in cap, 10 over cap, 6 adjacent · pattern: acceptance-bar-vs-constraints

**Briefing for agents**: do NOT re-find issues from prior rounds. Each round's revision-pass commit message is the canonical record of what was addressed. Attack ONLY material new to the plan revision under audit.

**Plateau signal**: plateau forms when round-N count is steady or higher than round-(N-1), not just at round 3+. `/runaudit` MUST present scope-cut as the only build-prompt option when plateau is detected.

### Deployment context
- **Live tenants**: 1 — HDSP only (multi-tenant onboarding blocked).
- **Prod / staging / dev**: the affected surface (app shell, Call Log, New Inquiry wizard, Login) is live in production for the paying tenant. This slice is confined to branch `feat/mobile-web-preview` and a Vercel preview; `main` auto-deploys to production (`CLAUDE.md` § Production) and is out of scope. Which Supabase backend the Vercel preview points at is not established by the plan (§5 "What a pass does not prove").
- **Blocking feature flags**: `leads_enabled` gates `/sales/leads` (`Leads.jsx:71`). None gates the shell.
- **Concurrency profile**: ≤5.

Agents weight severity against these values. Cross-tenant findings cap at Med while `live_tenants == 1`. Multi-user race findings cap at Low. Theoretical attacks against state that doesn't exist yet are not High.

### Time budget + finding cap
- **Time budget**: 70 min (§6: 45–60 min build and local smoke + ~10 min preview deployment and run; upper bound used)
- **Finding cap**: 7 findings

Synthesis MUST surface only the top-N most consequential findings. Remainder go to "Quarantined findings (not actionable this loop)."

### Surface
- Total lines: 313 (plan body, before this manifest)
- Sections: 8 (§A, §0, ID8 decisions, §1–§6)
- [LOCKED] decisions: 15 — 11 ID8 beats (Beat 3 carries two tags) + 3 §2 constraints + the §3 no-touch list. Five are `delegated` (T1's choice, not Chris's word): Beats 3 (breakpoints), 4, 5, 6, 7.
- [DESIGN-OPEN] items: 3, all deferred to §4 (none in scope)
- [OPEN] items: 1 unresolved gap (§2 "Gap, unresolved") + 3 §6 uncertainties
- Plan-to-code ratio: no code-line estimate in the plan; ~313 plan lines against an estimated 300–500 changed lines across ~12 files — roughly 1:1, no flag.

### Layers touched
- UI / components (shell, sidebar, wizard, job detail, list pages, login, new stylesheet)
- External integrations — Vercel preview deployment (requires a feature-branch push; backend target unknown)

Not touched, by the plan's own constraint: data layer, state model, RLS/auth, storage, migrations, edge functions, cross-repo, real-time.

### New mechanisms introduced
- UI: off-canvas drawer mode for the existing sidebar, with scrim, header menu button, close control, focus management and closing rules — sharing the desktop `open` state (`App.jsx:141`)
- UI: shell height tied to the visible viewport, with a `100vh` fallback
- Stylesheet: one new file under `src/styles/`, breakpoints at 768 and 600, with `!important` overrides of inline styles via new class hooks
- Test harness: a smoke script that drives Chrome, answers all Supabase HTTP inside the browser, mocks WebSockets and refuses non-GETs — to be run against local and against the Vercel preview URL. The repo has no browser-automation dependency and `package.json` is on the no-touch list.

### Cross-system reach
- Vercel preview deployment for the branch — its environment variables decide which Supabase project a real sign-in would hit.
- Schedule, Field web and AR are mounted inside the same shell (`src/schedule/**`, `src/field/**`, `src/ar/**`, zero-diff) and inherit every shell change.
- `/crew` and `/crew-texts` share `Login.jsx`.

### Irreversibility
none — all changes reversible (branch-only client code; no migration, backfill, data write or public API change). A push to the feature branch is the only outward step.

### Known weak points
- **Authorization, not a lock (§A).** The plan is not locked by Chris; it relies on relayed coordinator wording. Repo `DEVELOPMENT_PROTOCOL.md` Planning gate and AIOS protocol §3 both require an explicit lock. The plan records the departure rather than hiding it.
- **Unresolved scope gap (§2).** "Sales loop works on a phone" vs "every screen is phone-ready" was never confirmed. Lifted verbatim from the plan.
- **Unsettled brand decisions made by delegation (§A, Beats 3–6).** AIOS protocol §14 asks T1 to resolve these with Chris before lock.
- **Shared `open` state (Beat 8).** One boolean must mean "expanded 228px" on desktop (default `true`) and "drawer open" on phone (must start closed). B3 (resize 1440 → 390 → 1440) and A1 depend on how that is reconciled, with no `matchMedia` hook in `src` today.
- **Sidebar labels render only when `open` is true** (§3 note) — a closed drawer is the 56px rail's content, not an empty one; A4 requires nothing focusable or announced while closed.
- **No-touch list vs. acceptance bar.** `Invoices.jsx` is no-touch but the Invoices list is a P2 pass item; shared components (`DataTable.jsx`, `Btn.jsx`, `SearchSelect.jsx`, `FilterBar.jsx`, `ContactBillingPicker.jsx`) are neither listed as touched nor as no-touch, while C5 demands 16px inputs and 36px buttons on every P1 screen and the §2 constraint forbids app-wide rules.
- **Harness against the preview (G, H3, H4).** Whether the script can intercept traffic on a remote preview URL, get past Vercel deployment protection, and reach a signed-in shell without real credentials (H6) is asserted, not shown.
- **On-load write (§0.5).** The Call Log list sends a real `PATCH call_log` in any signed-in session; the preview's backend is unknown.
- **B1 zero-pixel desktop diff** across 13 routes while `App.jsx` and `AppSidebar.jsx` gain markup.
- **§0 evidence is ephemeral.** T1's probe output lives in a session scratch directory; only the coordinator baseline (`task-3/qa/`, at `90f890d`, before the fast-forward) persists.
- **Wizard arithmetic (§0.3).** Controls are `position: fixed` at `calc(50% - 364px)` (`NewInquiryWizard.jsx:871`, `:879`); the dialog is a fixed `width: 620`.

### Open questions
- Count: 4 (§2 gap; §6 three uncertainties)
- Highest-pressure: which backend the Vercel preview uses; whether P2 lists pass on the shell change alone given the no-touch list.

### Suggested attack angles (3 total)
1. **Shell user-path state trace + desktop invariance** — covers UI shell and the embedded apps. Required reading: `src/App.jsx`, `src/components/AppSidebar.jsx`, `src/components/TableOfContents.jsx`, `src/styles/calllog-brand.css`, `src/schedule/App.css`, `src/lib/nav.js`. Specific pressure: the shared `open` boolean across breakpoints; closed-drawer focusability; route-change closing; fixed-position overlays; `:has()` Schedule rules; B1/B2/B3 and A1–A7 achievability; whether §0.2 citations hold.
2. **P1/P2 feasibility inside the plan's own constraints** — covers the sales screens. Required reading: `src/components/NewInquiryWizard.jsx`, `src/components/CallLogDetail.jsx`, `src/pages/CallLog.jsx`, `Home.jsx`, `SubconHome.jsx`, `Login.jsx`, `Proposals.jsx`, `Leads.jsx`, `Customers.jsx`, `Invoices.jsx` (read-only), `src/components/DataTable.jsx`, shared input components. Specific pressure: §0.3/§0.4 claims against source; whether every C/D check can be met without touching a no-touch file, without an app-wide rule, and without changing a handler (E2); ambiguity that would force T3 to make a product decision.
3. **Acceptance bar, harness and preview safety** — covers the smoke script, Vercel preview and gate integrity. Required reading: plan §A, §5, §6; `CLAUDE.md` Workflow Rules 8 and 10; `docs/DEVELOPMENT_PROTOCOL.md`; `.cursor/rules/session-wrap.mdc`, `approved-handoff.mdc`, `confirm-intent.mdc`; `.claude/commands/pre-ship.md`; `package.json`; `vercel.json`; `src/lib/supabase.js` (read-only); `docs/handoffs/SC_Handoff_v298.txt`. Specific pressure: can H1–H6 and G be executed as written; is every check machine-decidable; can any step write to a real backend; does anything in the plan let Build exceed preview-only authority.

### Suggested agent count: 3

Rationale: one layer (UI) + cross-system reach (Vercel preview, embedded apps) + four new mechanisms = 3 angles; a fourth agent would only split the sales screens, which one agent can read in full.
