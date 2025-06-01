import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getDataSourceOptions } from './config/get-datasource-options';
import { ZodService } from '../../core/zod/zod.service';
import { ZodModule } from '../../core/zod/zod.module';

@Module({
  imports: [
    ZodModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      imports: [ConfigModule],
      useFactory: getDataSourceOptions,
    }),
  ],
})
export class DatabaseModule implements OnModuleInit {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(private readonly config: ZodService) {}

  onModuleInit() {
    this.logger.log(
      `🧠 Running in ${this.config.currentEnv.toUpperCase()} mode`
    );
  }
}
