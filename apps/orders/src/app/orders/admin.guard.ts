import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

/**
 * AdminGuard — INTENTIONALLY BYPASSABLE path-based admin check.
 *
 * It reads the RAW request url and only allows the request through for an
 * authenticated admin when the url matches the exact canonical admin path.
 * Because the Fastify adapter is configured with path-normalization options
 * (see main.ts), Fastify canonicalises the url AFTER this guard has run, so a
 * non-canonical url like `//orders/admin/report` or `/orders/admin/./report`
 * fails this string check (guard thinks it is NOT the admin route, so it does
 * not even require admin) yet still routes to the admin handler. CWE-551.
 *
 * ── HOW IT SHOULD BE DONE (remediation) ────────────────────────────────────
 *  1. Upgrade @nestjs/platform-fastify to >= 11.1.14, which fixes the ordering
 *     so guards run against the already-canonicalised path.
 *  2. Do NOT make authorization decisions on the raw url string. Decide on a
 *     stable signal: an authenticated principal + role claim
 *     (e.g. request.user.role === 'admin'), not on path shape.
 *  3. Prefer declarative, route-bound guards (@UseGuards(AdminGuard) on the
 *     handler) over inspecting urls, so the framework — not string parsing —
 *     maps request→handler→guard after canonicalisation.
 *  4. Default-deny: require a positive admin assertion; never "allow unless the
 *     path looks non-admin".
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      url?: string;
      headers?: Record<string, string | undefined>;
    }>();
    const url = req.url ?? '';
    const role = req.headers?.['x-role'] ?? 'guest';

    // INTENTIONAL (KEUR-NEST-001): authorization decision taken on the RAW url
    // BEFORE Fastify canonicalises it. Only the exact string '/orders/admin'
    // prefix is treated as "needs admin"; any normalised-away variant slips by.
    const looksLikeAdmin = url.startsWith('/orders/admin/');
    if (!looksLikeAdmin) {
      // Not recognised as an admin path (pre-canonicalisation) → allowed.
      return true;
    }
    // Recognised admin path → require the admin role.
    return role === 'admin';
  }
}
