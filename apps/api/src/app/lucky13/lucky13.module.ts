import { Module } from '@nestjs/common';
import { Lucky13Controller } from './lucky13.controller';

// mestjs: registers the CWE "Lucky 13" unforgivable-vulnerability cluster.
// See lucky13.md and lucky13.controller.ts. Intentionally insecure — training.
@Module({
  controllers: [Lucky13Controller],
})
export class Lucky13Module {}
