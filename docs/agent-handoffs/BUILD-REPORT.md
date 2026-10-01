## Status

**B124 — password-recovery lifecycle fix: built, stopped at the build gate. Do not merge.**

Not done: Code Review, Security Review, Vercel preview, Chris's acceptance. Not pushed.

- Role: T3 Build · mode: build (initial, `/fix` path) · agent/session `recovery-t3` / `bb07d938-e6cb-4b33-bb24-b7110693ccf1`
- Branch: `fix/recovery-save-stability`, based on `origin/main` `90f890d`
- Path: in-flow bug fix (`/fix`), no plan document; scope from the T7 routing packet of 2026-10-01

## Summary

Resetting a password with the emailed code could drop the user into the app before the new password was saved, and hide a failed save.

Cause: `supabase.auth.verifyOtp({ type: "recovery" })` saves a session and emits `PASSWORD_RECOVERY` before it returns. `App.jsx` treated that event (no recovery hash in the URL) as stale and applied the session. The logged-out branch unmounted, taking the `Login` that owned the reset form with it. A rejected or slow `updateUser` then reported to a component that no longer existed: the user was in the app on the recovery session, old password still in force, no error shown. The code is one-time, so a retry needed a new one.

What is proven: the mechanism, reproduced against `origin/main` in a real browser with synthetic auth. What is not proven: that this is exactly what the affected customer hit. No customer account, code or token was inspected.

Now:

1. The same reset form stays mounted from code entry through save and sign-out.
2. A rejected save shows its reason on that form; the retry saves against the retained recovery session and does not re-verify the consumed code.
3. The reset finishes only after the save is confirmed for the verified user and the sign-out succeeds. A failed sign-out keeps the form up, never admits the app, and its retry does not save the password twice.
4. The retained stage is bound to the verified auth user id. If that session is signed out, or another account's session replaces it, the stage is dropped and nothing is saved or signed out against the other account.
5. A refresh or return during an unfinished reset is not treated as a login: the recovery session is ended and the reset form returns.
6. Recovery links work: no code field, save against the link's session.

## Files Changed

- `src/lib/passwordRecovery.js` (new) — pure module: recovery hold, auth-event decision, startup rule, reset flow
- `src/lib/passwordRecovery.test.mjs` (new) — 21 synthetic scenarios
- `scripts/check-password-recovery.mjs` (new) — browser regression on the real App/Login
- `src/App.jsx` — auth handler uses the decision; startup guards
- `src/pages/Login.jsx` — reset form drives the flow; link mode; back / new-code end the session
- `docs/BACKLOG.md`, `docs/handoffs/SC_Handoff_v298.txt`, this file

No dependency, migration, edge-function, mail, or native change.

## Important Implementation Decisions

- **Hold, not remount.** `Login` raises a module-level hold before verifying the code. While it is up, `App` ignores auth events that carry a session, so its render branch never changes under the form. `SIGNED_OUT` and a rejected token refresh still apply.
- **A hashless `PASSWORD_RECOVERY` is never applied.** It only comes from a typed-code verify, in this tab or broadcast from another. Previously it was applied as a "stale" event.
- **Marker `sc_recovery_user` (localStorage).** Holds the verified user's id while a reset is unfinished — never a code or password. With it set, a session for that user is a recovery session: auth events are held, and startup ends the session instead of admitting the app. Cleared on finish, back, new code, invalidation, and any password sign-in.
- **Link recovery had two defects, both fixed.** `Login` stripped the URL hash on mount, before the auth client's async startup read it, so the link's session was never established (also true on `origin/main`). And with "Remember me" off, the fresh-tab startup sign-out would have ended the link session. `sc_recovery_mode` now stays set until the reset finishes or is left, so a refresh returns to the form.
- **Back to sign in from a link reloads `/login`.** `App` pins a link-opened tab to the reset form until reload; without the reload a normal sign-in afterwards would stay stuck on the login card.
- **`auth.js` unchanged.** Its listener invokes the App callback without returning its promise; nothing here depends on that.

## Verification Performed

Run from the worktree. All auth traffic synthetic; fake credentials only.

| Check | Command | Result |
|---|---|---|
| Unit, 21 scenarios | `node src/lib/passwordRecovery.test.mjs` | pass |
| Browser, fix, dev server | `BASE_URL=http://localhost:5197 PLAYWRIGHT_MODULE=/tmp/recovery-browser-tools/node_modules/playwright-core/index.mjs node scripts/check-password-recovery.mjs` | 6/6 pass |
| Browser, fix, production build (`vite build` + `vite preview`) | same, `BASE_URL=http://localhost:5199` | 6/6 pass |
| Browser, baseline `origin/main` `90f890d` (source copied to a temp dir) | same, `BASE_URL=http://localhost:5198` | 5/6 fail, as expected |
| Build | `npm run build` | pass |
| Lint, changed files | `npx eslint src/App.jsx src/pages/Login.jsx src/lib/passwordRecovery.js src/lib/passwordRecovery.test.mjs scripts/check-password-recovery.mjs` | 1 error, pre-existing (`App.jsx` `/terms` redirect, `react-hooks/immutability`) |
| Lint, full | `npx eslint .` | 219 problems (176 errors, 43 warnings) — identical to baseline |

Servers were started with `VITE_SUPABASE_URL=http://127.0.0.1:9 VITE_SUPABASE_ANON_KEY=fake-anon-key`, an address nothing listens on.

Baseline failures (the red): app entered while the save was in flight; sign-out-failure, back, and refresh scenarios never reached their message because the form was gone; the link form still asked for a code. Invalid code passes on both.

Browser scenarios, on the real DOM:

1. Delayed save → same form mounted for 4.5 s, app not entered; forced double submit sends nothing twice; rejection visible; retry verifies once, saves, signs out; lands on sign in; a password sign-in then admits the app.
2. Sign-out failure → message shown, form mounted, app not entered; retry signs out without saving again.
3. Invalid code → message shown, code field still offered, nothing saved.
4. Back to sign in after a verified code → session ended, sign-in form, app not entered.
5. Refresh after a verified code → session ended, reset form, app not entered.
6. Recovery link with "Remember me" off → no code field, startup does not sign out, save succeeds, lands on sign in.

The unit test's first scenario reproduces the bug through a model of the pre-fix handler; the browser baseline run is the evidence on real code.

Completion: code built **yes** · data applied **n/a** · authenticated access verified **no** (synthetic only) · Chris accepted **not T3's to claim**.

## Visual Verification

Link-mode reset form and its error state viewed in Chrome on the local dev server (fake auth endpoint): linen background, card, input, teal button and red error banner unchanged; Email and Reset Code fields absent. The "Code verified." state was checked by DOM text in the browser script, not viewed as a screenshot.

## Brand check

- Registry: `aios/assets/brand/subcon-command/SUBCON_COMMAND_CURRENT.md` (working copy, 2026-09-30)
- Read: `source-docs/SUBCON_COMMAND_UI_STANDARD_LAUNCH.md` §1 (do not redesign), §4 "Semantic colors", §7 "Tone", §10 "Buttons" and "Inputs", §14, §15, §18 "AI coding-agent acceptance checklist"
- Changed surfaces: reset form on the login card only — helper line (two new variants), Email and Reset Code fields hidden once a code is verified or a link is used, four new error strings, the two text buttons disabled while a request is in flight
- No new colors, type, radii, surfaces or components; existing inline styles reused
- deviations: none against the sections read
- Not performed: comparison with the canonical Crew Schedule image (§18 last item) — nothing visual was added to compare. Visual Brand Guide not opened (no theme, surface, typography or imagery change).
- Noted, not changed: the login card's existing styling (teal accent, token names) predates this slice.

## Deviations From Handoff

None. Two items beyond the first diagnosis, both inside "recovery links must also work": the early hash strip, and the "Remember me" startup sign-out.

## Issues / Follow-up

- **Refresh after a verified code needs a new code.** The session is ended on return rather than resumed. Safe, but one extra email.
- **Opening a second tab during an unfinished reset ends it** for the same reason. The first tab shows "Your reset session expired."
- **Abandoned link tab.** If a recovery link is opened and the tab is closed before anything is submitted, the link's session stays in storage with no marker; a new tab would admit it. Pre-existing. Reset emails send codes, not links.
- **Stale reset form after "Remember me"-off startup.** Returns to the code screen with a consumed code; the user must request a new one. Pre-existing shape.
- The browser script needs Playwright, which is not a repo dependency (same as the other `scripts/check-*.mjs`).
- Not run: Bugbot, `/code-review`, `/security-review`. This change touches auth and sessions, so Security Review cannot be skipped.
