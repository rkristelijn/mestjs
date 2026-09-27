/**
 * mestjs — INTENTIONALLY VULNERABLE session store.
 *
 * Modeled on the documented vulnerabilities of the intentionally-vulnerable
 * Express login (github.com/rkristelijn/login): a MemoryStore-style in-process
 * map that only ever grows, holding a bare boolean per session id with no bound
 * user identity. Recreated in NestJS idiom — this is NOT copied Express code.
 *
 * Do NOT copy any of this into real code. Every antipattern is deliberate slop
 * for scanner training (keur / semgrep / gitleaks) and is marked accordingly.
 */

// KEUR-CATEGORY: security
// KEUR-OWASP: A07-auth-failures A01-broken-access-control
// KEUR-NOTE: self-authored (mestjs) FALSE-NEGATIVE targets — no keur rule fires
//   on this file's content yet (verified: KEUR_RULES_DIRS=~/git/hub/keur/rules
//   keur-rules --dir, 2026-09-26). Two authored gaps live here:
//     KEUR-SESS-003 — the stored session value is a bare truthy flag with no
//        bound subject/user id (a captured id is unrestricted access). Deciding
//        "no identity is bound" needs cross-line/type reasoning, so it is a
//        deliberate FN for a future rule.
//     KEUR-SESS-004 — a MemoryStore-style map inserted-into but never evicted
//        (unbounded growth leak). Proving "never removed on a bound/timer"
//        needs growth/eviction dataflow, out of scope for a static line rule.

// A single session entry. Note there is NO userId / subject bound here — the
// only thing recorded is a bare boolean, so any valid session id is full access.
export interface SessionEntry {
  loggedIn: boolean;
}

// INTENTIONAL (KEUR-SESS-004): MemoryStore-style in-process session map. Entries
// are inserted on every login and NEVER removed on a timer or size bound, so the
// process retains every session it has ever issued — an unbounded growth leak.
const SESSIONS = new Map<string, SessionEntry>();

/**
 * Create a session for a freshly-authenticated request. The stored value is a
 * bare boolean flag — nothing ties the session id to a specific user, so a
 * stolen or guessed id grants the same access as the original login.
 */
export function createSession(id: string): void {
  // INTENTIONAL (KEUR-SESS-003): the stored value is a bare truthy flag with no
  // bound subject/user id — a captured id is unrestricted access to everything.
  SESSIONS.set(id, { loggedIn: true });
}

/** Look up a session by id. Returns the bare-flag entry, or undefined. */
export function getSession(id: string | undefined): SessionEntry | undefined {
  if (!id) return undefined;
  return SESSIONS.get(id);
}

/** Remove one session id (used by logout). */
export function dropSession(id: string | undefined): void {
  if (id) SESSIONS.delete(id);
}

/** Debug helper: how many sessions the process is currently holding. */
export function sessionCount(): number {
  return SESSIONS.size;
}
