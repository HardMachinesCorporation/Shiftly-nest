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

  /**
   * Checks if the current environment is production.
   *
   * @returns {boolean} True if NODE_ENV is 'production', false otherwise
   *
   * @example
   * if (config.isProd) {
   *   // Enable production-specific features
   * }
   */
  get isProd(): boolean {
    return this.env === 'production';
  }

  /**
   * Retrieves the application port from environment variables.
   *
   * @returns {number} The port number the application should listen on
   * @throws {Error} If APP_PORT is not set or invalid
   *
   * @example
   * const port = config.ApplicationPort; // 3000
   */
  get ApplicationPort(): number {
    return this.get('APP_PORT');
  }

  /**
   * Checks if the current environment is development.
   *
   * @returns {boolean} True if NODE_ENV is 'development', false otherwise
   *
   * @example
   * if (config.isDev) {
   *   // Enable development tools
   * }
   */
  get isDev(): boolean {
    return this.env === 'development';
  }

  /**
   * Retrieves the database connection URL.
   *
   * @returns {string} The complete database connection string
   * @throws {Error} If DATABASE_URL is not set
   *
   * @example
   * const dbUrl = config.databaseURL; // 'postgres://user:pass@localhost:5432/db'
   */
  get databaseURL(): string {
    return this.get('DATABASE_URL');
  }

  /**
   * Gets the appropriate frontend URL based on current environment.
   *
   * @returns {string} Either:
   *   - FRONTEND_DEV_URL in development
   *   - FRONTEND_PROD_URL in production
   * @throws {Error} If the appropriate URL is not set
   *
   * @example
   * const url = config.frontendURL; // 'http://localhost:3000' or 'https://app.com'
   */
  get frontendURL() {
    const currentEnv: 'development' | 'production' = this.env;
    if (currentEnv === 'development') return this.get('FRONTEND_DEV_URL');
    else return this.get('FRONTEND_PROD_URL');
  }

  /**
   * Retrieves the API route prefix.
   *
   * @returns {string} The prefix for all API routes (e.g. '/api')
   * @throws {Error} If APP_PREFIX is not set
   *
   * @example
   * app.use(config.apiPrefix, router);
   */
  get apiPrefix(): string {
    return this.get('APP_PREFIX');
  }

  /**
   * Gets the current Node.js environment.
   *
   * @returns {string} The value of NODE_ENV (typically 'development', 'test', or 'production')
   *
   * @example
   * console.log(`Running in ${config.currentEnv} mode`);
   */
  get currentEnv(): string {
    return this.get('NODE_ENV');
  }
}
