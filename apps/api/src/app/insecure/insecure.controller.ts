import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { getDb } from '../db/database';

/**
 * mestjs — INTENTIONALLY INSECURE NestJS antipatterns (docs reversed).
 * Sourced from docs/research/nestjs.md. Every route works at runtime; each is
 * marked so scanners can train on it. Do NOT copy any of this into real code.
 */

// KEUR-EXPECT: KEUR-NEST-001
// KEUR-CATEGORY: security
// KEUR-OWASP: A05-security-misconfiguration A01-broken-access-control A07-auth-failures
// KEUR-NOTE: self-authored (mestjs) NestJS-antipattern cluster, verified 2026-09-26.
//   Detectable subset fires KEUR-NEST-001. The following are KNOWN GAPS (no rule
//   yet) — authored FN targets for future NestJS rules:
//   #9  handler with no @UseGuards and no global guard (open route)
//   #21 login/state-changing handler with no @Throttle (brute-force)
//   #29 plaintext password comparison (user.password === pass)
//   #32 state-changing logic behind @Get (CSRF-bypassable)
//   #46 cookie set without httpOnly/secure/sameSite
@Controller('insecure')
export class InsecureController {
  // #9 + #29: no guard, plaintext password compare (works, but open + weak)
  @Post('login-weak')
  loginWeak(@Body() body: { username: string; password: string }) {
    const row = getDb()
      .prepare('SELECT id, username, password, role FROM users WHERE username = ?')
      .get(body.username) as { password: string; role: string } | undefined;
    // INTENTIONAL (nest#29): plaintext password comparison — no hashing/constant-time
    const ok = !!row && row.password === body.password;
    return { ok, role: row?.role };
  }

  // #32: state-changing logic behind @Get — CSRF-bypassable (GET is never checked)
  @Get('delete-all')
  deleteAll() {
    // INTENTIONAL (nest#32): mutation behind @Get bypasses CSRF protection
    getDb().prepare('DELETE FROM items').run();
    return { deleted: true };
  }

  // #46: session cookie with no httpOnly/secure/sameSite flags
  @Get('set-cookie')
  setCookie(
    @Query('v') v: string,
    @Res({ passthrough: true }) res: {
      cookie: (n: string, val: string, opts?: Record<string, unknown>) => void;
    }
  ) {
    // INTENTIONAL (nest#46): cookie without httpOnly/secure/sameSite — JS-readable, sent over HTTP
    res.cookie('pref', v ?? 'x', {});
    return { set: true };
  }
}
