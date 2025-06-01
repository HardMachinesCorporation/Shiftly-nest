export interface ErrorDetails {
  detail?: string;
  source: string;
  [key: string]: unknown;
}

export const PG_ERROR_MESSAGES: Record<string, string> = {
  '23505': 'This field must be unique. This record already exists.',
  '23503': 'Foreign key violation.',
  '23502': 'A required field is missing.',
  '08001': 'Failed to connect to the database.',
  '40P01': 'A deadlock was detected.',
};
export class DatabaseError extends Error {
  public readonly code: string;
  public readonly details?: ErrorDetails;

  constructor(code: string, message: string, details?: any) {
    super(PG_ERROR_MESSAGES[code] || message);
    this.name = 'DatabaseError';
    this.code = code;
    this.details = details as ErrorDetails;
  }
}
