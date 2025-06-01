import { DataSourceOptions } from 'typeorm';
import { ZodService } from '../../../core/zod/zod.service';

export function getProdDataSourceOptions(
  config: ZodService
): DataSourceOptions {
  return {
    type: 'postgres',
    url: config.get('DATABASE_URL'),
    entities: ['dist/**/*.entity.js'],
    synchronize: false, // Toujours false en prod !
    migrations: ['dist/infrastructure/database/migrations/*.js'],
    migrationsRun: true, // Recommandé pour exécuter automatiquement les migrations
    ssl:
      config.get('NODE_ENV') === 'production'
        ? { rejectUnauthorized: false }
        : false,
    extra: {
      connectionLimit: 10, // Pour les pools de connexion
    },
  };
}
