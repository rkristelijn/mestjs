import { Module } from '@nestjs/common';
import { SlopService } from './slop.service';

// mestjs: registers the intentionally-sloppy JS/TS antipattern service.
@Module({
  providers: [SlopService],
})
export class SlopModule {}
