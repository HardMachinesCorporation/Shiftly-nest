import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AbstractHashingService } from './abstract/hashing.service';
import { zod } from '../../shared/config/zod-config.singleton';

@Injectable()
export class PasswordService {
  private readonly logger = new Logger(PasswordService.name);
  private readonly zodService = zod;
  constructor(private readonly hashServe: AbstractHashingService) {
    this.logger.log(PasswordService.name + 'is initialized.');
  }

  /**
   * Handles errors by constructing a standardized HTTP exception response.
   *
   * @private
   * @param {Error} error - The original error object to handle
   * @param {string} logMessage - Contextual message for production environment
   * @throws {HttpException} Always throws an HTTP exception with formatted response:
   *
   * @responseFormat
   * {
   *   where: string,          // Service name where error occurred
   *   errorName: string,      // Original error name
   *   detail: {
   *     message: string | {   // Detailed error in dev, logMessage in prod
   *       errorMessage: string,
   *       stack?: string,
   *       causes?: unknown
   *     },
   *     success: false,       // Always false for errors
   *     date: string          // ISO format date
   *   }
   * }
   *
   * @throws {HttpException} With status 500 (Internal Server Error)
   *
   * @behavior
   * - Development: Includes full error details (message, stack, causes)
   * - Production: Returns only the sanitized logMessage
   * - Always includes timestamp and failure indicator
   *
   * @example
   * try {
   *   // operation that may fail
   * } catch (error) {
   *   this.handleError(error, 'Password processing failed');
   * }
   *
   * @note
   * - Used internally for consistent error reporting
   * - Environment detection via zod.currentEnv
   * - Formats stack traces only in development
   */
  private handleError(error: Error, logMessage: string) {
    throw new HttpException(
      {
        where: PasswordService.name,
        errorName: error.name,
        detail: {
          message:
            zod.currentEnv === 'development'
              ? {
                  errorMessage: error.message,
                  stack: error.stack,
                  causes: error.cause,
                }
              : logMessage,
          success: false,
          date: new Date().toLocaleDateString(),
        },
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }

  /**
   * Hashes a password securely using the configured hashing service.
   *
   * @param password - The plain text password to hash (string or Buffer)
   * @returns A promise that resolves with the hashed password string
   * @throws {HttpException} When hashing fails (500 Internal Server Error)
   * @example
   * const hashed = await protectPassword('myPassword123');
   */
  async protectPassword(password: string | Buffer): Promise<string> {
    try {
      return await this.hashServe.hashPassword(password);
    } catch (error) {
      const logMessage = this.zodService.isDev
        ? `[${PasswordService.name}] : Failed to Hash the password `
        : 'An expected error occurred try again';

      if (error instanceof Error) {
        this.handleError(error, logMessage);
      }
      throw new HttpException(
        { message: logMessage },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async confirmPassword(
    providedPassword: string | Buffer,
    encryptedPassword: string
  ) {
    try {
      return await this.hashServe.comparePassword(
        providedPassword,
        encryptedPassword
      );
    } catch (error) {
      const logThisMessage = 'Wrong credentials';
      if (error instanceof Error) {
        this.handleError(error, logThisMessage);
      } else {
        throw new HttpException(
          { message: logThisMessage },
          HttpStatus.UNAUTHORIZED
        );
      }
    }
  }
}
