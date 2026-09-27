import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
} from '@nestjs/common';

// KEUR-EXPECT: SEC-040
// KEUR-CATEGORY: security
// KEUR-OWASP: A05-security-misconfiguration
// KEUR-NOTE: self-authored (mestjs), verified `keur scan` 2026-09-26. Returning
//   err.stack to the client fires SEC-040. NestJS antipattern #40 (exception
//   filter leaking stack traces) — best practice: generic message, log server-side.

/**
 * INTENTIONAL (MEST-NEST-004): returns the raw error + stack trace to the
 * client. Leaks internal paths, library versions and logic to attackers.
 * Works fine at runtime — it just over-shares. Real filters return a generic
 * message and log details server-side only.
 */
@Catch()
export class LeakyExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const err = exception as Error;
    // INTENTIONAL (MEST-NEST-004): stack trace exposed in the HTTP response
    res.status(500).json({
      message: err.message,
      stack: err.stack,
      error: String(exception),
    });
  }
}
