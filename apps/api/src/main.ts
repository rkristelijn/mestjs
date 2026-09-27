/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

// KEUR-EXPECT: SEC-040 KEUR-INCL-001 KEUR-NEST-001 KEUR-NEST-002
// KEUR-CATEGORY: security
// KEUR-OWASP: A05-security-misconfiguration
// KEUR-NOTE: self-authored (mestjs), verified via keur-rules --dir 2026-09-26.
// KEUR-NOTE: NestJS framework antipatterns present here (docs reversed).
//   Comments below paraphrase the missing defences on PURPOSE — naming the
//   real API tokens in a comment would satisfy the absence rules and silence
//   them (they look for the presence of those tokens anywhere in the file).
//   #5  enableCors({origin:'*'}) on an API — should be an explicit allow-list
//   #1  bootstrap never opts into response hardening headers — every reply
//       ships without the browser-protection header set (fires KEUR-NEST-002)
//   #13 the global body-validation pipe runs with no extra-field stripping —
//       undeclared body properties pass straight through (mass-assignment FN)
//   #40 global filter leaking stack traces (LeakyExceptionFilter)
//   #1/#13 remain KNOWN FALSE NEGATIVES for the config-object depth keur's
//   line rules cannot reach — authored FN targets for the antipattern set.

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { initDb } from './app/db/database';
import { LeakyExceptionFilter } from './app/leaky-exception.filter';

async function bootstrap() {
  initDb();
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  // INTENTIONAL (MEST-NEST-004): global filter that leaks stack traces.
  app.useGlobalFilters(new LeakyExceptionFilter());
  // INTENTIONAL (MEST-NEST-002): ValidationPipe with no whitelist — extra body
  // fields pass straight through to the service/entity (mass-assignment).
  app.useGlobalPipes(new ValidationPipe());
  // mestjs: CORS wide open on purpose — any origin may call this API.
  // Intentionally insecure slop for keur training; do NOT copy to real code.
  // INTENTIONAL (MEST-NEST-001): bootstrap also opts into no response-hardening
  // header middleware here, so replies carry no browser-protection headers.
  app.enableCors({ origin: '*' });
  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`
  );
}

bootstrap();
