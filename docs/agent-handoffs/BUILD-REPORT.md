## Preview archive guard — current addendum

Guard commit `44a94bd554ffd3bdafd519961a4c5812355ca6f0` is pushed on `feat/mobile-web-preview`. Vercel reports **Ready**, target **preview**, deployment `dpl_H1VZUTxhLc3LcPvELvjeF4riWgJ6`: https://sales-command-nc4um1vj7-chris7berger-droids-projects.vercel.app . This supersedes the unguarded deployment URLs below; do not reuse those older immutable URLs for a signed-in look. The final documentation commit will have its own deployment, verified separately by the coordinator.

`vite.config.js` exposes only the existing `VERCEL_ENV` environment name. `CallLog.jsx` skips its automatic archive candidate query, update and banner when that value is `preview`. Production, development and missing values retain the original behavior. Existing Vercel project facts were read through the management API: framework `vite`, `autoExposeSystemEnvs=true`; no settings were changed.

**Verification:** `node scripts/check-preview-autoarchive.mjs` and focused ESLint pass. Compiled preview and production-condition builds pass. Local browser runs use only synthetic credentials/records with network interception: preview made no archive query/write; production-condition made the original archive query and one PATCH, fulfilled locally; both list loads and mobile drawers worked with zero unexpected writes, blocked requests or page errors. Evidence: task-3 `qa/autoarchive-browser-results.json`, `qa/autoarchive-preview.png`, `qa/autoarchive-production.png`. This is fixture evidence, not a live production or hosted flow test. Independent T5/T6 delta reviews found zero blockers; their exact records and limits are in `docs/AUDIT_LOG.md`.

**Hosted limitation:** exact SHA and Ready state are verified, but the deployed JavaScript has not been inspected. Vercel SSO blocks unauthenticated hosted access; the management file-tree endpoint returned 404. No cookie or protection bypass was used. T5/T6's deployed-guard verification item remains open before signed-in use; local compiled evidence is not substituted for that check.

**This preview still shares production Supabase and is not read-only.** Interactive saves remain live. Source-only inspection also found unchanged automatic writes: On `/settings`, an Admin must expand Company → Billing: its accordion defaults closed and does not mount children while closed (`Settings.jsx:25–33,785–787`). Merely opening Settings does not trigger this path. Expanding Billing mounts `BillingSection`, which invokes `create-billing-session` status (`Settings.jsx:474–488`); with a Stripe subscription and changed status the handler updates `tenant_config.subscription_status` (`supabase/functions/create-billing-session/index.ts:172–195`). Ordinary `/sales/invoices` list viewing does not trigger schedule creation. The user must choose + New Invoice and select a proposal (`Invoices.jsx:3474,491`), or click + Create Invoice on a Sold proposal detail (`src/components/ProposalDetail.jsx:1085–1086`), which passes route state to auto-open/preselect (`Invoices.jsx:3283–3299,126–130`). If the proposal has no existing schedule, a linked customer requiring pay apps, and WTC rows, selection inserts `billing_schedule` and `billing_schedule_lines` before Save (`Invoices.jsx:135–167`). Those flows were not executed against live data. Avoid expanding Billing and starting New Invoice/pay-app creation during a visual preview. This was a bounded inspection of covered navigation, not an exhaustive whole-app mutation audit.

Guard authorization: the later explicit parent delegation authorized this preview-only archive exception to the original no-touch scope. Formal mobile smoke remains **166/167**, with B1 failed: **9 Call Log pixels, maximum channel difference 1**. No test threshold was changed; the coordinator treated that measured visual difference as immaterial, not a passing test or user acceptance.

No production deployment, main merge, backend/schema/RLS/auth/data or project-setting change. Sibling CallLog branch/worktree untouched. The archive guard is available to that sibling as the pure commit above (includes the local regression script), or the two-file patch `/tmp/mobile-preview-archive-guard.patch`.

## Status

Mobile web preview (F65) — built, reviewed, smoke-tested and **published as a Vercel preview** from `feat/mobile-web-preview` (draft PR #72). T4, T5 and T6 are recorded clear in `docs/AUDIT_LOG.md`. The formal Smoke Test ran on the reviewed source: **166 of 167 checks passed; the one failure is B1 (desktop pixels), which fails as written and is not waived.** The hosted walk was **not performed** (the preview is behind Vercel sign-in). What remains is Chris's look and acceptance. **Do not merge.**

    Role:        T3 Build · mode: build (preview record) · agent/session t3-mobile-finish / 59b45299-39fb-407c-b796-c5c77532256b
                 (continues builder session 0dd426b3-d40d-4c3a-97af-393dc105f6f3, which wrote most of the source)
    Plan:        docs/plans/mobile_web_preview.md @ 87e820f · plan diff 87e820f → working tree is inside `## Audit manifest` only
                 · T1: no personal lock exists; build authorised by Chris directly (plan §A)
    Gates:       T2 CONVERGED (a4b831b) · T4 NO-GO round 1 (8cd3f62) → GO round 2, B1 carried unwaived (82b61fa)
                 · T5 0 BLOCKS-SHIP (3704b9c) · T6 0 exploitable-today (307feb8) — all in docs/AUDIT_LOG.md `## Gate records`
    Branch:      feat/mobile-web-preview · slice base 34af375 · app source cc4d733 · reviewed build db14d25 (src and scripts byte-identical since) · deployed 2092cea · this commit (docs only)
    Outcome:     Smoke: every acceptance check passes except B1, which fails as written (see "Formal Smoke Test")
    Completion:  code built yes · data applied n.a. (none) · access verified no (not exercised) · Chris accepted: not T3's to claim
    Push:        pushed by the coordinator as the approved preview step (plan G1), through 2092cea; this commit not pushed by T3
    Next:        T7 → Chris Acceptance

## Summary

At ≤768px the sidebar leaves the layout and becomes a drawer opened from a menu button in the header. The sales phone flow (both homes, Call Log list and detail, New Inquiry, Login) and the sales read lists (Leads, Proposals, Invoices, Customers, Customer detail) fit phone widths. ≥769px and print are unchanged in source: every new rule sits in a `@media screen` query at ≤768px or ≤600px, and the desktop markup changes are attributes and class names only.

In the original mobile CSS/shell slice no data fetching, backend call, auth, guard, route, validation, save handler, calculation, table column or row action changed. The later authorized preview archive guard changes only the automatic archival path described in the current addendum.

## What changed

- **Shell (P0)** — `src/App.jsx`, `src/components/AppSidebar.jsx`: one `matchMedia` listener at 768px and one drawer boolean, independent of the desktop sidebar state. The drawer closes on a destination (including the current one), the Directory, the scrim, Escape and its close control. While closed it is `inert`. Focus moves in on open and back to the menu button on close. The desktop Collapse control is hidden in drawer mode.
- **Layers** — while the drawer is open, the content column becomes one layer under the scrim, so an embedded sticky header (AR's top bar is z 100) cannot cover the drawer. An open `aria-modal` dialog lifts that, so modals stay above the drawer. The Directory sits outside the column at z 200.
- **Dialog semantics** — `role="dialog" aria-modal="true"` and a name on the existing containers of New Inquiry, the Directory, Log Outcome, the job-list modal and the Hunt results modal. Attributes only.
- **New Inquiry (P1)** — dialog inside the viewport; Back/Next/Save pinned at the bottom; the title row is sticky so Close stays on screen while a tall step scrolls. The customer picker's search box (rendered on `<body>` by `SearchSelect`) is 16px while the wizard is open.
- **P1/P2 screens** — class hooks plus scoped rules in `src/styles/mobile-shell.css`: one-column field grids, wrapping header actions and KPI rows, 16px text entry and 36px buttons on P1 screens and Login, scrollable table frames on Customer detail, wrapping status tabs on Proposals.
- **QA scripts** — `scripts/check-mobile-preview.mjs`, `scripts/mobile-preview-fixtures.mjs` (both written by the coordinator and first committed in `cc4d733`). In `db14d25` T3 extended `check-mobile-preview.mjs` only, for T4 finding 2, and added `scripts/capture-mobile-preview-desktop.mjs` (the coordinator's capture procedure). The fixtures file has not changed since `cc4d733`. Playwright is loaded from an existing local runtime via `PLAYWRIGHT_MODULE`; no dependency or `package.json` change.

P2 deferrals: none. No screen needed a no-touch file.

## Formal Smoke Test

Run by T3 after T6 cleared, on T7's routing, against the coordinator's compiled build of the reviewed source served locally at `http://127.0.0.1:5195` (build log `qa/mobile-compiled-build.log`). `src` and `scripts` are byte-identical to the reviewed commit `db14d25`. Fully synthetic: fixture data, backend default-deny, no sign-in, no real credential, cookie or token. No save, send, delete, merge or invite control was activated.

**Result — `qa/mobile-smoke/results.json`, console in `qa/mobile-smoke/console.log`** (widths 360, 390, 430, 640, 768):

- 167 checks: **166 passed, 1 failed (B1)**. 0 page errors, 0 attempted writes, 0 refused requests.
- The script exited non-zero because of B1 alone. No waiver bound was set for this run.

**B1, as run for Smoke:** one desktop capture (`qa/mobile-smoke/desktop`, made once with `scripts/capture-mobile-preview-desktop.mjs`) against base `qa/desktop-base-final`, noise floor `qa/desktop-base-repeat`. 12 of 13 screens exact. **Call Log differs by 9 pixels, max channel difference 1**, against a floor of 0. New Inquiry is exact (floor 30 px). B1 therefore **fails as written**. The plan's Smoke gate is "every acceptance check passes", so the gate is not met literally; that is for T7 and the coordinator to dispose of, on the dispositions listed under "Desktop at 1440" below. Chris has not accepted it.

**Login buttons, measured by hand** (agreed with T7 because the reviewed script measures Login inputs only; the reviewed scripts were not changed). Signed-out fixture context at 360, compiled build, no sign-in: Remember me 36px, Sign In 41px, Forgot password? 36px — all ≥36px, all inside the viewport and tappable at their centre; Sign In is in view; no sideways scroll; 0 errors, 0 writes. Evidence: `qa/mobile-smoke/login-buttons.json`, `login-360.png`, and the one-off probe `login-buttons.mjs` beside them.

Not covered by Smoke: real devices, real data, authenticated access, and the hosted preview (plan G1–G4).

## Preview (plan G1–G4)

| | |
|---|---|
| G1 push | By the coordinator, after T4, T5, T6 and Smoke. Never to `main`, never forced. T3 confirmed by `git fetch` that `origin/feat/mobile-web-preview` and draft PR #72 both sit at `2092cea`. |
| G2 deployment | **Ready**, environment preview, commit `2092cea8ec9991bc4251a9bcdd4194ee37d17f6f`, deployment `dpl_8wNFvnp3Jsas1YZgHTY1ZYfys5Xc`. Observed by the coordinator (`qa/mobile-preview-deployment.json`); T3 did not query Vercel. |
| URL | https://sales-command-k1m6b6wos-chris7berger-droids-projects.vercel.app |
| PR | https://github.com/chris7berger-droid/subcon-command/pull/72 (draft) |
| G3 hosted checks | **Not performed.** An unauthenticated request is redirected (HTTP 302) to Vercel sign-in. No cookie, session or bypass was acquired or used, per plan Beat 10 and H6. |
| G4 | `2092cea` and this commit are docs-only on top of the reviewed build `db14d25`; `src` and `scripts` are identical to it. This commit will deploy again when pushed; the coordinator verifies that deployment separately, so its SHA and URL are not recorded here. |

No hosted behaviour is claimed. The evidence for this slice is the local synthetic run against the compiled reviewed source (Formal Smoke Test, above).

**The preview is not a test sandbox.** It uses the production Supabase project; no environment setting was changed. Signing in loads real records, and Save, Send, Delete, Move to Old Jobs and Invite change them. The Call Log's existing archive update on load is unchanged by this slice and runs on the preview exactly as in production. A look on a phone should be read-only.

**Not phone-ready, by scope:** Schedule (including Crew Schedule and Calendar), Field web, AR, Proposal detail and the WTC calculator, Invoice detail and its modals, Settings, Team, History Locker and Import. They are reachable at full width and load without error; several scroll sideways or clip.

## Evidence (pre-review build self-check)

One script carries the acceptance checks (plan H1): `scripts/check-mobile-preview.mjs`, with its fixtures in `scripts/mobile-preview-fixtures.mjs`. Desktop screenshots for B1 are captured by `scripts/capture-mobile-preview-desktop.mjs` and compared by the check script. All runs are synthetic: local dev server, fixture data, backend default-deny, service workers blocked, WebSockets mocked, no sign-in. They are a build self-check — **not** the Smoke gate, a review or a hosted walk. Results and screenshots stay in the task's local `qa/` directory and are not committed (handoff v298 practice).

**Pre-review run — `qa/mobile-acceptance/results.json`, console in `qa/mobile-acceptance/console.log`** (run by T3 on the source at `cc4d733`, widths 360, 390, 430, 640, 768):

- 167 checks: **166 passed, 1 failed (B1)**. 0 page errors, 0 attempted writes, 0 refused requests.
- A refused request now fails the run, not only a write (T4 finding 6). The fixtures were not loosened.

| Plan item | What the script now checks | Checks |
|---|---|---|
| A3 | Drawer rows — label, title, order, active marker — equal the 1440 sidebar for the Admin, Manager and Sales-only fixtures; every drawer button ≥44px; ≥44px of page left beside the drawer | 12 |
| A4, A5, A7 | Drawer close modes and focus; edited job and list filters survive the drawer; badge and jump button apart and tappable (unchanged checks) | 12 |
| A6 | Shell height equals the viewport; last Call Log row scrolls clear of the jump button | 4 |
| A8 | 28 smoke routes at 390 and 768, each left through the drawer; `/sales/managers` with the Manager fixture; `/crew` with no sideways scroll at 360, 390, 430 | 56 + 1 + 3 |
| A9 | Directory opened from the drawer and from the badge: inside the viewport, close 44px and tappable, content scrolls inside it | 4 + 4 |
| A10 | Drawer open: taps at the badge and jump button centres do not reach them; no drawer row is covered by the page. Wizard and Directory controls tappable; the wizard stays on top of a drawer opened from the keyboard behind it | 4 |
| C1 | Both homes: no sideways scroll, no number clipped or outside its box, KPI cells do not overlap, seven-digit figure shown; the "Wants Bid" tile opens Call Log with that stage and the rep applied | 3 |
| C2 | Pipeline count, search, table headers, sideways scroll in frame, View opens the job (unchanged) | 4 |
| C3 | Job opened from the list; header actions equal the 1440 set and are inside the viewport; one-column field grids; linked rows show label, status and amount inside the viewport; three totals unclipped with a seven-digit figure; Save Changes and Cancel in view in edit mode (not pressed: Cancel only); Back returns to the list | 3 |
| C4 | Ten standard steps and the Change Order path, stopping before Save (unchanged) | 5 + 5 |
| C5 | Every text input, select and textarea ≥16px and every button ≥36px on the four P1 screens, in detail edit mode and on every wizard step; Login inputs | 3 + inside C3/C4 + 1 |
| D1–D5 | Layout and table headers per screen; "+ New Proposal", Invoices header actions and "+ Add Customer" in view; a row opens the proposal, invoice and customer routes with no error; Customer detail Back, Merge, Delete and Edit in view (not pressed); its three tables scroll in frame | 36 layout + 4 + 4 |
| B2, B3, E4 | Desktop collapse 228/56 and resize restore; Sales-only fixture gets "Not authorized" on `/settings` | 1 + 1 |
| B1 | Pixel comparison of the 13 desktop screens against base — **fails as written**, below | 1 |

Selector notes, from the real UI: a Proposals row opens through its own "Open" control (the row itself does not route); the "Your Book" tile sets the stage tab and rep filter, not the pipeline button state.

No control that saves, sends, deletes, merges, invites or moves a job is activated anywhere in the script.

Earlier runs by the coordinator, on the same source, kept for the record: `qa/mobile-final` 126 checks, `qa/mobile-tall-step` 20 checks, `qa/wizard-matrix` 66 checks — all passed, 0 errors, 0 writes. The 66-check wizard result is in the coordinator's review packet.

Local checks by T3: `npm run build` passed at `cc4d733` (no app source change since); ESLint 176 errors / 43 warnings after this revision, equal to the baseline, and the two edited scripts lint clean; `git diff --check` clean; zero diff under the plan's no-touch list.

### Desktop at 1440 — B1 fails as written

B1 asks that the 13 screens differ from base `34af375` by no more than base differs from itself. **That is not met, and it is carried here as a failure, not a pass.** No threshold was changed and Chris has not accepted it.

Captures of this build before the reviews (the Smoke capture is a fifth: Call Log 9 px, max 1, 12 of 13 exact), each compared with the base capture (`qa/desktop-base-final`; its repeat `qa/desktop-base-repeat` is the noise floor):

| Capture of this build | Screens exact | Differences from base |
|---|---|---|
| Coordinator, earlier (`qa/desktop-after`) | 10 of 13 | Call Log 9 px, max channel 1 · Calendar 127 px, max 1 · New Inquiry 28 px, max 18 (floor 30 px, max 18) |
| Coordinator's script re-run by T3 on the current source | 12 of 13 | New Inquiry 28 px, max 18 (inside the floor) |
| Committed capture script, run 1 (`qa/mobile-acceptance/desktop-after-1`) — **the one the check script judged** | 11 of 13 | Call Log 16 px, max 1 · Time Clock 1 px, max 10 |
| Committed capture script, run 2 (`…/desktop-after-2`) | 9 of 13 | as run 1, plus the two home screens' hero image area (64,766 and 40,991 px, max 12) |

What this shows:

- **The capture is not repeatable.** The same source, captured four times, gives four different results; runs 1 and 2 were minutes apart with no change between them. Calendar, the screen with the largest earlier difference, has zero source diff and is exact in three of the four.
- **No layout or content change was seen** in any capture. Crops of the largest difference (the home hero, run 2) are indistinguishable by eye.
- Every rule in `mobile-shell.css` sits in a `screen` media query at ≤768px or ≤600px, and the desktop markup changes are attributes and class names.
- A single base repeat is too thin a noise floor to tell build from noise here. T4 said the same.

Dispositions recorded so far — neither is Chris's acceptance:

- **T4 (round 1)** judged the first capture's 136 one-level pixels immaterial, and said T4 cannot waive a plan criterion.
- **The coordinator** accepts a ≤1-level difference as a routine technical deviation under the original authorization, with the literal failure kept on record. The check script was run with that bound (`QA_B1_ACCEPT_MAX_CHANNEL=1`). Run 1 is **outside** that bound because of the single Time Clock pixel at 10 levels, so the script reports B1 as failed and unwaived, and exits non-zero for that reason alone.
- **The coordinator, on run 1** (session message, 2026-09-30 19:25 PDT): accepts the 1 Time Clock pixel and 16 Call Log pixels too, as an immaterial raster-only technical deviation with no source or geometry change, and states this is not user preview acceptance. The script result was not re-run or relabelled to match; B1 stays failed in `results.json`.

Captures taken inside the long check run (after the phone widths) differed from base by far more — text raster differences with the same geometry — which is why capture is a separate script run in its own process, the way the base directories were made.

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
- **Side-by-side comparison of the changed screens with the canonical image** — this session opened the reference but viewed no screenshot of the build, so it makes no fidelity claim. At desktop see the B1 section above.
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

A recorded disposition for B1 · Chris's look at the preview on a real phone and his acceptance · no merge or production release without it. Non-blocking review findings are backlog rows O12 (T4) and O13 (T5, T6).

**The preview is not a test sandbox.** It runs against the production database (plan §0.8): signing in loads real records, and Save, Send, Delete, Move to Old Jobs and Invite change them. A look on a phone should be read-only.
