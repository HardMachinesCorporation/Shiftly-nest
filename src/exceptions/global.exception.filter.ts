import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { zod } from '../shared/config/zod-config.singleton';

/**
 * 🚨 GlobalExceptionFilter (Improved, Production‐Safe)
 *
 * Ce filtre capture toutes les exceptions non prises en charge par des filtres plus spécifiques,
 * et renvoie un format de réponse homogène.
 * En production, il ne divulgue aucun détail sensible (stack, corps, headers, etc.).
 *
 * • Logging détaillé en DEV (message, stack, body sanitized, headers sanitized)
 * • Logging restreint en PROD (seulement requestId, méthode, URL, type d’erreur)
 * • Génération (ou récupération) d’un requestId pour chaque requête
 * • Gestion appropriée des HttpException (renvoi du code HTTP et du payload d’origine)
 * • Pas de fuite d’informations en PROD : pas de stack, pas de données de requête, pas de détails d’erreur.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);
  private readonly isProduction: boolean = zod.isProd;

  constructor() {
    this.logger.log('🧠 GlobalExceptionFilter initialized');
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // 1️⃣ Générer ou récupérer un requestId unique pour tracer cette requête
    const requestId = this.getRequestId(request);

    // 2️⃣ Logger l’erreur (mode DEV vs PROD)
    this.logError(exception, request, requestId);

    // 3️⃣ Préparer la réponse JSON
    const responseBody = this.prepareResponse(exception, request, requestId);

    // 4️⃣ Envoyer la réponse
    response.status(responseBody.statusCode).json(responseBody);
  }

  /**
   * Génère ou récupère un requestId depuis l’en‐tête 'x-request-id'.
   * Si absent, en génère un avec randomUUID().
   */
  private getRequestId(request: Request): string {
    const headerId = request.headers['x-request-id'];
    if (typeof headerId === 'string' && headerId.trim().length > 0) {
      return headerId;
    }
    return randomUUID();
  }

  /**
   * Logging structuré de l’erreur, avec niveau de détail selon l’environnement.
   */
  private logError(
    exception: unknown,
    request: Request,
    requestId: string
  ): void {
    const method = request.method;
    const url = request.url;

    if (this.isProduction) {
      // En production : on log uniquement l’essentiel
      this.logger.error(
        `[${requestId}] Unhandled exception on ${method} ${url}`,
        {
          requestId,
          error:
            exception instanceof Error
              ? exception.constructor.name
              : 'UnknownError',
          timestamp: new Date().toISOString(),
          path: url,
          method,
        }
      );
    } else {
      // En dev : log complet (message, stack, body sanitized, headers sanitized)
      const errorMessage =
        exception instanceof Error ? exception.message : 'Unknown error';
      const stackTrace =
        exception instanceof Error
          ? exception.stack
          : 'No stack trace available';

      this.logger.error(
        `[${requestId}] Unhandled exception on ${method} ${url}`,
        {
          requestId,
          error: errorMessage,
          stack: stackTrace,
          timestamp: new Date().toISOString(),
          path: url,
          method,
          body: this.sanitizeBody(request.body),
          headers: this.sanitizeHeaders(request.headers),
        }
      );
    }
  }

  /**
   * Prépare le JSON de réponse à renvoyer au client.
   * En production : message générique uniquement.
   * En dev       : inclut les détails de l’exception / HttpException.
   */
  private prepareResponse(
    exception: unknown,
    request: Request,
    requestId: string
  ): {
    success: false;
    statusCode: number;
    error: string;
    requestId: string;
    timestamp: string;
    path: string;
    message: string;
    details?: unknown;
  } {
    const statusCode = this.getStatusCode(exception);
    const errorType = this.getErrorType(exception);
    const timestamp = new Date().toISOString();
    const path = request.url;

    // Message principal selon ENV et type d’exception
    const message = this.getErrorMessage(exception);

    // Détails supplémentaires uniquement en DEV
    const details = this.isProduction
      ? undefined
      : this.getErrorDetails(exception);

    return {
      success: false,
      statusCode,
      error: errorType,
      requestId,
      timestamp,
      path,
      message,
      details,
    };
  }

  /**
   * Détermine le code HTTP à renvoyer :
   *  - Si c’est une HttpException, on renvoie son status natif.
   *  - Sinon, on renvoie 500.
   */
  private getStatusCode(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  /**
   * Détermine le type d’erreur (nom de la classe).
   * Pour HttpException, on garde la classe exacte (e.g. 'BadRequestException').
   * Pour un Error custom, on retourne le constructor.name.
   * Sinon 'InternalServerError'.
   */
  private getErrorType(exception: unknown): string {
    if (exception instanceof HttpException) {
      return exception.constructor.name;
    }
    if (exception instanceof Error) {
      return exception.constructor.name || 'InternalServerError';
    }
    return 'InternalServerError';
  }

  /**
   * Détermine le message à renvoyer au client :
   *  - En PROD : toujours un message générique.
   *  - En DEV  :
   *      • Pour HttpException → getResponse() (ou son champ 'message').
   *      • Pour Error natif       → exception.message.
   *      • Pour autre type        → String(exception).
   *
   * On évite tout cast en `any` en vérifiant d'abord la forme de `getResponse()'.
   */
  private getErrorMessage(exception: unknown): string {
    if (this.isProduction) {
      return 'An unexpected error occurred. Please contact support.';
    }

    // Si c’est une HttpException, on essaye d’extraire son payload
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      // 1) Si le response est un string, on le renvoie
      if (typeof response === 'string') {
        return response;
      }
      // 2) Si c’est un objet non-null qui contient une clé 'message' de type string, on la renvoie
      if (
        typeof response === 'object' &&
        response !== null &&
        'message' in (response as any)
      ) {
        // on vérifie explicitement que response['message'] est bien un string
        const maybeMsg = (response as Record<string, unknown>)['message'];
        if (typeof maybeMsg === 'string') {
          return maybeMsg;
        }
      }
      // Par défaut, on renvoie exception.message
      return exception.message;
    }

    // Si c’est une erreur JavaScript standard
    if (exception instanceof Error) {
      return exception.message || 'Unknown error occurred';
    }

    // Sinon, on tente de forcer en string
    return String(exception) || 'Unknown error occurred';
  }

  /**
   * Retourne des informations détaillées sur l’exception pour le DEV :
   *   Pour HttpException → payload de getResponse().
   *  - Pour Error natif       → { name, message, stack filtered}.
   *  - Sinon                   → l’objet exception lui-même.
   */
  private getErrorDetails(exception: unknown): unknown {
    if (exception instanceof HttpException) {
      return exception.getResponse();
    }
    if (exception instanceof Error) {
      // Filtrer le stack trace pour enlever les chemins node_modules
      const rawStack = exception.stack || '';
      const filteredStack = rawStack
        .split('\n')
        .filter((line) => !line.includes('node_modules'))
        .join('\n');
      return {
        name: exception.name,
        message: exception.message,
        stack: filteredStack,
      };
    }
    return exception;
  }

  /**
   * Supprime du corps (body) toutes les données sensibles :
   * - Champs 'password', 'creditCard', etc.
   * - On retourne une copie shallow‐sanitizée.
   */
  private sanitizeBody(body: unknown): unknown {
    if (typeof body === 'object' && body !== null) {
      const sanitized = { ...(body as Record<string, any>) };
      if ('password' in sanitized) {
        delete sanitized.password;
      }
      if ('creditCard' in sanitized) {
        delete sanitized.creditCard;
      }
      if ('token' in sanitized) {
        delete sanitized.token;
      }
      return sanitized;
    }
    return body;
  }

  /**
   * Supprime des headers les données sensibles :
   * - 'authorization', 'cookie', etc.
   * - Retourne une copie shallow sanitizée.
   */
  private sanitizeHeaders(headers: unknown): unknown {
    if (typeof headers === 'object' && headers !== null) {
      const sanitized = { ...(headers as Record<string, unknown>) };
      if ('authorization' in sanitized) {
        delete sanitized.authorization;
      }
      if ('cookie' in sanitized) {
        delete sanitized.cookie;
      }
      if ('set-cookie' in sanitized) {
        delete sanitized['set-cookie'];
      }
      return sanitized;
    }
    return headers;
  }
}
