// Password-recovery lifecycle shared by App.jsx (auth events) and Login.jsx
// (the reset form). Pure — no Supabase/React imports — so it runs under node
// with a mocked auth client (passwordRecovery.test.mjs).

// ─── Recovery hold ──────────────────────────────────────────────────────────
// supabase.auth.verifyOtp({ type: "recovery" }) saves a session and emits
// PASSWORD_RECOVERY *before* it returns. If App applies that session, the
// logged-out branch (and the Login inside it) unmounts mid-submit: the save
// result and any error land on a dead component and the user is dropped into
// the app on a recovery session. Login raises this hold before verifying the
// typed code; while it is up, App ignores session-bearing auth events.

let holdActive = false

export function beginRecoveryHold() { holdActive = true }
export function endRecoveryHold() { holdActive = false }
export function isRecoveryHoldActive() { return holdActive }

// What App should do with one auth event.
//   "recovery-link" — a real recovery link was opened: show the reset form
//   "hold"          — a reset is in flight or unfinished: leave state alone
//   "force-logout"  — refresh token rejected
//   "apply"         — normal: mirror the session
export function authEventAction(event, session, { hasRecoveryHash, holdActive, recoveryUserId }) {
  // A hashless PASSWORD_RECOVERY only ever comes from a typed-code verify (this
  // tab's, or another tab's by broadcast) — it is never a login.
  if (event === "PASSWORD_RECOVERY") return hasRecoveryHash ? "recovery-link" : "hold"
  if (session && (holdActive || isUnfinishedRecovery(session, recoveryUserId))) return "hold"
  if (event === "TOKEN_REFRESHED" && !session) return "force-logout"
  return "apply"
}

// ─── Recovery marker ────────────────────────────────────────────────────────
// The recovery session is persisted like any other, so a refresh, a second
// tab, or a return visit would otherwise be admitted to the app on it with the
// password never changed. While a verified reset is unfinished, the verified
// user's id (never the code or a password) is kept under this key; a session
// for that user is then a recovery session, not a login. A password sign-in
// clears it.
export const RECOVERY_USER_KEY = "sc_recovery_user"

export function isUnfinishedRecovery(session, recoveryUserId) {
  return Boolean(recoveryUserId) && session?.user?.id === recoveryUserId
}

// A password sign-in for the marked user is the one session-bearing event that
// must be admitted. The marker is still set while signInWithPassword emits
// SIGNED_IN (it is only cleared once the sign-in has succeeded), so App holds
// that event; Login announces the confirmed login here instead.
let passwordLoginListener = null

export function onPasswordLogin(listener) {
  passwordLoginListener = listener
  return () => { if (passwordLoginListener === listener) passwordLoginListener = null }
}
export function announcePasswordLogin(session) { passwordLoginListener?.(session) }

// "Remember me" unchecked → sign out when a fresh tab opens. Never for a tab a
// recovery link opened: that would end the very session the new password has
// to be saved against.
export function forgetSessionOnOpen({ isRecovery, sessionOnly, remember }) {
  return !isRecovery && !sessionOnly && remember === "false"
}

// ─── Reset flow ─────────────────────────────────────────────────────────────
// One flow per mounted Login. It remembers what already succeeded so a retry
// never repeats a step: the one-time code is consumed by the first successful
// verify, so a rejected save must retry against the retained recovery session,
// and a failed sign-out must not save the password a second time.

export const RECOVERY_MESSAGES = {
  code: "That code is invalid or expired. Request a new one.",
  link: "This reset link is invalid or expired. Request a new code.",
  expired: "Your reset session expired. Request a new code.",
  save: "Failed to update password.",
  signout: "Password updated, but sign-out did not finish. Try again.",
  cancel: "Could not end the reset session. Try again.",
}

// Auth calls normally resolve { data, error }; fold a thrown error into that shape.
async function attempt(call) {
  try {
    return await call()
  } catch (error) {
    return { data: null, error }
  }
}

export function createRecoveryFlow(auth, marker = { get() { return null }, set() {}, clear() {} }) {
  let busy = false
  let verified = false
  let saved = false
  let verifiedUserId = null
  let verifiedEmail = null

  const fail = (reason, message) => ({ ok: false, reason, message, verified, saved })

  // The retained stage belongs to one auth user. Forget it — and never reuse
  // it — once that user's session is signed out or replaced by another account.
  function invalidate() {
    verified = false
    saved = false
    verifiedUserId = null
    verifiedEmail = null
    marker.clear()
    endRecoveryHold()
  }

  function adopt(session, fallbackEmail) {
    verifiedUserId = session.user?.id ?? null
    verifiedEmail = session.user?.email || fallbackEmail
    verified = Boolean(verifiedUserId)
    if (verified) marker.set(verifiedUserId)
    return verified
  }

  // "same" — still the verified user's session; "gone" — signed out;
  // "other" — a different account; "unknown" — the session can't be read.
  async function sessionState(ownerId = verifiedUserId) {
    const { data, error } = await attempt(() => auth.getSession())
    if (error) return "unknown"
    const session = data?.session
    if (!session) return "gone"
    return session.user?.id === ownerId ? "same" : "other"
  }
  const lost = (state) => state === "gone" || state === "other"

  async function submit({ viaLink, email, code, password }) {
    if (busy) return { ok: false, reason: "busy" }
    busy = true
    try {
      if (!verified) {
        if (viaLink) {
          // A recovery link already established the session — there is no code.
          const { data } = await attempt(() => auth.getSession())
          if (!data?.session || !adopt(data.session, email)) return fail("link", RECOVERY_MESSAGES.link)
        } else {
          beginRecoveryHold()
          const { data, error } = await attempt(() => auth.verifyOtp({ email, token: code, type: "recovery" }))
          if (error || !data?.session || !adopt(data.session, email)) {
            endRecoveryHold()
            const expired = !error?.message || error.message === "Token has expired or is invalid"
            return fail("code", expired ? RECOVERY_MESSAGES.code : error.message)
          }
        }
      }

      if (!saved) {
        // Never save a password against anyone but the verified user.
        if (lost(await sessionState())) {
          invalidate()
          return fail("expired", RECOVERY_MESSAGES.expired)
        }
        const { data, error } = await attempt(() => auth.updateUser({ password }))
        if (error || data?.user?.id !== verifiedUserId) {
          if (lost(await sessionState())) {
            invalidate()
            return fail("expired", RECOVERY_MESSAGES.expired)
          }
          return fail("save", error?.message || RECOVERY_MESSAGES.save)
        }
        saved = true
      }

      // The user must sign in fresh with the new password. Until the recovery
      // session is really gone the hold stays up, so it cannot admit the app.
      // If it is already gone or replaced, there is nothing of ours to sign out.
      if (!lost(await sessionState())) {
        const { error } = await attempt(() => auth.signOut())
        if (error) return fail("signout", RECOVERY_MESSAGES.signout)
      }

      const doneEmail = verifiedEmail
      invalidate()
      return { ok: true, email: doneEmail }
    } finally {
      busy = false
    }
  }

  // Back to sign in / request a new code. Drops the recovery session first.
  async function cancel({ viaLink } = {}) {
    if (busy) return { ok: false, reason: "busy" }
    busy = true
    try {
      // A form mounted after a refresh has no verified stage of its own, but
      // the marker may still name a live recovery session (startup could not
      // sign it out). The marker is only cleared once that session is gone.
      const ownerId = verifiedUserId ?? marker.get()
      const live = (!verified && viaLink) || (Boolean(ownerId) && !lost(await sessionState(ownerId)))
      if (live) {
        const { error } = await attempt(() => auth.signOut())
        if (error) return fail("signout", RECOVERY_MESSAGES.cancel)
      }
      invalidate()
      return { ok: true }
    } finally {
      busy = false
    }
  }

  // Auth events seen by the mounted form. Returns true when the retained stage
  // was just invalidated (signed out elsewhere, or another account signed in).
  function observe(session) {
    if (busy || !verified || session?.user?.id === verifiedUserId) return false
    invalidate()
    return true
  }

  return { submit, cancel, observe }
}
