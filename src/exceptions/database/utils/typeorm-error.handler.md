Here's the comprehensive documentation for your TypeORM error handling module:

# **TypeORM Error Handling Documentation**

## **Overview**

This module provides standardized error handling for TypeORM database operations, including:

- Predefined error messages for common TypeORM/SQL errors
- Custom `TypeOrmError` class for consistent error reporting
- Detailed error information including error codes and metadata

## **Components**

### **1. Error Messages (`TYPEORM_ERROR_MESSAGES`)**

A dictionary mapping common TypeORM/SQL error codes to human-readable messages.

```typescript
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
```

**Supported Error Codes:**
| Code | Description | HTTP Equivalent |
|------|-------------|-----------------|
| `ER_DUP_ENTRY` | Unique constraint violation | 409 Conflict |
| `ER_NO_REFERENCED_ROW` | Foreign key violation | 409 Conflict |
| `ER_NO_DEFAULT_FOR_FIELD` | Missing required field | 400 Bad Request |
| `ER_LOCK_DEADLOCK` | Database deadlock | 423 Locked |
| `ER_QUERY_INTERRUPTED` | Query execution interrupted | 503 Service Unavailable |
| `ER_SYNTAX_ERROR` | Invalid SQL syntax | 400 Bad Request |
| `ER_ACCESS_DENIED_ERROR` | Permission denied | 403 Forbidden |

### **2. TypeOrmError Class**

Custom error class for TypeORM-related exceptions.

```typescript
export class TypeOrmError extends Error {
  /**
   * Original database error code
   */
  code: string;

  /**
   * Additional error details
   */
  details?: ErrorDetails;

  /**
   * Creates a new TypeOrmError instance
   * @param code - Database error code (e.g., 'ER_DUP_ENTRY')
   * @param [message] - Custom error message (falls back to predefined messages)
   * @param [details] - Additional error metadata
   */
  constructor(code: string, message?: string, details?: any) {
    super(TYPEORM_ERROR_MESSAGES[code] || message || 'Unknown TypeORM error');
    this.name = 'TypeOrmError';
    this.code = code;
    this.details = details as ErrorDetails;
  }
}
```

## **Usage Examples**

### **Basic Usage**

```typescript
try {
  await repository.save(entity);
} catch (error) {
  if (error.code === 'ER_DUP_ENTRY') {
    throw new TypeOrmError(error.code, 'Custom message if needed', {
      entityId: entity.id,
    });
  }
  // Other error handling
}
```

### **With Error Details**

```typescript
catch (error) {
  throw new TypeOrmError(
    error.code,
    undefined, // Will use predefined message
    {
      query: error.query,
      parameters: error.parameters,
      affectedEntity: 'User'
    }
  );
}
```

## **Best Practices**

1. **Consistent Error Handling**:

   ```typescript
   // Instead of:
   throw new Error('Duplicate entry');

   // Use:
   throw new TypeOrmError('ER_DUP_ENTRY');
   ```

2. **Error Metadata**:

   ```typescript
   new TypeOrmError(code, message, {
     table: 'users',
     constraint: 'username_unique',
   });
   ```

3. **HTTP Error Mapping**:
   ```typescript
   // In your global exception filter:
   if (error instanceof TypeOrmError) {
     const status = this.getHttpStatusForCode(error.code);
     response.status(status).json(error);
   }
   ```

## **Error Details Interface**

The `ErrorDetails` type (imported from './postgres-error.handler') should include:

```typescript
interface ErrorDetails {
  table?: string;
  constraint?: string;
  query?: string;
  parameters?: any[];
  // Additional database-specific metadata
}
```

This documentation ensures consistent error handling across your database operations while providing rich error information for debugging and client feedback.
