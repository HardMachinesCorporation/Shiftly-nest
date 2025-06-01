# `DatabaseFilterException` Full documentation

Below is a detailed, step-by-step explanation-of what the **`DatabaseFilterException`** script does. Think of it as a “safety net” specifically for database‐related errors (TypeORM’s native SQL errors or your custom database exceptions). When one of these exceptions is thrown, this filter:

1. Logs it clearly for traceability.
2. Examines the exception contents (SQL error code or custom fields).
3. Returns a consistent JSON response to the client, with an appropriate HTTP status code, while never leaking sensitive details.

---

## 1. Class Decorator and Purpose

```ts
@Catch(QueryFailedError, TypeOrmError, DatabaseError)
export class DatabaseFilterException implements ExceptionFilter {
  // …
}
```

- **`@Catch(QueryFailedError, TypeOrmError, DatabaseError)`** indicates that this filter only applies to those three exception types:

  1. **`QueryFailedError`** (TypeORM’s built-in SQL errors).
  2. **`TypeOrmError`** (your custom exception class for certain TypeORM‐related failures).
  3. **`DatabaseError`** (another custom exception class, for example to encapsulate specific Postgres errors).

- By implementing `ExceptionFilter`, NestJS knows to invoke this class’s `catch()` method whenever any of those three exception types bubble up from a controller, service, or other layer.

**Overall role:**
If one of those three exceptions is thrown and not already handled by a more specialized filter, NestJS calls this filter. Inside, it:

1. Logs the error for debugging or auditing.
2. Determines exactly which SQL error code or custom error is present.
3. Sends back an appropriate HTTP status code (409, 400, or 500) with a JSON payload, without exposing raw stack traces or sensitive data.

---

## 2. Logger Initialization and Constructor

```ts
private readonly logger = new Logger(DatabaseFilterException.name);

constructor() {
  this.logger.log('🧠 DatabaseFilterException loaded');
}
```

- A **NestJS `Logger`** is created, tagged with `"DatabaseFilterException"`. All calls to `this.logger` inside this class will appear under that context.
- In the constructor, we immediately log `"DatabaseFilterException loaded"` to confirm that the filter has been instantiated when the application starts. This is mainly useful during development or to verify that the filter was registered correctly.

---

## 3. The `catch()` Method

```ts
catch(
  exception: QueryFailedError | TypeOrmError | DatabaseError,
  host: ArgumentsHost
) {
  const ctx = host.switchToHttp();
  const response = ctx.getResponse<Response>();

  // Log for traceability
  this.logger.warn('Exception intercepted:', exception);

  // ─── 1) TypeORM SQL Errors ─────────────────────────────────────────
  if (exception instanceof QueryFailedError) {
    this.logger.warn('→ Caught a TypeORM QueryFailedError');

    // 1️⃣ Retrieve “driverError” as an unknown (not any)
    const maybeDriverError: unknown = (
      exception as QueryFailedError & { driverError?: unknown }
    ).driverError;

    // 2️⃣ Initialize sqlErrorCode to undefined by default
    let sqlErrorCode: string | undefined;

    // 3️⃣ Check that maybeDriverError is a non-null object
    if (typeof maybeDriverError === 'object' && maybeDriverError !== null) {
      // 4️⃣ Cast to Record<string, unknown> to read “code”
      const driverErrorObj = maybeDriverError as Record<string, unknown>;

      // 5️⃣ Only extract “code” if it is a string
      if (typeof driverErrorObj.code === 'string') {
        sqlErrorCode = driverErrorObj.code;
      }
    }

    switch (sqlErrorCode) {
      case '23505': // Unique constraint violation (PostgreSQL)
        return response.status(409).json({
          success: false,
          error: 'Conflict',
          message: 'Duplicate entry. Unique constraint violated.',
        });

      case '23503': // Foreign key violation
        return response.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Foreign key constraint violation.',
        });

      case '23502': // NOT NULL constraint violation
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

  // ─── 2) Custom TypeOrmError ────────────────────────────────────
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

  // ─── 3) Custom DatabaseError ─────────────────────────────────
  this.logger.warn('→ Caught a DatabaseError');
  return response.status(400).json({
    success: false,
    error: exception.name,
    code: exception.code,
    message: exception.message,
    details: exception.details,
  });
}
```

### 3.1. Switching to HTTP Context

- **`const ctx = host.switchToHttp();`**
  We force the context to HTTP (Express).
- **`const response = ctx.getResponse<Response>();`**
  We grab the Express `Response` object so that we can send back JSON.

### 3.2. Initial Warning Log

```ts
this.logger.warn('Exception intercepted:', exception);
```

- Immediately logs a warning with the entire exception object for traceability.
- Helps you see in logs that _any_ database‐related exception has been caught by this filter.

---

### 3.3. Handling `QueryFailedError` (TypeORM’s Native SQL Errors)

```ts
if (exception instanceof QueryFailedError) {
  this.logger.warn('→ Caught a TypeORM QueryFailedError');

  const maybeDriverError: unknown = (
    exception as QueryFailedError & { driverError?: unknown }
  ).driverError;

  let sqlErrorCode: string | undefined;

  if (typeof maybeDriverError === 'object' && maybeDriverError !== null) {
    const driverErrorObj = maybeDriverError as Record<string, unknown>;
    if (typeof driverErrorObj.code === 'string') {
      sqlErrorCode = driverErrorObj.code;
    }
  }

  switch (sqlErrorCode) {
    case '23505':
      return response.status(409).json({
        success: false,
        error: 'Conflict',
        message: 'Duplicate entry. Unique constraint violated.',
      });

    case '23503':
      return response.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Foreign key constraint violation.',
      });

    case '23502':
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
```

1. **Type Check**: If the exception is a `QueryFailedError`, this block runs. That means TypeORM attempted to execute a SQL query and got a database‐level error.

2. **Retrieve `driverError.code`**:

- TypeORM’s `QueryFailedError` often wraps a raw driver error in `exception.driverError`. That raw object typically has a numeric/string `code` (for PostgreSQL, `'23505'` means unique‐constraint violation).
- We first store `exception.driverError` into `maybeDriverError: unknown` (strictly typed as unknown, not any).
- Then we initialize `sqlErrorCode` to `undefined`.
- If `maybeDriverError` is indeed a non-null object, we cast it to `Record<string, unknown>` so we can safely look at `driverErrorObj.code`.
- If `driverErrorObj.code` is a string, we assign `sqlErrorCode` to that string.

3. **Switch on `sqlErrorCode`**:

- **`'23505'`** → **409 Conflict**
  JSON:

  ```jsonc
  {
    "success": false,
    "error": "Conflict",
    "message": "Duplicate entry. Unique constraint violated.",
  }
  ```

- **`'23503'`** → **400 Bad Request**
  JSON:

  ```jsonc
  {
    "success": false,
    "error": "Bad Request",
    "message": "Foreign key constraint violation.",
  }
  ```

- **`'23502'`** → **400 Bad Request**
  JSON:

  ```jsonc
  {
    "success": false,
    "error": "Bad Request",
    "message": "Missing required field.",
  }
  ```

- **`default`** (any other or missing code) → **500 Internal Server Error**
  JSON:

  ```jsonc
  {
    "success": false,
    "error": "Database Error",
    "message": "An unknown database error occurred.",
  }
  ```

**Why this approach?**

- Instead of always returning 500, we tailor the HTTP status code to the specific SQL error. Front-end code can react accordingly: e.g. show “this entry already exists” for 23505 or “missing data” for 23502.
- We never return raw driver error details. Only a concise message string is sent back.

---

### 3.4. Handling `TypeOrmError` (Custom Exception)

```ts
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
```

- If the exception is an instance of your custom `TypeOrmError`, log `"→ Caught a TypeOrmError"`.
- Return **500 Internal Server Error** with a JSON payload containing:

  - `error: exception.name` (class name, e.g. `"TypeOrmError"`).
  - `code: exception.code` (your custom code, e.g. `"USER_NOT_FOUND"`).
  - `message: exception.message` (human-readable explanation).
  - `details: exception.details` (any additional context object or data you attached).

---

### 3.5. Handling `DatabaseError` (Another Custom Exception)

```ts
this.logger.warn('→ Caught a DatabaseError');
return response.status(400).json({
  success: false,
  error: exception.name,
  code: exception.code,
  message: exception.message,
  details: exception.details,
});
```

- If it reaches here, it must be an instance of `DatabaseError` (because the earlier `if` for `TypeOrmError` didn’t match).
- Log `"→ Caught a DatabaseError"`.
- Return **400 Bad Request** with JSON containing:

  - `error: exception.name` (e.g. `"DatabaseError"`).
  - `code: exception.code` (a custom code you assigned, e.g. `"DB_INVALID_DATA"`).
  - `message: exception.message` (explanatory text, e.g. `"Invalid data for column X"`).
  - `details: exception.details` (extra context or metadata).

---

## 4. How Nest Routes Exceptions to This Filter

```
                  ┌───────────────────────────────────────┐
                  │             NestJS App              │
                  └───────────────────────────────────────┘
                                  ↓ (an error is thrown)
      ┌────────────────────────────────────────────────────────────────┐
      │  1) Nest looks for a filter @Catch(SomeOtherExceptionType)   │
      │     → If found (and matches the thrown exception), it runs   │
      │       that filter and stops.                                 │
      └────────────────────────────────────────────────────────────────┘
                                  ↓
      ┌────────────────────────────────────────────────────────────────┐
      │  2) No other filter matched, Nest invokes                     │
      │     DatabaseFilterException (because of                    │
      │     @Catch(QueryFailedError, TypeOrmError, DatabaseError)).   │
      │  → This filter logs & returns an appropriate JSON response.   │
      └────────────────────────────────────────────────────────────────┘
                                  ↓ (no fallback here)
      ┌────────────────────────────────────────────────────────────────┐
      │  3) If the thrown exception was NOT one of those three types,  │
      │     this filter is never executed. Instead, another global     │
      │     or default exception filter would catch it (or Nest’s      │
      │     built-in 500 fallback).                                    │
      └────────────────────────────────────────────────────────────────┘
```

---

## 5. Key Takeaways

1. **Specificity of Interception**

- By listing exactly `QueryFailedError, TypeOrmError, DatabaseError` in `@Catch(…)`, this filter handles only database‐related exceptions.
- Any other error (e.g. a `ValidationError` or a plain `TypeError`) will bypass this filter and go to another filter or Nest’s default 500 handler.

2. **Type-safe Extraction of SQL Error Code**

- We treat `driverError` as `unknown` → then cast to `Record<string, unknown>` → only read `code` if it’s a `string`.
- This avoids any direct `any` cast and avoids ESLint warnings like `no-unsafe-assignment` or `no-unsafe-member-access`.

3. **Appropriate HTTP Status Codes**

- **23505** → **409 Conflict** (duplicate key).
- **23503 or 23502** → **400 Bad Request** (foreign key violation or missing required column).
- **Other or missing SQL code** → **500 Internal Server Error**.

4. **Custom Exceptions**

- **`TypeOrmError`** → always returns **500**, with JSON showing the custom fields.
- **`DatabaseError`** → returns **400**, again with custom `code`, `message`, and optional `details`.

5. **Structured Logging**

- As soon as the filter runs, it logs `Exception intercepted:` plus the raw exception object for full traceability.
- Then it logs a more specific `"→ Caught a TypeORM QueryFailedError"`, `"→ Caught a TypeOrmError"`, or `"→ Caught a DatabaseError"`—making it easy to spot in logs which branch was taken.

---

## 6. Concrete Examples

### Example 1: Unique Constraint Violation

1. You attempt to insert a user with an email that already exists.
2. TypeORM throws `new QueryFailedError(...)` with `driverError.code === '23505'`.
3. In the `catch()` method, `exception instanceof QueryFailedError` is true.
4. We extract `sqlErrorCode = '23505'`.
5. The `switch` matches `'23505'` → returns HTTP **409 Conflict** with:

   ```jsonc
   {
     "success": false,
     "error": "Conflict",
     "message": "Duplicate entry. Unique constraint violated.",
   }
   ```

### Example 2: Custom `TypeOrmError`

1. In some service, you do:

   ```ts
   throw new TypeOrmError('CUSTOM_TYPEORM_FAILURE', 'Something went wrong', {
     id: 123,
   });
   ```

2. In `catch()`, `exception instanceof TypeOrmError` is true.
3. We log `"→ Caught a TypeOrmError"`.
4. Return HTTP **500** with:

   ```jsonc
   {
     "success": false,
     "error": "TypeOrmError",
     "code": "CUSTOM_TYPEORM_FAILURE",
     "message": "Something went wrong",
     "details": { "id": 123 },
   }
   ```

### Example 3: Custom `DatabaseError`

1. You do:

   ```ts
   throw new DatabaseError('DB_INVALID_DATA', 'Invalid data for column X', {
     column: 'X',
     value: null,
   });
   ```

2. In `catch()`, it is _not_ a `QueryFailedError` or `TypeOrmError`, so you skip to the last block.
3. `exception instanceof DatabaseError` is true. We log `"→ Caught a DatabaseError"`.
4. Return HTTP **400** with:

   ```jsonc
   {
     "success": false,
     "error": "DatabaseError",
     "code": "DB_INVALID_DATA",
     "message": "Invalid data for column X",
     "details": { "column": "X", "value": null },
   }
   ```

---

## 7. Summary

- The **`DatabaseFilterException`** class is specifically tagged with `@Catch(QueryFailedError, TypeOrmError, DatabaseError)`. It will only handle those three exception types.
- It logs each error (“Exception intercepted” plus a more detailed sublog) and then inspects the exception to decide which HTTP status and JSON payload to return.
- By carefully casting `driverError` as `unknown → Record<string, unknown>`, it reads the SQL error code in a type-safe way (no raw `any` casts, so ESLint stays happy).
- It returns 409, 400, or 500 for SQL errors, depending on the Postgres error code (`23505`, `23503`, `23502`), and then 500 or 400 for your custom exceptions.
- All responses share the same JSON shape (keys like `success`, `error`, `message`, `code`, `details`), making it easy for front-end code to parse and handle them in a consistent manner.

In short, this filter ensures that all database‐related exceptions are caught, logged, and translated into safe, structured HTTP responses—fulfilling the “Hard Machine Ready™” philosophy of type safety, predictable output, and no sensitive data leakage.
