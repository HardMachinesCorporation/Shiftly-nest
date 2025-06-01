import { DataSourceOptions } from 'typeorm';
import { ZodService } from '../../../core/zod/zod.service';
import { getDevDataSourceOptions } from './dev-datasource.config';
import { getProdDataSourceOptions } from './prod.datasource.config';

export function getDataSourceOptions(config: ZodService): DataSourceOptions {
  if (config.isDev) return getDevDataSourceOptions(config);
  return getProdDataSourceOptions(config);
}
