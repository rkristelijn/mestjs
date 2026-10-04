/*
 * secure-counterparts.ts — the CORRECT version of every vulnerability the
 * MEST-NEST-* / MEST-NODE-* rules target. This file is the false-positive
 * guard: none of those rules should fire here. It is NOT wired into the app;
 * it exists so `keur scan` can prove the rules are precise, not just sensitive.
 *
 * KEUR-EXPECT: (none — this is the clean baseline; any MEST-* finding here is a
 *   false positive to fix in the rule.)
 */
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { Observable, interval, map } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';

class CreateOrderDto {
  itemId!: number;
  qty!: number;
}

@Controller('secure')
export class SecureController {
  private store = new Map<number, { id: number; userId: number; itemId: number }>();

  // CORRECT mass assignment: explicit allowlisted fields from a typed DTO,
  // server owns status/total. MEST-NEST-010 must NOT fire.
  @Post()
  place(@Body() dto: CreateOrderDto, @Req() req: { user?: { id: number } }) {
    const order = {
      id: Date.now(),
      userId: req.user?.id ?? 0,
      itemId: dto.itemId,
      qty: dto.qty,
      status: 'pending', // server-set, not from input
    };
    this.store.set(order.id, order);
    return order;
  }

  // CORRECT object lookup: ownership check against the authenticated user.
  // MEST-NEST-011 must NOT fire (userId / req.user present).
  @Get('mine/:id')
  getMine(@Param('id') id: string, @Req() req: { user: { id: number } }) {
    const order = this.store.get(Number(id));
    if (!order || order.userId !== req.user.id) return { error: 'not found' };
    return order;
  }

  // CORRECT admin route: declaratively guarded + role-based. MEST-NEST-015 and
  // MEST-NEST-013 must NOT fire (no url-string authz; guard is route-bound).
  @UseGuards(/* RolesGuard */ class {} as never)
  @Get('admin/report')
  adminReport() {
    return { ok: true };
  }

  // CORRECT SSE: the label is sanitised (\r\n stripped) before it reaches the
  // data field. MEST-NEST-014 must NOT fire (replace present).
  @Sse(':id/status')
  status(@Query('label') label: string): Observable<{ data: string }> {
    const safe = label.replace(/[\r\n]/g, '');
    return interval(1000).pipe(map((n) => ({ data: `tick ${n} label=${safe}` })));
  }

  // CORRECT invoice download: id→stored key, path.resolve containment check.
  // MEST-NODE-010 must NOT fire (path.resolve + startsWith present).
  @Get(':id/invoice')
  invoice(@Query('file') file: string): string {
    const base = path.resolve(__dirname, 'invoices');
    const resolved = path.resolve(base, path.basename(file));
    if (!resolved.startsWith(base + path.sep)) throw new Error('bad path');
    return fs.readFileSync(resolved, 'utf8');
  }

  // CORRECT plugin load: fixed allowlist, no concatenated require().
  // MEST-NODE-011 must NOT fire (literal require only).
  @Get('plugin')
  loadPlugin(@Query('name') name: string) {
    const allow: Record<string, () => unknown> = {
      hello: () => require('./plugins/hello'),
    };
    const factory = allow[name];
    return { loaded: factory ? typeof factory() : 'denied' };
  }

  // CORRECT file write: atomic exclusive open, no check-then-act.
  // MEST-NODE-012 must NOT fire (no existsSync guard).
  @Post('report')
  saveReport(@Body() body: { name: string; data: string }) {
    const file = path.resolve(__dirname, 'reports', path.basename(body.name));
    const fd = fs.openSync(file, 'wx'); // fails if exists — atomic, no TOCTOU
    fs.writeSync(fd, body.data);
    fs.closeSync(fd);
    return { saved: file };
  }
}

// CORRECT session store: binds the authenticated user id to the session, not a
// bare boolean. MEST-SESS-003 must NOT fire (userId bound).
const SESSIONS = new Map<string, { userId: number; loggedIn: boolean }>();
export function createSession(id: string, userId: number): void {
  SESSIONS.set(id, { userId, loggedIn: true });
}
