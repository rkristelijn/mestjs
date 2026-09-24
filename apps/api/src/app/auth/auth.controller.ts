import { Body, Controller, Post, Res } from '@nestjs/common';
import { AuthService } from './auth.service';

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
