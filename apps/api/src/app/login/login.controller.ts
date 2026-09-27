import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import {
  createSession,
  dropSession,
  getSession,
  sessionCount,
} from './session.store';

/**
 * mestjs — INTENTIONALLY VULNERABLE, hijackable login.
 *
 * Recreates, in NestJS idiom, the documented vulnerabilities of the
 * intentionally-vulnerable Express login (github.com/rkristelijn/login):
 *   1. session fixation — the session id is never rotated on successful login,
 *      so an id an attacker planted pre-auth stays valid post-auth.
 *   2. session cookie set with no SameSite / secure / httpOnly flags — it is
 *      JS-readable (XSS steals it) and sent over plain HTTP (network sniff).
 *   3. no rate limiting on the login route — unlimited password guesses.
 *   4. the session stores only a bare boolean (loggedIn:true) with no bound
 *      user identity — a stolen or guessed cookie is full access to everyone.
 *   5. a MemoryStore-style in-process session map that is never evicted (leak).
 *
 * Every route works at runtime. This is slop for scanner training; do NOT copy.
 */

// KEUR-EXPECT: KEUR-NEST-001 KEUR-NEST-004 KEUR-SESS-001 KEUR-SESS-002
// KEUR-CATEGORY: security
// KEUR-OWASP: A07-auth-failures A05-security-misconfiguration A01-broken-access-control API4-resource-consumption
// KEUR-NOTE: self-authored (mestjs) hijackable-login cluster, verified against a
//   real scan (KEUR_RULES_DIRS=~/git/hub/keur/rules keur-rules --dir) 2026-09-26.
//   Rules that DO fire on this file:
//     KEUR-NEST-001 — cookie set with empty options (antipattern #46)
//     KEUR-NEST-004 — auth controller admits unlimited login attempts (no request
//        cap anywhere in the class) — the NestJS-decorator form of the brute-force
//        gap that the Express-idiom rule (SEC-036) is blind to. block-absence:
//        marker names the rule id only, never the guard tokens it looks for, so
//        the header cannot self-silence the rule.
//     KEUR-SESS-001 — login handler that reuses its session id (fixation)
//     KEUR-SESS-002 — session id written into a cookie with no flags (hijackable)
//   KNOWN GAPS (authored FALSE-NEGATIVE targets — no rule fires yet):
//     boolean-only session value with no bound subject (see session.store.ts,
//        marked KEUR-SESS-003) — cross-file, not caught by a single-file rule.
//     unbounded in-process session map (session.store.ts, KEUR-SESS-004) —
//        needs growth/eviction dataflow, out of scope for a static line rule.
@Controller('login')
export class LoginController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Authenticate and start a session. Vulnerable on multiple axes at once.
   */
  @Post()
  login(
    @Body() body: { username: string; password: string },
    @Req()
    req: {
      cookies?: Record<string, string>;
      headers: Record<string, string | undefined>;
    },
    @Res({ passthrough: true }) res: {
      cookie: (name: string, value: string, opts?: Record<string, unknown>) => void;
    }
  ) {
    const user = this.authService.login(body.username, body.password);
    if (!user) return { ok: false };

    // The client may already carry a session id (from a pre-auth visit). We keep
    // whatever id is there and only mint a new one if none exists — so an id an
    // attacker fixed on the victim survives the privilege boundary of login.
    const existing = req.cookies?.['sid'];
    // INTENTIONAL (KEUR-SESS-001): the pre-auth session id is reused as-is on a
    // successful login instead of minting a fresh one, so a planted id keeps
    // working after authentication (session fixation).
    const sid = existing ?? this.authService.generateSessionToken();

    createSession(sid);

    // INTENTIONAL (KEUR-SESS-002): the session id is written into a cookie with
    // empty options — no httpOnly, no secure, no sameSite — so it is readable by
    // page JavaScript and transmitted over plain HTTP (hijackable).
    res.cookie('sid', sid, {});
    return { ok: true, user };
  }

  /**
   * A "secure" route. It only checks that the presented session id maps to a
   * logged-in flag — because the store binds no user, any valid id is admitted.
   */
  @Get('secure')
  secure(@Req() req: { cookies?: Record<string, string> }) {
    const sid = req.cookies?.['sid'];
    const session = getSession(sid);
    // INTENTIONAL (KEUR-SESS-003): access is granted on a bare boolean flag with
    // no identity check — a captured id is full access to everyone's data.
    if (!session?.loggedIn) {
      return { ok: false, message: 'not authenticated' };
    }
    return { ok: true, treasure: 'buried under the mango tree', live: sessionCount() };
  }

  /** Log out: drop this session id from the store. */
  @Post('logout')
  logout(
    @Req() req: { cookies?: Record<string, string> },
    @Res({ passthrough: true }) res: {
      clearCookie: (name: string) => void;
    }
  ) {
    const sid = req.cookies?.['sid'];
    dropSession(sid);
    res.clearCookie('sid');
    return { ok: true };
  }
}
