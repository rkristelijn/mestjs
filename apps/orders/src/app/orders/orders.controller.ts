import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { Observable, interval, map } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';
import { AdminGuard } from './admin.guard';
import { create, findAll, findOne, Order } from './order.store';

/**
 * orders.controller.ts — order/checkout routes for the mestjs Fastify backend.
 * INTENTIONALLY INSECURE. Each vulnerable line is marked INTENTIONAL and paired
 * with a "how it should be done" note. Full write-up: docs/orders.md.
 *
 * KEUR-EXPECT: SEC-040 KEUR-NEST-010 KEUR-NEST-011 KEUR-NEST-012 KEUR-NEST-013 KEUR-NEST-014 KEUR-NEST-015 KEUR-NEST-016 KEUR-NODE-010
 * KEUR-CATEGORY: security
 * KEUR-OWASP: A01-broken-access-control A03-injection A05-security-misconfiguration
 * KEUR-NOTE: self-authored (mestjs orders), verified against keur scan 2026-10-04.
 *   TP: SEC-040 (broken access control). The NestJS/Fastify-shaped classes that
 *   stock Express rules miss are now caught by rules authored from this corpus
 *   and SHIPPED in keur (see docs/keur-coverage.md): mass assignment
 *   (KEUR-NEST-010), IDOR (KEUR-NEST-011), Fastify path-normalization config +
 *   url-based guard + composite bypass (KEUR-NEST-012/013/016, CVE-2026-2293),
 *   SSE injection (KEUR-NEST-014, CVE-2026-35515), unguarded admin route
 *   (KEUR-NEST-015), invoice path traversal (KEUR-NODE-010).
 */
@Controller()
export class OrdersController {
  // List all orders (happy path, no vuln).
  @Get()
  list(): Order[] {
    return findAll();
  }

  // Place an order.
  // VULN (SEC-014): the whole request body is spread into the order, so a
  // client can set status:'paid' or total:0 — fields the server should own.
  // HOW IT SHOULD BE DONE: accept a typed DTO with class-validator and
  // @nestjs ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  // then compute status/total server-side from itemId×qty — never from input.
  @Post()
  place(@Body() body: Record<string, unknown>): Order {
    // INTENTIONAL (SEC-014): mass assignment — body spread straight in.
    // @id MEST-VULN-ORDERS-MASSASSIGN
    return create({
      userId: 0,
      itemId: 0,
      qty: 1,
      status: 'pending',
      total: 0,
      ...(body as object),
    } as Omit<Order, 'id'>);
  }

  // Fetch a single order by id.
  // VULN (SEC-017 / IDOR): returns any order by id with no check that it
  // belongs to the caller — change ?id and read someone else's order.
  // HOW IT SHOULD BE DONE: resolve the authenticated principal and verify
  // ownership (order.userId === request.user.id) or an explicit admin role
  // before returning; return 404 (not 403) to avoid confirming existence.
  @Get('mine/:id')
  getMine(@Param('id') id: string): Order | { error: string } {
    // INTENTIONAL (KEUR-NEST-011, was SEC-017): no owner check — Broken Object Level Authorization.
    // @id MEST-VULN-ORDERS-IDOR
    const order = findOne(Number(id));
    return order ?? { error: 'not found' };
  }

  // Admin report — "protected" by AdminGuard.
  // VULN (SEC-040 + CVE-2026-2293): the guard checks the RAW url before Fastify
  // canonicalises it, so //orders/admin/report reaches here without admin.
  // HOW IT SHOULD BE DONE: upgrade platform-fastify to >= 11.1.14, decide
  // authorization on an authenticated role claim (not url shape), and keep the
  // guard declarative + default-deny (see admin.guard.ts remediation notes).
  @UseGuards(AdminGuard)
  @Get('admin/report')
  adminReport(): { orders: Order[]; revenue: number } {
    // INTENTIONAL (SEC-040): sensitive admin data behind a bypassable guard.
    // @id MEST-VULN-ORDERS-AUTHBYPASS
    const orders = findAll();
    const revenue = orders.reduce((sum, o) => sum + o.total, 0);
    return { orders, revenue };
  }

  // Live order-status stream (Server-Sent Events).
  // VULN (CVE-2026-35515): a client-controlled label is echoed into the SSE
  // `data` field without stripping \r / \n, so a payload containing CRLF can
  // inject extra SSE events / spoof event types in the stream.
  // HOW IT SHOULD BE DONE: strip or reject \r and \n in any value placed into
  // an SSE field, and upgrade @nestjs/core to >= 11.1 which sanitises this.
  @Sse(':id/status')
  status(
    @Param('id') id: string,
    @Query('label') label: string
  ): Observable<{ data: string }> {
    const order = findOne(Number(id));
    return interval(1000).pipe(
      map((n) => ({
        // INTENTIONAL (CVE-2026-35515): raw label (may contain \r\n) injected
        // into the SSE data field — SSE event injection.
        // @id MEST-VULN-ORDERS-SSEINJECT
        data: `tick ${n} status=${order?.status ?? 'unknown'} label=${label}`,
      }))
    );
  }

  // Download an invoice PDF for an order.
  // VULN (path traversal): the filename is taken from the query and joined onto
  // a base dir with no containment check — ?file=../../etc/passwd escapes.
  // HOW IT SHOULD BE DONE: never take a filesystem name from input; map the
  // order id to a stored key, resolve with path.resolve and assert the result
  // stays within the invoices base dir before reading.
  // NOTE: a future dedicated `invoicer` PDF backend will replace this stub —
  // this route is the hook into that service (see docs/orders.md).
  @Get(':id/invoice')
  invoice(
    @Query('file') file: string,
    @Res() res: { header: (k: string, v: string) => void; send: (b: unknown) => void }
  ): void {
    const base = path.join(__dirname, 'invoices');
    // INTENTIONAL (path traversal): user-supplied name joined onto base dir.
    // @id MEST-VULN-ORDERS-TRAVERSAL
    const target = path.join(base, file ?? 'sample.txt');
    res.header('content-type', 'text/plain');
    res.send(fs.readFileSync(target, 'utf8'));
  }

  // Raw-request escape hatch used only to make the bypass observable in tests.
  @Get('whoami')
  whoami(@Req() req: { url?: string }): { url: string } {
    return { url: req.url ?? '' };
  }
}
