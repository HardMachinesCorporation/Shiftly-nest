import { DataSourceOptions } from 'typeorm';
import { ZodService } from '../../../core/zod/zod.service';

export function getDevDataSourceOptions(config: ZodService): DataSourceOptions {
  return {
    type: 'mysql',
    host: config.get('TEST_DB_HOST'),
    port: config.get('TEST_DB_PORT'),
    username: config.get('TEST_DB_USERNAME'),
    password: config.get('TEST_DB_PASSWORD'),
    database: config.get('TEST_DB_NAME'),
    entities: ['dist/**/*.entity.js'],
    synchronize: true,
  };
}
