import { Module } from '@nestjs/common';
import { AuthModule } from './features/auth/auth.module';
import { ZodModule } from './core/zod/zod.module';
import { DatabaseModule } from './infra/database/database.module';
import { PasswordModule } from './features/password/password.module';
import { UserModule } from './features/user/user.module';

@Module({
  imports: [AuthModule, ZodModule, DatabaseModule, PasswordModule, UserModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
