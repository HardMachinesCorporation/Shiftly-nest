Here's the comprehensive documentation for your PostgreSQL error handling module:

# **PostgreSQL Error Handling Documentation**

## **Overview**

This module provides standardized error handling for PostgreSQL database operations, including:

- Predefined error messages for common PostgreSQL error codes
- Custom `DatabaseError` class for consistent error reporting
- Flexible error details interface for additional metadata

## **Components**

### **1. ErrorDetails Interface**

```typescript
export interface ErrorDetails {
  /**
   * Technical error details (for debugging)
   */
  detail?: string;

  /**
   * Source of the error (service name, module, etc.)
   * @required
   */
  source: string;

  /**
   * Additional metadata about the error
   */
  [key: string]: unknown;
}
```

### **2. PostgreSQL Error Messages (PG_ERROR_MESSAGES)**

```typescript
export const PG_ERROR_MESSAGES: Record<string, string> = {
  '23505': 'This field must be unique. This record already exists.',
  '23503': 'Foreign key violation.',
  '23502': 'A required field is missing.',
  '08001': 'Failed to connect to the database.',
  '40P01': 'A deadlock was detected.',
};
```

**Supported Error Codes:**
| Code | Description | HTTP Equivalent |
|------|-------------|-----------------|
| `23505` | Unique violation (duplicate key) | 409 Conflict |
| `23503` | Foreign key violation | 409 Conflict |
| `23502` | Not null violation | 400 Bad Request |
| `08001` | Connection failure | 503 Service Unavailable |
| `40P01` | Deadlock detected | 423 Locked |

### **3. DatabaseError Class**

```typescript
export class DatabaseError extends Error {
  /**
   * PostgreSQL error code
   * @example '23505'
   */
  public readonly code: string;

  /**
   * Additional error context
   */
  public readonly details?: ErrorDetails;

  /**
   * Creates a new DatabaseError instance
   * @param code - PostgreSQL error code
   * @param message - Fallback message if code isn't recognized
   * @param details - Additional error metadata
   */
  constructor(code: string, message: string, details?: any) {
    super(PG_ERROR_MESSAGES[code] || message);
    this.name = 'DatabaseError';
    this.code = code;
    this.details = details as ErrorDetails;
  }
}
```

## **Usage Examples**

### **Basic Usage**

```typescript
try {
  await repository.save(user);
} catch (error) {
  if (error.code === '23505') {
    throw new DatabaseError(error.code, 'User already exists', {
      source: 'UserService',
      field: 'email',
      value: user.email,
    });
  }
}
```

### **With Full Details**

```typescript
catch (error) {
  throw new DatabaseError(
    error.code,
    'Database operation failed',
    {
      source: 'AuthRepository',
      detail: error.message,
      query: error.query,
      parameters: error.parameters
    }
  );
}
```

## **Best Practices**

1. **Always include source**:

   ```typescript
   new DatabaseError(code, message, {
     source: 'PaymentService', // Required
   });
   ```

2. **Include relevant metadata**:

   ```typescript
   new DatabaseError('23503', 'Invalid reference', {
     source: 'OrderService',
     table: 'orders',
     foreignKey: 'customer_id',
     attemptedValue: order.customerId,
   });
   ```

3. **Map to HTTP status codes**:
   ```typescript
   // In your exception filter:
   switch (error.code) {
     case '23505':
       return HttpStatus.CONFLICT;
     case '23503':
       return HttpStatus.CONFLICT;
     case '23502':
       return HttpStatus.BAD_REQUEST;
     default:
       return HttpStatus.INTERNAL_SERVER_ERROR;
   }
   ```

## **Comparison with TypeOrmError**

| Feature         | DatabaseError                         | TypeOrmError                  |
| --------------- | ------------------------------------- | ----------------------------- |
| **Scope**       | PostgreSQL-specific                   | Generic TypeORM errors        |
| **Error Codes** | PostgreSQL error codes                | TypeORM/MySQL error codes     |
| **Details**     | Requires `source` field               | Flexible structure            |
| **Use Case**    | When working directly with PostgreSQL | When using TypeORM abstractly |

This documentation ensures consistent error handling for PostgreSQL-specific scenarios while providing rich debugging information through the `ErrorDetails` interface.
