import { Module } from '@nestjs/common';
import { LoginController } from './login.controller';
import { AuthModule } from '../auth/auth.module';

// mestjs: registers the intentionally-vulnerable, hijackable login routes.
// Imports AuthModule to reuse the (equally insecure) AuthService.
@Module({
  imports: [AuthModule],
  controllers: [LoginController],
})
export class LoginModule {}
