import * as dotenv from 'dotenv';
import * as process from 'node:process';
import { validateEnv } from '../../core/zod/validate-env';
import { ConfigService } from '@nestjs/config';
import { EnvVariables } from '../../core/zod/env-schemas';
import { ZodService } from '../../core/zod/zod.service';

// 1. Load .env
dotenv.config();

// 2. Validate;
const parseEnv = validateEnv(process.env);

// 3. Create typed Service
const configService = new ConfigService<EnvVariables>(parseEnv);
const zodConfigService = new ZodService(configService);

export const zod: ZodService = zodConfigService;
