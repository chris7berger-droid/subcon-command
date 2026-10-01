// Run: node src/lib/passwordRecovery.test.mjs
// Synthetic only — a mocked auth client, fake credentials, no network.
import {
  RECOVERY_MESSAGES,
  authEventAction,
  createRecoveryFlow,
  endRecoveryHold,
  forgetSessionOnOpen,
  isRecoveryHoldActive,
  isUnfinishedRecovery,
} from "./passwordRecovery.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const EMAIL = "crew.lead@example.test";
const GOOD_CODE = "000000";
const PASSWORD = "fake-new-password";

// Mocked auth client. Mirrors the two behaviors the bug depends on
// (@supabase/auth-js 2.99.0): verifyOtp saves the session and notifies
// subscribers BEFORE it returns, and a recovery code works exactly once.
function fakeAuth({ updateUser = [], signOut = [] } = {}) {
  const listeners = [];
  let session = null;
  let codeConsumed = false;
  const calls = { verifyOtp: 0, updateUser: 0, signOut: 0 };
  const emit = (event, s) => listeners.forEach((l) => l(event, s));
  let releaseSave = null;
  return {
    calls,
    emit,
    onAuthStateChange: (l) => listeners.push(l),
    session: () => session,
    setSession: (s) => { session = s; },
    releaseSave: () => releaseSave?.(),
    async getSession() {
      return { data: { session }, error: null };
    },
    async verifyOtp({ email, token, type }) {
      calls.verifyOtp += 1;
      if (type !== "recovery" || token !== GOOD_CODE || codeConsumed) {
        return { data: { user: null, session: null }, error: { message: "Token has expired or is invalid" } };
      }
      codeConsumed = true;
      session = { access_token: "fake-token", user: { id: "fake-user", email } };
      emit("PASSWORD_RECOVERY", session);
      return { data: { user: session.user, session }, error: null };
    },
    async updateUser() {
      calls.updateUser += 1;
      const step = updateUser.shift() ?? "ok";
      if (step === "delay") await new Promise((resolve) => { releaseSave = resolve; });
      if (step === "throw") throw new Error("Failed to fetch");
      if (step === "session-lost") {
        session = null;
        emit("SIGNED_OUT", null);
        return { data: { user: null }, error: { message: "Auth session missing!" } };
      }
      if (step !== "ok" && step !== "delay") return { data: { user: null }, error: { message: step } };
      emit("USER_UPDATED", session);
      return { data: { user: session.user }, error: null };
    },
    async signOut() {
      calls.signOut += 1;
      if ((signOut.shift() ?? "ok") !== "ok") return { error: { message: "Failed to fetch" } };
      session = null;
      emit("SIGNED_OUT", null);
      return { error: null };
    },
    async signInWithPassword() {
      session = { access_token: "fake-token-2", user: { id: "fake-user", email: EMAIL } };
      emit("SIGNED_IN", session);
      return { data: { session }, error: null };
    },
  };
}

// The App.jsx auth handler before this fix: a hashless PASSWORD_RECOVERY was
// treated as stale and its session applied.
const legacyAction = (event, session, { hasRecoveryHash }) => {
  if (event === "PASSWORD_RECOVERY" && hasRecoveryHash) return "recovery-link";
  if (event === "TOKEN_REFRESHED" && !session) return "force-logout";
  return "apply";
};

// Stand-in for App: Login (and the flow it owns) stays mounted only while App
// holds no session. `mounts` counts how many times the logged-out branch was
// entered, so a remount is visible.
function mountApp(auth, decide, { hasRecoveryHash = false } = {}) {
  const app = { session: null, mounts: 1 };
  auth.onAuthStateChange((event, s) => {
    const action = decide(event, s, { hasRecoveryHash, holdActive: isRecoveryHoldActive() });
    if (action === "hold" || action === "recovery-link") return;
    const next = action === "force-logout" ? null : (s ?? null);
    if (app.session && !next) app.mounts += 1;
    app.session = next;
  });
  app.loginMounted = () => app.session === null;
  return app;
}

const submitTyped = (flow, over = {}) =>
  flow.submit({ viaLink: false, email: EMAIL, code: GOOD_CODE, password: PASSWORD, ...over });

async function run(name, fn) {
  endRecoveryHold();
  await fn();
  assert(!isRecoveryHoldActive(), `${name}: hold must not leak past the scenario`);
  console.log(`ok - ${name}`);
}

// ── Red: the pre-fix handler unmounts Login mid-submit ──────────────────────
await run("confirmed bug: pre-fix handler admits the recovery session mid-submit", async () => {
  const auth = fakeAuth({ updateUser: ["New password should be different from the old password."] });
  const app = mountApp(auth, legacyAction);
  const res = await submitTyped(createRecoveryFlow(auth));
  assert(!res.ok && res.reason === "save", "the save was rejected");
  assert(!app.loginMounted(), "confirmed bug: Login was unmounted, so the save error had nowhere to show");
  assert(app.session?.access_token === "fake-token", "confirmed bug: the app was entered on the recovery session");
  endRecoveryHold();
});

// ── Decision table ──────────────────────────────────────────────────────────
await run("auth event decisions", async () => {
  const s = { access_token: "fake-token" };
  const d = (event, session, hasRecoveryHash, holdActive) =>
    authEventAction(event, session, { hasRecoveryHash, holdActive });
  assert(d("PASSWORD_RECOVERY", s, true, false) === "recovery-link", "recovery link → reset form");
  assert(d("PASSWORD_RECOVERY", s, true, true) === "recovery-link", "recovery link wins over a hold");
  assert(d("PASSWORD_RECOVERY", s, false, true) === "hold", "typed code: hashless PASSWORD_RECOVERY is held");
  assert(d("USER_UPDATED", s, false, true) === "hold", "USER_UPDATED is held");
  assert(d("TOKEN_REFRESHED", s, false, true) === "hold", "TOKEN_REFRESHED with a session is held");
  assert(d("SIGNED_IN", s, false, true) === "hold", "SIGNED_IN is held");
  assert(d("SIGNED_OUT", null, false, true) === "apply", "SIGNED_OUT still applies during a hold");
  assert(d("TOKEN_REFRESHED", null, false, true) === "force-logout", "rejected refresh still forces logout");
  assert(d("PASSWORD_RECOVERY", s, false, false) === "hold", "another tab's typed-code verify is never a login");
  const u = { access_token: "fake-token", user: { id: "fake-user" } };
  const m = (event, session, recoveryUserId) =>
    authEventAction(event, session, { hasRecoveryHash: false, holdActive: false, recoveryUserId });
  assert(m("TOKEN_REFRESHED", u, "fake-user") === "hold", "unfinished reset: that user's session is not admitted");
  assert(m("SIGNED_IN", u, "someone-else") === "apply", "another user's sign-in is unaffected by the marker");
  assert(m("SIGNED_IN", u, null) === "apply", "no marker: sign-in unchanged");
  assert(m("SIGNED_OUT", null, "fake-user") === "apply", "sign-out applies with a marker set");
  assert(d("SIGNED_IN", s, false, false) === "apply", "no hold: sign-in unchanged");
  assert(d("TOKEN_REFRESHED", null, false, false) === "force-logout", "no hold: rejected refresh unchanged");
});

// ── Typed code ──────────────────────────────────────────────────────────────
await run("typed code: success, then a fresh sign-in is admitted", async () => {
  const auth = fakeAuth();
  const app = mountApp(auth, authEventAction);
  const res = await submitTyped(createRecoveryFlow(auth));
  assert(res.ok && res.email === EMAIL, "reset completes and reports the verified email");
  assert(app.loginMounted() && app.mounts === 1, "the same Login stayed mounted throughout");
  assert(auth.session() === null, "the recovery session was signed out");
  assert(auth.calls.verifyOtp === 1 && auth.calls.updateUser === 1 && auth.calls.signOut === 1, "one call per step");
  await auth.signInWithPassword();
  assert(app.session?.access_token === "fake-token-2", "the fresh sign-in is admitted");
});

await run("typed code: invalid code", async () => {
  const auth = fakeAuth();
  const app = mountApp(auth, authEventAction);
  const flow = createRecoveryFlow(auth);
  const res = await submitTyped(flow, { code: "111111" });
  assert(!res.ok && res.reason === "code" && res.message === RECOVERY_MESSAGES.code, "invalid code is reported");
  assert(!res.verified && auth.calls.updateUser === 0, "nothing was saved");
  assert(app.loginMounted() && !isRecoveryHoldActive(), "Login stays; hold released");
  const again = await submitTyped(flow);
  assert(again.ok, "a correct code afterwards still works");
});

await run("typed code: rejected save retries without re-verifying the consumed code", async () => {
  const auth = fakeAuth({ updateUser: ["New password should be different from the old password."] });
  const app = mountApp(auth, authEventAction);
  const flow = createRecoveryFlow(auth);
  const first = await submitTyped(flow);
  assert(!first.ok && first.reason === "save", "the rejection is returned to the mounted form");
  assert(first.message === "New password should be different from the old password.", "with the server's reason");
  assert(first.verified && !first.saved, "the verified session is retained");
  assert(app.loginMounted() && app.mounts === 1 && app.session === null, "Login stays mounted; app not entered");
  assert(isRecoveryHoldActive(), "hold stays up between attempts");
  auth.emit("TOKEN_REFRESHED", auth.session());
  assert(app.session === null, "a token refresh between attempts does not admit the app");
  const second = await submitTyped(flow, { password: "another-fake-password" });
  assert(second.ok, "the retry saves");
  assert(auth.calls.verifyOtp === 1, "the consumed code was not verified again");
  assert(auth.calls.updateUser === 2, "only the save was retried");
  assert(app.loginMounted() && app.mounts === 1, "still the same Login");
});

await run("typed code: thrown save error is surfaced and retryable", async () => {
  const auth = fakeAuth({ updateUser: ["throw"] });
  const app = mountApp(auth, authEventAction);
  const flow = createRecoveryFlow(auth);
  const first = await submitTyped(flow);
  assert(!first.ok && first.reason === "save" && first.message === "Failed to fetch", "network failure is shown");
  assert(app.loginMounted() && first.verified, "form and session retained");
  assert((await submitTyped(flow)).ok && auth.calls.verifyOtp === 1, "retry succeeds without the code");
});

await run("typed code: delayed save holds the form; double click is ignored", async () => {
  const auth = fakeAuth({ updateUser: ["delay"] });
  const app = mountApp(auth, authEventAction);
  const flow = createRecoveryFlow(auth);
  const pending = submitTyped(flow);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert(app.loginMounted() && isRecoveryHoldActive(), "form held while the save is in flight");
  const dbl = await submitTyped(flow);
  assert(!dbl.ok && dbl.reason === "busy", "second click is ignored");
  const back = await flow.cancel();
  assert(!back.ok && back.reason === "busy", "cancel is ignored while a save is in flight");
  auth.emit("TOKEN_REFRESHED", auth.session());
  assert(app.session === null, "token refresh during the save does not admit the app");
  auth.releaseSave();
  assert((await pending).ok, "the delayed save completes");
  assert(auth.calls.verifyOtp === 1 && auth.calls.updateUser === 1, "no duplicate verify or save");
  assert(app.loginMounted() && app.mounts === 1, "same Login throughout");
});

await run("typed code: sign-out failure keeps recovery and never admits the app", async () => {
  const auth = fakeAuth({ signOut: ["fail"] });
  const app = mountApp(auth, authEventAction);
  const flow = createRecoveryFlow(auth);
  const first = await submitTyped(flow);
  assert(!first.ok && first.reason === "signout" && first.saved, "password saved; sign-out failed");
  assert(isRecoveryHoldActive() && app.session === null && app.loginMounted(), "recovery kept; app not admitted");
  auth.emit("TOKEN_REFRESHED", auth.session());
  assert(app.session === null, "still not admitted on a later refresh");
  const second = await submitTyped(flow);
  assert(second.ok, "retry finishes");
  assert(auth.calls.updateUser === 1 && auth.calls.verifyOtp === 1, "password and code were not sent twice");
  assert(auth.session() === null, "recovery session ended");
});

await run("typed code: recovery session lost during the save", async () => {
  const auth = fakeAuth({ updateUser: ["session-lost"] });
  const app = mountApp(auth, authEventAction);
  const res = await submitTyped(createRecoveryFlow(auth));
  assert(!res.ok && res.reason === "expired" && !res.verified, "user is told to request a new code");
  assert(app.loginMounted() && !isRecoveryHoldActive(), "form stays; hold released");
});

await run("typed code: back after a verified code ends the recovery session", async () => {
  const auth = fakeAuth({ updateUser: ["Password should be at least 6 characters."], signOut: ["fail"] });
  const app = mountApp(auth, authEventAction);
  const flow = createRecoveryFlow(auth);
  await submitTyped(flow);
  const blocked = await flow.cancel();
  assert(!blocked.ok && blocked.message === RECOVERY_MESSAGES.cancel, "failed sign-out blocks leaving");
  assert(isRecoveryHoldActive() && app.session === null, "recovery kept; app not admitted");
  const left = await flow.cancel();
  assert(left.ok && auth.session() === null && !isRecoveryHoldActive(), "back ends the session and the hold");
  assert(app.loginMounted() && app.mounts === 1, "same Login returns to sign in");
  await auth.signInWithPassword();
  assert(app.session?.access_token === "fake-token-2", "normal sign-in works afterwards");
});

await run("typed code: back before verifying makes no auth call", async () => {
  const auth = fakeAuth();
  const res = await createRecoveryFlow(auth).cancel();
  assert(res.ok && auth.calls.signOut === 0, "nothing to sign out");
});

// ── Recovery link ───────────────────────────────────────────────────────────
await run("recovery link: saves against the link session with no code", async () => {
  const auth = fakeAuth();
  auth.setSession({ access_token: "fake-link-token", user: { id: "fake-user", email: EMAIL } });
  const flow = createRecoveryFlow(auth);
  const res = await flow.submit({ viaLink: true, email: "", code: "", password: PASSWORD });
  assert(res.ok && res.email === EMAIL, "reset completes with the link session's email");
  assert(auth.calls.verifyOtp === 0, "no code is verified for a link");
  assert(auth.session() === null, "link session signed out");
});

await run("recovery link: rejected save is retryable", async () => {
  const auth = fakeAuth({ updateUser: ["New password should be different from the old password."] });
  auth.setSession({ access_token: "fake-link-token", user: { id: "fake-user", email: EMAIL } });
  const flow = createRecoveryFlow(auth);
  const first = await flow.submit({ viaLink: true, email: "", code: "", password: PASSWORD });
  assert(!first.ok && first.reason === "save" && first.verified, "rejection shown; session retained");
  assert((await flow.submit({ viaLink: true, email: "", code: "", password: "another-fake-password" })).ok, "retry saves");
});

await run("recovery link: no session means the link is dead", async () => {
  const auth = fakeAuth();
  const res = await createRecoveryFlow(auth).submit({ viaLink: true, email: "", code: "", password: PASSWORD });
  assert(!res.ok && res.reason === "link" && res.message === RECOVERY_MESSAGES.link, "dead link is reported");
  assert(auth.calls.updateUser === 0, "nothing was saved");
});

await run("recovery link: back signs the link session out", async () => {
  const auth = fakeAuth();
  auth.setSession({ access_token: "fake-link-token", user: { id: "fake-user", email: EMAIL } });
  const res = await createRecoveryFlow(auth).cancel({ viaLink: true });
  assert(res.ok && auth.session() === null, "link session ended on back");
});

// ── Identity binding, marker, refresh/return ────────────────────────────────
function fakeMarker() {
  const m = { value: null, set: (id) => { m.value = id; }, clear: () => { m.value = null; } };
  return m;
}
const OTHER = { access_token: "fake-other-token", user: { id: "fake-other-user", email: "other@example.test" } };

await run("identity: retained stage is bound to the verified user id and marked", async () => {
  const auth = fakeAuth({ updateUser: ["Password should be at least 6 characters."] });
  const marker = fakeMarker();
  const flow = createRecoveryFlow(auth, marker);
  await submitTyped(flow);
  assert(marker.value === "fake-user", "marker holds the verified user id — never the code or password");
  assert((await submitTyped(flow)).ok && marker.value === null, "marker cleared when the reset finishes");
});

await run("identity: account change before retry — the other account is never touched", async () => {
  const auth = fakeAuth({ updateUser: ["Password should be at least 6 characters."] });
  const marker = fakeMarker();
  const flow = createRecoveryFlow(auth, marker);
  await submitTyped(flow);
  auth.setSession(OTHER);
  const res = await submitTyped(flow);
  assert(!res.ok && res.reason === "expired" && !res.verified, "retained stage is invalidated");
  assert(auth.calls.updateUser === 1, "no password was saved against the other account");
  assert(auth.calls.signOut === 0 && auth.session() === OTHER, "the other account was not signed out");
  assert(marker.value === null && !isRecoveryHoldActive(), "marker and hold cleared");
});

await run("identity: account change during the save does not confirm the reset", async () => {
  const auth = fakeAuth({ updateUser: ["delay"] });
  const flow = createRecoveryFlow(auth, fakeMarker());
  const pending = submitTyped(flow);
  await new Promise((resolve) => setTimeout(resolve, 0));
  auth.setSession(OTHER);
  auth.releaseSave();
  const res = await pending;
  assert(!res.ok && res.reason === "expired", "a save confirmed for a different user is not accepted");
  assert(auth.calls.signOut === 0, "the other account was not signed out");
});

await run("identity: signed out elsewhere invalidates the retained stage", async () => {
  const auth = fakeAuth({ updateUser: ["Password should be at least 6 characters."] });
  const marker = fakeMarker();
  const flow = createRecoveryFlow(auth, marker);
  await submitTyped(flow);
  assert(flow.observe(auth.session()) === false, "the verified user's own events keep the stage");
  auth.setSession(null);
  assert(flow.observe(null) === true, "sign-out elsewhere invalidates it");
  assert(marker.value === null && !isRecoveryHoldActive(), "marker and hold cleared");
  const res = await submitTyped(flow);
  assert(!res.ok && res.reason === "code", "the consumed code cannot be reused — a new code is required");
  assert(auth.calls.updateUser === 1, "nothing further was saved");
});

await run("identity: back after an account change leaves the other account alone", async () => {
  const auth = fakeAuth({ updateUser: ["Password should be at least 6 characters."] });
  const flow = createRecoveryFlow(auth, fakeMarker());
  await submitTyped(flow);
  auth.setSession(OTHER);
  assert((await flow.cancel()).ok && auth.calls.signOut === 0, "cancel does not sign out a different account");
});

await run("refresh/return: a persisted recovery session is not a login", async () => {
  const recovery = { access_token: "fake-token", user: { id: "fake-user" } };
  assert(isUnfinishedRecovery(recovery, "fake-user"), "startup with marker + that user's session → end it, do not admit");
  assert(!isUnfinishedRecovery(recovery, null), "no marker → normal startup");
  assert(!isUnfinishedRecovery(OTHER, "fake-user"), "a different user's session is a normal login");
  assert(!isUnfinishedRecovery(null, "fake-user"), "no session → nothing to end");
  const open = (isRecovery, sessionOnly, remember) => forgetSessionOnOpen({ isRecovery, sessionOnly, remember });
  assert(open(false, null, "false") === true, "remember off + fresh tab → startup sign-out (unchanged)");
  assert(open(true, null, "false") === false, "remember off + recovery link → the link session is kept");
  assert(open(false, "true", "false") === false, "same-tab session is kept (unchanged)");
  assert(open(false, null, "true") === false && open(false, null, null) === false, "remember on → no sign-out");
});

console.log("passwordRecovery: all scenarios passed");
