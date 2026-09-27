import { Module } from '@nestjs/common';
import { InsecureController } from './insecure.controller';

// mestjs: registers the intentionally-insecure NestJS-antipattern routes.
@Module({
  controllers: [InsecureController],
})
export class InsecureModule {}
