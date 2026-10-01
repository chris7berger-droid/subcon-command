RELEASE STATUS UPDATE — 2026-10-01: Chris accepted the tested PR #73 fix and approved release, substituting the completed AIOS T5/T6 reviews for disabled Bugbot for this PR only. Original approval verified directly by the coordinator; exact evidence is in docs/AUDIT_LOG.md. Merge and production verification are the remaining execution steps. Earlier blocked/pending-acceptance statements below are superseded by this update. Final deployment evidence will be recorded on PR #73. No live customer password or native login has been verified.

## Status

**B124 — password-recovery lifecycle fix. Code, tests, both reviews and the Vercel preview are complete. Not merged. Not in production.**

**Blocked on Bugbot: it was invoked and skipped — disabled for this repository. No automated review ran.** Pending, in order: Chris's decision on Bugbot (enable it, or explicitly waive it / accept the completed T5 + T6 reviews as the substitute) · Chris's acceptance · explicit merge / production approval.

| | |
|---|---|
| Branch | `fix/recovery-save-stability`, draft PR #73, base `origin/main` `90f890d` |
| Reviewed code | `e5087360c4a5b4ceebecb7193ef09c0b98a2e729` (`36ce1c0` build + `e508736` T5 fix) |
| Preview tested | `3031f0c` — app source identical to `e508736` |
| Path | in-flow bug fix (`/fix`), no plan document; scope from the T7 routing packets of 2026-10-01 |

Completion: code built **yes** · data applied **n/a** · authenticated access verified **no** (synthetic fixtures only) · Chris accepted **no**.

## Summary

Resetting a password with the emailed code could drop the user into the app before the new password was saved, and hide a failed save.

Cause: `supabase.auth.verifyOtp({ type: "recovery" })` saves a session and emits `PASSWORD_RECOVERY` before it returns. `App.jsx` applied that session. The logged-out branch unmounted, taking the `Login` that owned the reset form with it. A rejected or slow `updateUser` then reported to a component that no longer existed: the user was in the app on the recovery session, old password still in force, no error shown. The code is one-time, so a retry needed a new one.

Proven: the mechanism, reproduced against `origin/main` in a real browser with synthetic auth. **Not proven: that this is exactly what the affected customer hit.** No customer account, code, token or auth log was inspected, and there is no evidence in this work of the customer's actual save result.

Now:

1. The same reset form stays mounted from code entry through save and sign-out.
2. A rejected save shows its reason on that form; the retry saves against the retained recovery session and does not re-verify the consumed code.
3. The reset finishes only after the save is confirmed for the verified user and the sign-out succeeds. A failed sign-out keeps the form up, never admits the app, and its retry does not save twice.
4. The retained stage is bound to the verified auth user id. If that session is signed out or replaced by another account, the stage is dropped and nothing is saved or signed out against the other account.
5. A refresh or return during an unfinished reset is not treated as a login. The marker that says so is cleared only after a confirmed sign-out or a successful password sign-in.
6. Recovery links work: no code field, save against the link's session.

## Gates

Recorded in `docs/AUDIT_LOG.md` § Gate records.

| Gate | Result | Session | Recorded |
|---|---|---|---|
| T3 Build | committed `36ce1c0` | `recovery-t3` · `bb07d938-e6cb-4b33-bb24-b7110693ccf1` | this file |
| T5 Code Review, round 1 | not met — 1 BLOCKS-SHIP, 1 SHOULD-FIX | `5b538650-d476-4e72-9ad4-c1ff1fb58cf8` | `bf13720` |
| T3 fix for T5 | committed `e508736` | `bb07d938-…` | this file |
| T5 Code Review, round 2 | met — 0 BLOCKS-SHIP | `5b538650-…` | `3031f0c` |
| T6 Security Review | 0 exploitable-today · 3 HARDENING | `521dd74e-d33b-4ef6-b288-4533da8abb87` | `2a132f2` |
| Smoke + Preview | 8/8 on the Ready preview | `bb07d938-…` | this file |

T4 (Build vs Plan) does not apply: the `/fix` path has no plan. Both reviews were source-only; neither reviewer executed the tests. T5 did not review the docs.

Sessions (all Claude Opus 5.5, AIOS `spawn` wrapper in a Codex PTY — not an AIOS.app-owned terminal; no orchestration changes):

- T3 `recovery-t3` — https://claude.ai/code/session_0152qUjdUWv8uCtefmLaMaE4
- T5 `recovery-t5` — https://claude.ai/code/session_01Vi21HLkdfJJn3yhzdu7H7d
- T6 `recovery-t6` — https://claude.ai/code/session_01Ampob28KJy3ZWFBWu6983s

## Files Changed

- `src/lib/passwordRecovery.js` (new) — pure module: recovery hold, auth-event decision, marker rule, startup rule, reset flow
- `src/App.jsx` — auth handler uses the decision; startup guards; applies a confirmed password sign-in
- `src/pages/Login.jsx` — reset form drives the flow; link mode; back / new-code end the session
- `src/lib/passwordRecovery.test.mjs` (new) — 24 synthetic scenarios
- `scripts/check-password-recovery.mjs` (new) — 8 browser scenarios on the real App/Login
- `docs/BACKLOG.md`, `docs/AUDIT_LOG.md`, `docs/handoffs/SC_Handoff_v298.txt`, this file

No dependency, migration, edge-function, mail, Supabase-setting or native change.

## Important Implementation Decisions

- **Hold, not remount.** `Login` raises a module-level hold before verifying the code. While it is up, `App` ignores auth events that carry a session, so its render branch never changes under the form. `SIGNED_OUT` and a rejected token refresh still apply.
- **A hashless `PASSWORD_RECOVERY` is never applied.** It only comes from a typed-code verify, in this tab or broadcast from another.
- **Marker `sc_recovery_user` (localStorage).** Holds the verified user's id while a reset is unfinished — never a code or password. With it set, a session for that user is a recovery session: auth events are held, and startup ends the session instead of admitting the app.
- **The marker outlives every path that leaves the session alive (T5 round 1).** It is cleared only after a confirmed sign-out or a successful password sign-in. A form mounted after a refresh reads the marker and must end a still-live marked session before leaving. Because the marker is still set while a password sign-in emits `SIGNED_IN`, App holds that event and Login hands App the confirmed session.
- **Link recovery had two defects, both fixed.** `Login` stripped the URL hash before the auth client read it, so the link's session was never established (also true on `origin/main`). And with "Remember me" off, the fresh-tab startup sign-out would have ended the link session.
- **`auth.js` unchanged.**

## Verification Performed

All auth traffic synthetic; fake credentials only. No live auth call, reset email, customer read or write.

| Check | Where | Result |
|---|---|---|
| Browser script, 8 scenarios | **Ready Vercel preview** `https://sales-command-l00n980aw-chris7berger-droids-projects.vercel.app` (`dpl_9Ng1qMUpdnByUSSwjwYz1vHamHxf`, git `3031f0c`), 2026-10-01 16:04–16:05 UTC | **8/8 pass** |
| Browser script | local production build of `e508736` | 8/8 pass |
| Browser script | local production build of `36ce1c0` | 6/8 — the two T5 scenarios fail, as expected |
| Browser script, first 6 scenarios | temp copy of `origin/main` `90f890d` | 5/6 fail, as expected |
| Unit | `node src/lib/passwordRecovery.test.mjs` | 24/24 pass |
| Build | `npm run build` | pass |
| Lint, full | `npx eslint .` | 219 problems (176 errors, 43 warnings) — identical to `origin/main` |
| Lint, changed files | | 1 error, pre-existing (`App.jsx` `/terms` redirect) |

Preview command (Deployment Protection left on; the short-lived token is sent only to the preview's own origin and never logged):

    BASE_URL=<preview url> PLAYWRIGHT_MODULE=<path to playwright-core> vercel env run -- node scripts/check-password-recovery.mjs

`git diff e508736 3031f0c -- src scripts index.html package.json` is empty: the preview ran the reviewed code. The same diff against the docs-only commits after it is also empty.

Browser scenarios, on the real DOM:

1. Delayed save → same form mounted, app not entered; forced double submit sends nothing twice; rejection visible; retry verifies once, saves, signs out; lands on sign in; a password sign-in then admits the app.
2. Sign-out failure → message shown, form mounted, app not entered; retry signs out without saving again.
3. Invalid code → message shown, code field still offered, nothing saved.
4. Back to sign in after a verified code → session ended, app not entered.
5. Refresh after a verified code → session ended, reset form, app not entered.
6. Refresh with a failing sign-out → Back and Request a new code blocked, marker kept; returning to the tab does not admit; marker cleared only after a sign-out succeeds.
7. Second tab: a wrong password keeps the marker and is not admitted; the correct password clears it and is admitted.
8. Recovery link with "Remember me" off → no code field, startup does not sign out, save succeeds, lands on sign in.

### What this does not show

- **No real account.** Every Supabase and edge request was answered by a fixture. Real Supabase behaviour (error text, timing, session rules) is assumed from `@supabase/auth-js` 2.99.0 source.
- **No customer confirmation.** Nothing here shows the affected customer can now reset and sign in.
- **No native app.** Web only.
- **Unit-only:** account change before/during a save, and sign-out elsewhere.
- **Read-only:** the "Remember me"-off startup branch with a failing sign-out.

## Visual Verification

Link-mode reset form and its error state viewed in Chrome on a local dev server (fake auth endpoint): linen background, card, inputs, teal button and red error banner unchanged; Email and Reset Code fields absent. The "Code verified." state was checked by DOM text in the browser script, not as a screenshot. No screenshot was taken on the preview.

## Brand check

- Registry: `aios/assets/brand/subcon-command/SUBCON_COMMAND_CURRENT.md` (working copy, 2026-09-30)
- Read: `source-docs/SUBCON_COMMAND_UI_STANDARD_LAUNCH.md` §1, §4 "Semantic colors", §7 "Tone", §10 "Buttons" and "Inputs", §14, §15, §18 "AI coding-agent acceptance checklist"
- Changed surfaces: reset form on the login card only — helper line (two new variants), Email and Reset Code fields hidden once a code is verified or a link is used, new error strings, the two text buttons disabled while a request is in flight
- No new colors, type, radii, surfaces or components; existing inline styles reused
- deviations: none against the sections read
- Not performed: comparison with the canonical Crew Schedule image — nothing visual was added to compare. Visual Brand Guide not opened (no theme, surface, typography or imagery change).

## Deviations From Handoff

None. Beyond the first diagnosis, and inside "recovery links must also work": the early hash strip and the "Remember me" startup sign-out.

## Issues / Follow-up

- **B125** — T6 hardening, three items, none exploitable today. Item 1 (tokenless `#type=recovery` opens the code-less form) was introduced by this change.
- **B126** — T5 SHOULD-FIX: after "saved, sign-out failed, refresh" the user is not told the password was saved.
- A refresh, or a second tab, during an unfinished reset ends the recovery session; a new code is needed.
- While a sign-out keeps failing, Back and Request a new code stay blocked. Fail-closed by design.
- An abandoned recovery-link tab (opened, nothing submitted) leaves a session a new tab would admit. Pre-existing; B125 item 3.
- The browser script needs Playwright, which is not a repo dependency (same as the other `scripts/check-*.mjs`).
- Bugbot was invoked on PR #73 by the coordinator (https://github.com/chris7berger-droid/subcon-command/pull/73#issuecomment-5935475940); result: **skipped, Bugbot is disabled for this repository** (https://github.com/chris7berger-droid/subcon-command/pull/73#issuecomment-5935477064, request id `serverGenReqId_8ffb0f08-00d0-4816-9809-cb0f49d17dba`). It reviewed nothing; this is not a clear or passed result. `session-wrap.mdc` requires one Bugbot pass before merging an app change, so merge is blocked until Chris enables Bugbot or explicitly waives or substitutes it. No settings change was authorized or made.
- **Test-server cleanup caveat.** The build terminal stopped its local test servers with pattern kills (`pkill -f` on `vite --port 5197`, `vite --port 5198`, `vite preview --outDir`), not by PID. Existing office dev servers were seen running afterwards, but it cannot be shown that no other matching process was interrupted. Detail in handoff v298.
