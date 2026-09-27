import { Body, Controller, Post, Res } from '@nestjs/common';
import { AuthService } from './auth.service';

// KEUR-EXPECT: KEUR-NEST-001 KEUR-NEST-004 KEUR-SESS-002
// KEUR-CATEGORY: security
// KEUR-OWASP: A05-security-misconfiguration A07-auth-failures API4-resource-consumption
// KEUR-NOTE: self-authored (mestjs), verified 2026-09-26. The login handler sets
//   a session cookie with empty options (no httpOnly/secure/sameSite) — NestJS
//   antipattern #46, caught by KEUR-NEST-001 and the session-specific KEUR-SESS-002.
//   KEUR-NEST-004 also fires: this auth controller admits unlimited login
//   attempts (no request cap present in the class) — brute-force / credential
//   stuffing. block-absence rule; the marker names the rule id only, never the
//   guard tokens it scans for, so this header cannot self-silence the rule.

/**
 * mestjs auth endpoints — INTENTIONALLY VULNERABLE but functional.
 * Login works (admin/admin, alice/alice) and sets a session cookie.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(
    @Body() body: { username: string; password: string },
    // passthrough so Nest still sends the response
    @Res({ passthrough: true }) res: {
      cookie: (name: string, value: string, opts?: Record<string, unknown>) => void;
    }
  ) {
    const user = this.authService.login(body.username, body.password);
    if (!user) return { ok: false };
    const token = this.authService.signToken(user.id);
    // INTENTIONAL (MEST-AUTH-001): session cookie without httpOnly/secure/sameSite
    // — readable by JS (XSS steals it) and sent over plain HTTP.
    res.cookie('session', token, {});
    return { ok: true, user, token };
  }
}
