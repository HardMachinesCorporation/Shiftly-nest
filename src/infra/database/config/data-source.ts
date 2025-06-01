import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { validateEnv } from '../../../core/zod/validate-env';
import { ConfigService } from '@nestjs/config';
import { ZodService } from '../../../core/zod/zod.service';
import { EnvVariables } from '../../../core/zod/env-schemas';
import { getDataSourceOptions } from './get-datasource-options';

// 1. Charger les variables .env
dotenv.config(); // 🔥 doit être appelé en premier !

// 2. Valider les variables avec Zod
const rawEnv = process.env;
const parsedEnv = validateEnv(rawEnv);

// 3. Créer un ConfigService<EnvVariables>
const configService = new ConfigService<EnvVariables>(parsedEnv);

// 4. Injecter dans ZodConfigService
const zodConfig = new ZodService(configService);

// 5. Générer dynamiquement les options TypeORM selon l'environnement
const options = getDataSourceOptions(zodConfig);

// 6. Exporter le DataSource pour CLI TypeORM
export const dataSource = new DataSource(options);
