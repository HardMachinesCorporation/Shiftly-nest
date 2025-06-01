import { z } from 'zod';
import { bcryptSchema } from '../../features/password/implementation/providers/bcrypt/bcrypt.schema';

// 📦 Schémas de validation
const DatabaseSchema = z.object({
  DATABASE_URL: z
    .string()
    .trim()
    .url()
    .regex(/^postgresql:\/\//, 'Doit commencer par postgresql://')
    .describe('database connection URL'),
  TEST_DB_TYPE: z.string().trim(),
  TEST_DB_HOST: z.string().trim(),
  TEST_DB_PORT: z.coerce.number().int().positive().max(65585),
  TEST_DB_USERNAME: z.string().trim(),
  TEST_DB_PASSWORD: z.string().trim(),
  TEST_DB_NAME: z.string().trim(),
});

const ServerSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production'])
    .default('development')
    .describe('Working environment'),
  APP_PORT: z.coerce
    .number()
    .int()
    .positive()
    .max(65535)
    .default(3010)
    .describe('Application Port'),
  APP_PREFIX: z.string().trim(),
});

const FrontendSchema = z.object({
  FRONTEND_DEV_URL: z
    .string()
    .trim()
    .url()
    .describe('Nuxt URL in development environment'),
  FRONTEND_PROD_URL: z
    .string()
    .trim()
    .url()
    .describe('Nuxt URL in development environment'),
});

// 🧩 Fusion finale
export const GlobalSchema = DatabaseSchema.merge(ServerSchema)
  .merge(FrontendSchema)
  .merge(bcryptSchema)
  .describe('Globale App Configuration ');

export type EnvVariables = z.infer<typeof GlobalSchema>;
