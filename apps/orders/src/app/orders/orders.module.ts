import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { AdminGuard } from './admin.guard';

// mestjs orders — registers the order/checkout routes and the (bypassable)
// admin guard. Intentionally insecure; see docs/orders.md.
@Module({
  controllers: [OrdersController],
  providers: [AdminGuard],
})
export class OrdersModule {}
