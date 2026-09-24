/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

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
  // NOTE: bootstrap() never registers helmet() either (MEST-NEST-001).
  app.enableCors({ origin: '*' });
  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`
  );
}

bootstrap();
