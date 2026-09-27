import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ItemsModule } from './items/items.module';
import { AuthModule } from './auth/auth.module';
import { InsecureModule } from './insecure/insecure.module';
import { SlopModule } from './slop/slop.module';
import { LoginModule } from './login/login.module';

// KEUR-EXPECT: KEUR-NEST-003
// KEUR-CATEGORY: security
// KEUR-OWASP: A04-insecure-design
// KEUR-NOTE: self-authored (mestjs), verified via keur-rules --dir 2026-09-26.
// KEUR-NOTE: NestJS antipattern #20 (paraphrased so the module name is NOT
//   spelled out — naming the request-budget module/guard token in a comment
//   would satisfy the absence rule and silence it). This composition root wires
//   up every feature module but INTENTIONALLY registers no request-budget /
//   per-window request-count control and no matching global guard, so every
//   route (login included) accepts unbounded requests — open to credential
//   brute-forcing and request-flood DoS (CWE-770). Fires KEUR-NEST-003.
@Module({
  imports: [ItemsModule, AuthModule, InsecureModule, SlopModule, LoginModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
