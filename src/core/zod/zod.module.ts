import { Module } from '@nestjs/common';
import { ZodService } from './zod.service';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './validate-env';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '..env.docker'],
      validate: validateEnv,
    }),
  ],
  providers: [ZodService],
  exports: [ZodService],
})
export class ZodModule {}
