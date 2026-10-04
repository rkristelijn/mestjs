/**
 * orders — the SECOND mestjs backend. NestJS on the FASTIFY adapter (the first
 * app, `api`, runs on Express). Concern: order / checkout service, a different
 * domain from the catalogue+auth of `api`. Runs on port 3002.
 *
 * INTENTIONALLY INSECURE, like the rest of mestjs. This app exists to seed the
 * Fastify-specific vulnerability classes that the Express app cannot express.
 * Do NOT deploy; do NOT copy.
 *
 * KEUR-EXPECT: KEUR-NEST-001 KEUR-NEST-002 SEC-040 WEB-SEC-016
 * KEUR-CATEGORY: security
 * KEUR-OWASP: A01-broken-access-control A05-security-misconfiguration
 * KEUR-NOTE: self-authored (mestjs orders), verified against keur scan 2026-10-04.
 *   TP: KEUR-NEST-001 (insecure Fastify adapter config), KEUR-NEST-002 (no
 *   response security headers), SEC-040 + WEB-SEC-016 (wildcard CORS). The
 *   FastifyAdapter below is created with path-normalization options enabled
 *   (ignoreTrailingSlash + ignoreDuplicateSlashes). Combined with the path-based
 *   guard in orders.controller.ts, that reproduces CVE-2025-69211 /
 *   CVE-2026-2293 (CWE-551: authorization before canonicalization) — a request
 *   to a non-canonical path (e.g. //orders/admin/report) is normalised AFTER the
 *   guard has already allowed it, bypassing auth. Fixed upstream in NestJS
 *   v11.1.14; mestjs pins the vulnerable @nestjs/platform-fastify@11.1.6.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app/app.module';
import { initStore } from './app/orders/order.store';

async function bootstrap() {
  initStore();

  // INTENTIONAL (KEUR-NEST-001): Fastify path-normalization options enabled.
  // ignoreDuplicateSlashes/ignoreTrailingSlash make Fastify canonicalise the
  // URL AFTER NestJS guards have run against the raw path — the CWE-551
  // ordering bug behind CVE-2025-69211 / CVE-2026-2293.
  const adapter = new FastifyAdapter({
    ignoreTrailingSlash: true,
    ignoreDuplicateSlashes: true,
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter
  );
  app.setGlobalPrefix('orders');

  // mestjs: CORS wide open on purpose, same as the Express app.
  app.enableCors({ origin: '*' });

  const port = process.env.PORT || 3002;
  await app.listen(port, '0.0.0.0');
  Logger.log(`🧾 orders (fastify) running on: http://localhost:${port}/orders`);
}

bootstrap();
