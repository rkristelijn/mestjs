import { Module } from '@nestjs/common';
import { OrdersModule } from './orders/orders.module';

// mestjs orders — the Fastify backend's composition root. Intentionally
// insecure; see apps/orders/src/main.ts and docs/orders.md.
@Module({
  imports: [OrdersModule],
})
export class AppModule {}
