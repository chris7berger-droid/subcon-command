// Saving is enabled only for the disposable local database.
// A production URL never qualifies, even if the flag is set.

export const ISOLATED_JWT_SECRET = "isolated-time-clock-not-production-secret";
export const ISOLATED_ADMIN_AUTH_ID = "33333333-3333-3333-3333-333333333333";
export const ISOLATED_ADMIN_MEMBER_ID = "22222222-2222-2222-2222-222222222222";

function localHost(host) {
  return host === "127.0.0.1" || host === "localhost";
}

export function isolatedTimeClockEnabledFrom(env, pageHost = "") {
  if (env?.VITE_TIME_CLOCK_ISOLATED !== "1") return false;
  let dataHost = "";
  try {
    dataHost = new URL(env.VITE_SUPABASE_URL || "").hostname;
  } catch {
    return false;
  }
  if (!localHost(dataHost)) return false;
  if (pageHost && !localHost(pageHost)) return false;
  return true;
}

export function isolatedTimeClockEnabled() {
  const pageHost = typeof window === "undefined" ? "" : window.location.hostname;
  return isolatedTimeClockEnabledFrom(import.meta.env, pageHost);
}

export function isolatedOfficeMember() {
  return {
    id: ISOLATED_ADMIN_MEMBER_ID,
    name: "Office Admin",
    role: "Admin",
    apps: ["field"],
    email: "office@isolated.local",
  };
}

function base64Url(bytes) {
  const text = btoa(String.fromCharCode(...bytes));
  return text.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export async function signIsolatedJwt(sub, role) {
  const encoder = new TextEncoder();
  const header = base64Url(encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT", kid: "dev-key-1" })));
  const now = Math.floor(Date.now() / 1000);
  const body = base64Url(encoder.encode(JSON.stringify({
    sub,
    role,
    aud: "http://127.0.0.1:8080",
    iat: now,
    exp: now + 60 * 60 * 12,
  })));
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(ISOLATED_JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(`${header}.${body}`)));
  return `${header}.${body}.${base64Url(signature)}`;
}

export function isolatedAdminToken() {
  return signIsolatedJwt(ISOLATED_ADMIN_AUTH_ID, "authenticated");
}
