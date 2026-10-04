import { useState } from "react";
import type { Route } from "./+types/home";
import { mintToken } from "../sso-token";

/**
 * mestjs — INTENTIONALLY BROKEN SSO login. Do NOT copy.
 *
 * Flow (every step is an antipattern):
 *   1. The shell sends the user here with ?redirect=<shell-callback-url>.
 *   2. We "authenticate" against a hardcoded user table (admin/admin,
 *      alice/alice) — no real backend, no password hashing.
 *   3. We mint an UNSIGNED token (see sso-token.ts) and bounce back to the
 *      redirect URL with the token appended as a ?token= query parameter.
 *   4. The redirect target is whatever the caller asked for — NO allow-list,
 *      so this is also an open redirect / token-exfiltration primitive.
 *
 * KEUR-EXPECT: SEC-002 KEUR-SEC-002
 * KEUR-CATEGORY: security
 * KEUR-OWASP: A01-broken-access-control A07-auth-failures
 */

export function meta(_: Route.MetaArgs) {
  return [{ title: "mestjs SSO (insecure)" }];
}

// INTENTIONAL (KEUR-SEC-002): hardcoded credential table in source. Mirrors the
// API's admin/admin + alice/alice so the whole webshop shares one broken login.
const USERS: Record<string, { password: string; role: string }> = {
  admin: { password: "admin", role: "admin" },
  alice: { password: "alice", role: "customer" },
};

// INTENTIONAL: wide-open CORS so any origin can drive the SSO endpoint.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

/**
 * The "token endpoint". POST { username, password, redirect } and get bounced
 * back to `redirect?token=<unsigned-token>`. No CSRF token, no origin check.
 */
export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const username = String(form.get("username") ?? "");
  const password = String(form.get("password") ?? "");
  // INTENTIONAL: redirect target is attacker-controllable, no allow-list.
  const redirect = String(form.get("redirect") ?? "http://localhost:3001");

  const user = USERS[username];
  if (!user || user.password !== password) {
    return Response.json({ ok: false, error: "bad credentials" }, {
      status: 401,
      headers: CORS,
    });
  }

  const token = mintToken({ sub: username, role: user.role });

  // INTENTIONAL: token handed back in the URL query string (?token=). It will
  // leak into browser history, server logs, and the Referer header of every
  // subresource the shell loads. (OAuth RFC explicitly forbids this.)
  const sep = redirect.includes("?") ? "&" : "?";
  const location = `${redirect}${sep}token=${encodeURIComponent(token)}`;
  return new Response(null, { status: 302, headers: { ...CORS, Location: location } });
}

export default function SsoLogin() {
  const [params] = useState(() =>
    typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams()
  );
  const redirect = params.get("redirect") ?? "http://localhost:3001";

  return (
    <main style={{ fontFamily: "Inter, system-ui, sans-serif", maxWidth: 420, margin: "4rem auto", padding: "0 1rem" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>🔐 mestjs SSO</h1>
      <p style={{ color: "#b45309", fontSize: ".85rem" }}>
        Intentionally insecure single sign-on. Unsigned tokens, token-in-URL,
        open redirect, CORS <code>*</code>. Do not deploy.
      </p>

      <form method="post" action="/?index" style={{ display: "grid", gap: ".75rem", marginTop: "1.5rem" }}>
        <input type="hidden" name="redirect" value={redirect} />
        <label style={{ display: "grid", gap: ".25rem" }}>
          <span>Username</span>
          <input name="username" defaultValue="admin" autoComplete="username"
            style={{ padding: ".5rem", border: "1px solid #ccc", borderRadius: 6 }} />
        </label>
        <label style={{ display: "grid", gap: ".25rem" }}>
          <span>Password</span>
          <input name="password" type="password" defaultValue="admin" autoComplete="current-password"
            style={{ padding: ".5rem", border: "1px solid #ccc", borderRadius: 6 }} />
        </label>
        <button type="submit"
          style={{ padding: ".6rem", background: "#111", color: "#fff", border: 0, borderRadius: 6, cursor: "pointer" }}>
          Sign in
        </button>
      </form>

      <p style={{ fontSize: ".75rem", color: "#666", marginTop: "1rem" }}>
        Demo users: <code>admin/admin</code>, <code>alice/alice</code>
      </p>
    </main>
  );
}
