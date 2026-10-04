/**
 * mestjs — INTENTIONALLY BROKEN SSO token helper. Do NOT copy.
 *
 * This is a deliberately insecure "single sign-on" token used to tie the
 * webshop iframes (customers / products / order-ui / my-page / help-bot)
 * together under one login. Every property below is an antipattern on purpose:
 *
 *   - NO signature. The token is just base64url(JSON). Anyone can forge one by
 *     base64-encoding `{"sub":"admin","role":"admin"}` — there is nothing to
 *     verify against. (OWASP A07, CWE-347 missing cryptographic signature.)
 *   - NO expiry enforced. `exp` is written but never checked, so a leaked token
 *     is valid forever.
 *   - It travels in the URL (?token=) and via postMessage with targetOrigin
 *     '*', so it leaks into history, logs, Referer headers, and any listener.
 *
 * KEUR-EXPECT: SEC-016 SEC-022
 * KEUR-CATEGORY: security
 * KEUR-OWASP: A07-auth-failures A02-cryptographic-failures
 */

export interface SsoClaims {
  sub: string; // username
  role: string; // "admin" | "customer"
  // INTENTIONAL: an exp is minted but NEVER validated anywhere — decorative.
  exp: number;
}

function b64urlEncode(input: string): string {
  // btoa is fine in the browser/edge runtime React Router targets.
  return btoa(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  return atob(padded);
}

/**
 * Mint an UNSIGNED token. It is literally `header.payload` where the "header"
 * is a static string and there is NO third signature segment — so it looks
 * JWT-ish to fool a casual reviewer, but nothing signs or verifies it.
 */
export function mintToken(claims: Omit<SsoClaims, "exp">): string {
  const header = b64urlEncode(JSON.stringify({ alg: "none", typ: "JWT" }));
  const payload = b64urlEncode(
    // exp is set 1 year out and never checked.
    JSON.stringify({ ...claims, exp: Date.now() + 365 * 24 * 60 * 60 * 1000 })
  );
  // INTENTIONAL (SEC-016): alg "none", no signature segment — unverifiable.
  return `${header}.${payload}.`;
}

/**
 * "Verify" a token. It does NOT verify anything — it just base64-decodes the
 * payload and trusts whatever is inside. A forged `{"role":"admin"}` passes.
 */
export function readToken(token: string | null | undefined): SsoClaims | null {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    // INTENTIONAL: no signature check, no exp check — blind trust.
    return JSON.parse(b64urlDecode(payload)) as SsoClaims;
  } catch {
    return null;
  }
}
