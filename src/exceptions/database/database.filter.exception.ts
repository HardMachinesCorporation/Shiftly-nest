import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { TypeOrmError } from './utils/typeorm-error.handler';
import { DatabaseError } from './utils/postgres-error.handler';

/**
 * 🔥 DatabaseFilterException
 *
 * Ce filtre ne s’applique qu’aux erreurs suivantes :
 *   QueryFailedError (erreurs SQL TypeORM)
 *  - TypeOrmError           (tes exceptions custom TypeORM)
 *  - DatabaseError          (tes exceptions custom Database)
 */
@Catch(QueryFailedError, TypeOrmError, DatabaseError)
export class DatabaseFilterException implements ExceptionFilter {
  private readonly logger = new Logger(DatabaseFilterException.name);

  constructor() {
    this.logger.log('🧠 DatabaseFilterException loaded');
  }

  catch(
    exception: QueryFailedError | TypeOrmError | DatabaseError,
    host: ArgumentsHost
  ) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Log for traceability
    this.logger.warn('Exception intercepted:', exception);

    // ─── 1) Erreurs SQL de TypeORM ────────────────────────────────────────────────────
    if (exception instanceof QueryFailedError) {
      this.logger.warn('→ Caught a TypeORM QueryFailedError');

      // 1️⃣ On récupère "driverError" comme un unknown, pas comme un any
      const maybeDriverError: unknown = (
        exception as QueryFailedError & { driverError?: unknown }
      ).driverError;

      // 2️⃣ On initialise sqlErrorCode à undefined (par défaut)
      let sqlErrorCode: string | undefined;

      // 3️⃣ On vérifie que maybeDriverError est bien un objet non null
      if (typeof maybeDriverError === 'object' && maybeDriverError !== null) {
        // 4️⃣ On caste en Record<string, unknown> pour lire la propriété "code"
        const driverErrorObj = maybeDriverError as Record<string, unknown>;

        // 5️⃣ On ne récupère "code" que s’il est de type string
        if (typeof driverErrorObj.code === 'string') {
          sqlErrorCode = driverErrorObj.code;
        }
      }

      switch (sqlErrorCode) {
        case '23505': // Violation de contrainte unique (PostgreSQL)
          return response.status(409).json({
            success: false,
            error: 'Conflict',
            message: 'Duplicate entry. Unique constraint violated.',
          });

        case '23503': // Violation de clé étrangère
          return response.status(400).json({
            success: false,
            error: 'Bad Request',
            message: 'Foreign key constraint violation.',
          });

        case '23502': // Valeur NULL interdite
          return response.status(400).json({
            success: false,
            error: 'Bad Request',
            message: 'Missing required field.',
          });

        default:
          return response.status(500).json({
            success: false,
            error: 'Database Error',
            message: 'An unknown database error occurred.',
          });
      }
    }

    // ─── 2) Erreurs custom TypeOrmError ──────────────────────────────────────────────
    if (exception instanceof TypeOrmError) {
      this.logger.warn('→ Caught a TypeOrmError');
      return response.status(500).json({
        success: false,
        error: exception.name,
        code: exception.code,
        message: exception.message,
        details: exception.details,
      });
    }

    // ─── 3) Erreurs custom DatabaseError ────────────────────────────────────────────
    this.logger.warn('→ Caught a DatabaseError');
    return response.status(400).json({
      success: false,
      error: exception.name,
      code: exception.code,
      message: exception.message,
      details: exception.details,
    });
  }
}
