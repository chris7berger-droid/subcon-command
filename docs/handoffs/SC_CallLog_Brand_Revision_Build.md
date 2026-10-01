# Call Log Brand Revision — Build and Review

2026-10-01 · `feat/calllog-brand-preview` · Base `e35f40751c202325e96b7ba1a104ff3b34cce2a8` · Preview only

Chris asked for the approved construction photo behind compact translucent Call Log home panels, preserving the larger sidebar font and cyan treatment. He then requested the connected job/proposal flow receive the same colors and type on plain interior surfaces. This is the resulting first pass. Exact deployed SHA/immutable URL are in the completion receipt; no main merge or production release is authorized.

## Result and scope

- Home: exact approved photo, smaller separate glass panels, dark pipeline, warm brown Hunt, light Dig; dense jobs table/filters stay on high-opacity Light Glass with blur. Pipeline numbers 44→36px; panel padding20/24→14/20; priority cards72→56px minimum. Labels wrap without clipping.
- Interiors: job detail/edit, Proposals list/detail, New Proposal dialog, all seven Work Type Calculator tabs, calculator trips editor, archive-proposal panel, internal-approve dialog, Multi-GC/Merge/Archive/QB-action/Sync Conflict overlays, and proposal preview/send chrome.
- Narrow layouts: headers/actions wrap, job fields and calculator grids stack, proposal columns stack, financial grids scroll locally. Existing sidebar Collapse remains the phone navigation control; no shared navigation refactor.
- Unchanged: original app logo/bytes, sidebar font and cyan selected highlight, calculations, query/write handlers, e35f407 Preview autoarchive guard, customer-facing proposal document/PDF builders/print content/public signing page. Theme variables fall back to original literals outside `/sales/calllog`, `/sales/calllog/:id`, `/sales/proposals`, `/sales/proposals/:id`; print resets those variables.
- Outside first pass: Invoices, Customers, Leads, Schedule/Field/AR, Settings, nested QBLinkModal, literal status-map chips beyond the job stage readability correction. No whole-suite redesign.

## Source image and brand check

Photo: `src/assets/brand/calllog-construction.png` is byte-identical to `src/schedule/assets/crew-capacity-command-bg.png` at `6483984d360e37d68a3e01be21977181be00531b`, the verified source of approved Vercel preview `sales-command-dxz5dvofz` (`ui/crew-capacity-surface-test`). SHA256 `05b2aa0aa3ffb6b60614e97b5afa74742aaf818a48cd87fdc59ae99c089d35b4`. No generated replacement or screenshot background. Supplied reference images were materialized using Library and inspected locally; the original photo was visually matched and its exact bytes preserved.

Authority: `/Users/chrisberger/aios/assets/brand/subcon-command/SUBCON_COMMAND_CURRENT.md`; saved source `565a1bac6efe01d29700162f2474283b827e8c3f`. Read governing UI standard §§4–7,9–14,17–18 and Visual Guide03–08; inspected registered canonical Crew Schedule image. Opus read the faithful DOCX text copy; independent verifier opened DOCX ZIP/XML and confirmed DOCX/XML hashes match that copy and canonical image matches embedded `word/media/image1.png`. Governing DOCX SHA256 `9833d17f2ec88c0a90626b599fb61eca997a91ac6206eb7337cedcf0277d0a80`.

Changed surfaces follow cyan `#12D8F2`, warm sand/ivory dense work areas, espresso command panels and the registered condensed/Inter type hierarchy. Independent local browser review inspected home/interiors at desktop, tablet and390px (sidebar collapsed), empty/search-empty states, selected/focus states and dialogs. Job stage text now uses dark semantic inks; summary text is readable ivory on espresso. Original logo and approved photo helmet mark are preserved.

Deliberate adaptations: photo atmosphere follows Chris's explicit request; interiors use opaque warm surfaces per his instruction. Hunt stacks approved Brown Glass2 over Dark Glass1 to retain contrast. The existing dark-cyan ink `#075763` is retained for readable links on warm light surfaces. The original calculator's some14px card corners and literal informational/status colors remain in this first pass. This is a visual review, not a complete WCAG certification or exhaustive audit of every financial/dialog state.

## Verification

- Named AIOS Opus `/fix` build session `5060498a-60bb-49c4-9171-2532773b3436`; independent Codex fixture/browser review routed phone-overflow and contrast findings back for correction.
- Build succeeded. Preview archival regression passed: Preview zero archive calls; production/development/blank preserve original behavior. Guard source unchanged by this revision.
- Full lint remains the existing176 errors/43 warnings; diagnostic comparison by file/rule/message (excluding shifted source-line excerpts) found no additions. Unrelated untracked `CallLog 2.jsx` excluded. New browser scripts and tokens/Checkbox focused lint pass. `git diff --check` passes.
- Local Chrome synthetic regression passed: pipeline/search/zero-results/filters/clear/sorting; manager scope; priority expand/collapse; Hunt refresh/back/pin; repeated Log Outcome validation/cancel and New Inquiry open/close; cyan focus; job navigation/back; repeated job edit/cancel; New Proposal open/cancel; proposal preview open/close; all seven WTC tabs; existing proposal total$975; Customers outside theme.
- Home inspected1440/1024/768/390px. Job/proposal/WTC checked1024 and390px; every WTC tab checked on phone. No page overflow (390px content334px, scroll334px), zero page errors, zero attempted backend writes. Empty home also passed.
- All app/backend records/auth were synthetic and intercepted. No real job10311 lookup, saves, email, financial action or Supabase request. These checks do not prove live user login/RLS.

## Durable browser check

`scripts/qa-calllog-brand.mjs` and `scripts/qa-calllog-brand-checks.mjs` use available Playwright/Chrome through `PLAYWRIGHT_MODULE` and `QA_BROWSER_PATH`; no app dependency change. Set `QA_URL`, `QA_INTERACTIVE=1`, `QA_OUTPUT_DIR`. Optional `QA_EMPTY=1` checks empty home; optional `QA_ARCHIVE_CANDIDATE=1 QA_EXPECT_ARCHIVE=none` (without interactive mode) exercises an expired synthetic Lost job. All writes are blocked and fail the test.

Local server uses `VERCEL_ENV=preview` plus synthetic Supabase URL/key. For exact deployed static assets, `QA_VERCEL_CURL=1` uses existing authorized Vercel CLI access with `QA_VERCEL_PROJECT_DIR`; supply only the public Supabase project URL for fake-session storage naming. All app API calls remain intercepted; no security settings change or app login is used.

## Review limits

Preview still targets production Supabase. Autoarchive is disabled in Preview, but the app is not read-only: do not save/send/approve/merge, open Billing or create financial records while reviewing. No main/production/database/settings/auth changes. Recovery worktree and unrelated duplicate file untouched.
