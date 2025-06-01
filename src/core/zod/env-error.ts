export class EnvVariablesError extends Error {
  constructor(variable: string, env: string) {
    super(`Missing environment variable: ${variable} (environment: ${env})`);
    this.name = 'EnvVariableError';
  }
}
