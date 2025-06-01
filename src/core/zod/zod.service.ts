import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EnvVariablesError } from './env-error';
import { EnvVariables } from './env-schemas';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ZodService implements OnModuleInit {
  private readonly logger = new Logger(ZodService.name);
  private env: EnvVariables['NODE_ENV'];
  private readonly cache: Map<keyof EnvVariables, any> = new Map();

  /**
   * Retrieves and validates the application configuration from environment variables.
   *
   * This method constructs a frozen (immutable) configuration object containing essential
   * environment variables. It performs runtime validation to ensure all required variables
   * are present before returning the configuration.
   *
   * @returns {Readonly<EnvVariables>} A frozen object containing all required environment variables.
   *                                  The object is immutable to prevent accidental modification.
   *
   * @throws {Error} If any required environment variable is missing (undefined).
   *
   * @example
   * // Usage
   * const config = service.config;
   * console.log(config.DATABASE_URL); // Access validated config properties
   *
   * @description
   * The configuration object includes:
   * - DATABASE_URL: Database connection string
   * - NODE_ENV: Current environment ('development' | 'production' | 'test')
   * - APP_PORT: Port number the application should listen on
   * - APP_PREFIX: API route prefix (e.g., '/api/v1')
   */
  get config(): Readonly<EnvVariables> {
    const env = {
      DATABASE_URL: this.get('DATABASE_URL'),
      NODE_ENV: this.get('NODE_ENV'),
      APP_PORT: this.get('APP_PORT'),
      APP_PREFIX: this.get('APP_PREFIX'),
      FRONTEND_PROD_URL: this.get('FRONTEND_PROD_URL'),
      FRONTEND_DEV_URL: this.get('FRONTEND_DEV_URL'),
      TEST_DB_TYPE: this.get('TEST_DB_TYPE'),
      TEST_DB_HOST: this.get('TEST_DB_HOST'),
      TEST_DB_PORT: this.get('TEST_DB_PORT'),
      TEST_DB_USERNAME: this.get('TEST_DB_USERNAME'),
      TEST_DB_PASSWORD: this.get('TEST_DB_PASSWORD'),
      TEST_DB_NAME: this.get('TEST_DB_NAME'),
      SALT_ROUND: this.get('SALT_ROUND'),
    };

    // Validate all required fields are present
    if (Object.values(env).some((val: string | number) => val === undefined)) {
      throw new Error('Missing required environment variables');
    }

    return Object.freeze(env as EnvVariables);
  }

  /**
   * Retrieves the value of a specific environment variable, with caching and type inference.
   *
   * - Checks the cache first for performance.
   * - Uses the underlying ConfigService to fetch the variable, with Zod type inference.
   * - Logs missing variables and throws a typed error if the variable is not found or empty.
   * - In development, logs every access to a config key.
   *
   * @template K - The key of the `EnvVariables` type to retrieve.
   * @param {K} key - The environment variable name to fetch.
   * @returns {EnvVariables[K]} The strongly typed value of the environment variable.
   * @throws {EnvVariablesError} If the variable is missing, null, or empty.
   *
   * @example
   * const dbUrl = configService.get('DATABASE_URL');
   */
  get<K extends keyof EnvVariables>(key: K): EnvVariables[K] {
    if (this.cache.has(key)) return this.cache.get(key) as EnvVariables[K];

    const value = this.configService.get(key, { infer: true });

    if (value === undefined || value === null || value === '') {
      this.logger.error(`Missing environment variable: ${String(key)}`);
      throw new EnvVariablesError(String(key), this.env);
    }

    this.cache.set(key, value);
    if (this.env === 'development') {
      this.logger.debug(`Accessed config key: ${String(key)}`);
    }
    return value;
  }

  constructor(private readonly configService: ConfigService<EnvVariables>) {}

  /**
   * Retrieves the raw value of a typed environment variable from the ConfigService.
   *
   * @template K - The key of the `EnvVariables` type to retrieve.
   * @param {K} key - The exact name of the environment variable to fetch.
   * @returns {EnvVariables[K]} The typed value of the requested environment variable.
   * @throws {EnvVariablesError} If the variable is missing, null, or an empty string.
   *
   * @example
   * // Retrieve the "DATABASE_URL" environment variable
   * const dbUrl = this.getRaw('DATABASE_URL');
   */
  private getRaw<K extends keyof EnvVariables>(key: K): EnvVariables[K] {
    const value = this.configService.get(key, { infer: true });
    if (value === undefined || value === null || value === '') {
      throw new EnvVariablesError(String(key), 'unknown');
    }
    return value;
  }

  onModuleInit(): any {
    this.env = this.getRaw('NODE_ENV');
    this.logger.log(`🚀 Configuration loaded for ${this.env} environment`);
  }

  get isProd(): boolean {
    return this.env === 'production';
  }

  get ApplicationPort(): number {
    return this.get('APP_PORT');
  }

  get isDev(): boolean {
    return this.env === 'development';
  }

  get databaseURL(): string {
    return this.get('DATABASE_URL');
  }

  get frontendURL() {
    const currentEnv: 'development' | 'production' = this.env;
    if (currentEnv === 'development') return this.get('FRONTEND_DEV_URL');
    else return this.get('FRONTEND_PROD_URL');
  }

  get apiPrefix(): string {
    return this.get('APP_PREFIX');
  }

  get currentEnv(): string {
    return this.get('NODE_ENV');
  }
}
