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
  async protectPassword(password: string | Buffer) {
    try {
      return await this.hashServe.hashPassword(password);
    } catch (error) {
      const logThisMessage = 'Failed to verify credentials';
      if (error instanceof Error) {
        this.handleError(error, logThisMessage);
      } else {
        throw new HttpException(
          { message: logThisMessage },
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
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
