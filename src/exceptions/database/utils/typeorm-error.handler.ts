import { ErrorDetails } from './postgres-error.handler';

export const TYPEORM_ERROR_MESSAGES: Record<string, string> = {
  ER_DUP_ENTRY: 'Unique key violation detected.',
  ER_NO_REFERENCED_ROW: 'Foreign key constraint violation.',
  ER_NO_DEFAULT_FOR_FIELD: 'A required field is missing.',
  ER_LOCK_DEADLOCK: 'A database deadlock was detected.',
  ER_QUERY_INTERRUPTED: 'The query was interrupted.',
  ER_SYNTAX_ERROR: 'SQL syntax error.',
  ER_ACCESS_DENIED_ERROR: 'Database access denied.',
  ER_UNKNOWN_ERROR: 'An unknown TypeORM error occurred.',
};

export class TypeOrmError extends Error {
  code: string;
  details?: ErrorDetails;

  constructor(code: string, message?: string, details?: any) {
    super(TYPEORM_ERROR_MESSAGES[code] || message || 'Unknown TypeORM error');
    this.name = 'TypeOrmError';
    this.code = code;
    this.details = details as ErrorDetails;
  }
}
