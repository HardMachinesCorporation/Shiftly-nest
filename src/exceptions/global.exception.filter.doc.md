# **`GlobalExceptionFilter`** Full documentation.

Below is a step-by-step walkthrough of what this **`GlobalExceptionFilter`** does. Think of it as a “safety net” that catches any exception not already handled by more specific filters. It then logs appropriately (more details in development, minimal in production), and sends back a consistent JSON response without leaking sensitive information in production.

---

## 1. Class Decorator and Purpose

```ts
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  // …
}
```

- **`@Catch()` without arguments** means “catch all exceptions.” Any error that reaches this filter—whether an `HttpException`, a plain JavaScript `Error`, or something else—will be routed here if no other filter earlier in the chain has already handled it.
- By making the class implement `ExceptionFilter`, Nest knows this class provides a `catch()` method to handle thrown exceptions.

**Purpose:**
This filter sits at the very end of the exception‐filter pipeline. If none of your other filters (e.g. a `DatabaseFilterException` or an `AuthFilterException`) match the thrown exception’s type, Nest will invoke this filter. Its job is to:

1. **Log** the error in a structured way.
2. **Build** a safe JSON response object.
3. **Send** that response back to the client with the appropriate HTTP status.

---

## 2. Constructor and Environment Flag

```ts
private readonly logger = new Logger(GlobalExceptionFilter.name);
private readonly isProduction: boolean = zod.isProd;

constructor() {
  this.logger.log('🧠 GlobalExceptionFilter initialized');
}
```

- We create a **Nest `Logger` instance** named after this class. All log entries will be tagged with `"GlobalExceptionFilter"`.
- We read `zod.isProd`, a boolean from your Zod configuration singleton, to know if we are running in production (`true`) or development (`false`).

  - In production, we must avoid revealing stack traces, request bodies, or headers in our logs or responses.
  - In development, we want maximum detail to debug quickly.

- The constructor logs a simple “initialized” message when the filter is first instantiated.

---

## 3. The `catch()` Method

```ts
catch(exception: unknown, host: ArgumentsHost): void {
  const ctx = host.switchToHttp();
  const response = ctx.getResponse<Response>();
  const request = ctx.getRequest<Request>();

  // 1️⃣ Generate or retrieve a requestId
  const requestId = this.getRequestId(request);

  // 2️⃣ Log the error (detailed in DEV, minimal in PROD)
  this.logError(exception, request, requestId);

  // 3️⃣ Build the JSON response object
  const responseBody = this.prepareResponse(exception, request, requestId);

  // 4️⃣ Send the response with the correct status code
  response.status(responseBody.statusCode).json(responseBody);
}
```

1. **`host.switchToHttp()`**

- We’re assuming an HTTP context (Express under the hood).
- `ctx.getRequest<Request>()` gives us the Express `Request` object.
- `ctx.getResponse<Response>()` gives us the Express `Response` object.

2. **`this.getRequestId(request)`**

- We either reuse a client-supplied `x-request-id` header (if provided), or generate a new `UUID` using `randomUUID()`.
- This “requestId” gets attached to every log entry and is also returned to the client, so if a user calls support, they can say “my `requestId` was …”.

3. **`this.logError(...)`**

- Logs the error in different detail levels based on `isProduction`.
- In **dev**, we log message + stack trace + sanitized request body + sanitized headers.
- In **prod**, we log only the essentials: `requestId`, HTTP method, URL path, timestamp, and the exception’s class name (or “UnknownError” if it wasn’t a normal `Error`).

4. **`this.prepareResponse(...)`**

- Builds a JSON payload with keys like `success`, `statusCode`, `error`, `requestId`, `timestamp`, `path`, `message`, and optionally `details`.
- In **production**, `message` is always a generic “An unexpected error occurred. Please contact support.” and `details` is omitted.
- In **dev**, `message` will reflect the actual error (for `HttpException`, it tries to extract the underlying payload or `exception.message`), and `details` can include stack traces or any extra data.

5. **`response.status(...).json(...)`**

- Finally, we send back that JSON to the client, using the HTTP status code determined by `getStatusCode(exception)`.

---

## 4. Generating or Reusing a `requestId`

```ts
private getRequestId(request: Request): string {
  const headerId = request.headers['x-request-id'];
  if (typeof headerId === 'string' && headerId.trim().length > 0) {
    return headerId;
  }
  return randomUUID();
}
```

- If the client already included an `x-request-id` header, we trust and reuse it.
- Otherwise, we create a new random UUID.

**Why this matters:**
Having a consistent `requestId` ties together all log lines and the final JSON response for that single HTTP request. In production, that ID is essential for cross-referencing logs when troubleshooting.

---

## 5. Structured Logging (`logError`)

```ts
private logError(
  exception: unknown,
  request: Request,
  requestId: string
): void {
  const method = request.method;
  const url = request.url;

  if (this.isProduction) {
    // Production: log only essential data
    this.logger.error(`[${requestId}] Unhandled exception on ${method} ${url}`, {
      requestId,
      error:
        exception instanceof Error
          ? exception.constructor.name
          : 'UnknownError',
      timestamp: new Date().toISOString(),
      path: url,
      method,
    });
  } else {
    // Development: log full details
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
      },
    );
  }
}
```

- **Production logging**

  - We only log:

    - `[requestId] Unhandled exception on GET /api/somepath` (for example)
    - An object containing:
      • `requestId` (the UUID)
      • `error` = either the exception’s class name (e.g. `"TypeError"`, `"BadRequestException"`) or `"UnknownError"` if it wasn’t a proper `Error` instance.
      • `timestamp` (ISO string).
      • `path` and `method`.

  - No request body, no headers, no stack. That way, no user-provided data or stack trace is ever written to production logs.

- **Development logging**

  - We log every detail we can:
    • The same “`[requestId] Unhandled exception on METHOD URL`” prefix.
    • `errorMessage` = the actual `Error.message` or `"Unknown error"`.
    • `stackTrace` = the full stack or a placeholder.
    • `timestamp`, `path`, and `method` as before.
    • `body: this.sanitizeBody(request.body)` → a shallow copy of the request body with sensitive fields removed (e.g. `password`, `creditCard`, `token`).
    • `headers: this.sanitizeHeaders(request.headers)` → a shallow copy of all headers minus sensitive ones (`authorization`, `cookie`, `set-cookie`).

**Why this is helpful:**

- In development, you get every detail you need to debug immediately.
- In production, you avoid leaking passwords, credit card numbers, tokens, or sensitive headers, and you keep your logs succinct—just enough to trace “which endpoint, which requestId, which type of error, and when.”

---

## 6. Building the JSON Response (`prepareResponse`)

```ts
private prepareResponse(
  exception: unknown,
  request: Request,
  requestId: string,
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

  // Pick an appropriate message
  const message = this.getErrorMessage(exception);

  // Only include details in development
  const details = this.isProduction ? undefined : this.getErrorDetails(exception);

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
```

- **`statusCode`**:

  - If `exception` is an `HttpException` (e.g. `BadRequestException`, `NotFoundException`, etc.), we return its native HTTP status (400, 404, etc.).
  - Otherwise, we return `500` (Internal Server Error).

- **`errorType`**:

  - If it’s an `HttpException`, use `exception.constructor.name` (e.g. `"BadRequestException"`).
  - If it’s a regular `Error`, use its class name (e.g. `"TypeError"`).
  - Otherwise, default to `"InternalServerError"`.

- **`message`** (what the client sees):

  - In **production**, always `"An unexpected error occurred. Please contact support."` to avoid leaking internal messages.
  - In **development**:

    1. If it’s an `HttpException`, we call `exception.getResponse()`—that may be a string or an object. If it’s a string, we return it. If it’s an object with a `message` property that is a string, we return that. Otherwise, we fallback to `exception.message`.
    2. If it’s a plain `Error`, return `exception.message` or `"Unknown error occurred"`.
    3. If it’s something else (e.g. a thrown string or a custom non-Error), we convert it to `String(exception)`.

- **`details`** (only in dev):

  - For an `HttpException`, we simply return `exception.getResponse()` (which might be a status code + message object or whatever the original controller or pipe put into it).
  - For a plain `Error`, we return an object `{ name, message, stack }` but with the stack filtered to remove any lines that mention `node_modules` (so it’s easier to trace user‐code frames).
  - Otherwise, we return the raw exception object.

**Resulting JSON payload shape** (in development):

```jsonc
{
  "success": false,
  "statusCode": 400, // if it was a BadRequestException, for example
  "error": "BadRequestException",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-06-01T15:30:00.000Z",
  "path": "/api/some/endpoint",
  "message": "Validation failed: 'email' is required",
  "details": {
    "statusCode": 400,
    "message": "Validation failed: 'email' is required",
    // …or stack trace if it was a plain Error…
  },
}
```

And in **production**, that same request would yield:

```jsonc
{
  "success": false,
  "statusCode": 500, // or the HttpException status if it was an HttpException
  "error": "InternalServerError",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-06-01T15:30:00.000Z",
  "path": "/api/some/endpoint",
  "message": "An unexpected error occurred. Please contact support.",
  // no "details" field at all
}
```

Notice how **no stack, no body, no headers, no internal payload** ever appears in production.

---

## 7. Auxiliary Methods

### 7.1 `getStatusCode(exception: unknown): number`

```ts
private getStatusCode(exception: unknown): number {
  if (exception instanceof HttpException) {
    return exception.getStatus();
  }
  return HttpStatus.INTERNAL_SERVER_ERROR;
}
```

- If the exception is a built-in Nest `HttpException`, we return its HTTP status.
- Otherwise, fallback to `500`.

### 7.2 `getErrorType(exception: unknown): string`

```ts
private getErrorType(exception: unknown): string {
  if (exception instanceof HttpException) {
    return exception.constructor.name;
  }
  if (exception instanceof Error) {
    return exception.constructor.name || 'InternalServerError';
  }
  return 'InternalServerError';
}
```

- If it’s an `HttpException`, we expose something like `"NotFoundException"` or `"ForbiddenException"`.
- If it’s a plain `Error` (custom or built-in), we return its class name (e.g. `"TypeError"`, `"MyCustomError"`).
- Otherwise, default to `"InternalServerError"`.

### 7.3 `getErrorMessage(exception: unknown): string`

```ts
private getErrorMessage(exception: unknown): string {
  if (this.isProduction) {
    return 'An unexpected error occurred. Please contact support.';
  }

  if (exception instanceof HttpException) {
    const response = exception.getResponse();
    if (typeof response === 'string') {
      return response;
    }
    if (
      typeof response === 'object' &&
      response !== null &&
      'message' in (response as any)
    ) {
      const maybeMsg = (response as Record<string, unknown>)['message'];
      if (typeof maybeMsg === 'string') {
        return maybeMsg;
      }
    }
    return exception.message;
  }

  if (exception instanceof Error) {
    return exception.message || 'Unknown error occurred';
  }

  return String(exception) || 'Unknown error occurred';
}
```

- **Production**: one fixed string.
- **Development**:

  1. If it’s an `HttpException`, call `getResponse()`—if that’s a string, return it; if it’s an object that has a `"message"` string property, return that; otherwise, fallback to `exception.message`.
  2. If it’s a plain `Error`, return `exception.message`.
  3. Otherwise, convert to string.

This ensures we never do a blunt `as any`. Instead, we inspect `getResponse()` in a type-safe manner.

### 7.4 `getErrorDetails(exception: unknown): unknown`

```ts
private getErrorDetails(exception: unknown): unknown {
  if (exception instanceof HttpException) {
    return exception.getResponse();
  }
  if (exception instanceof Error) {
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
```

- In **development** only, we expose extra info under `"details"`.
- For an `HttpException`, we simply return its `getResponse()` payload (which might include a `message` array or some validation errors).
- For a plain `Error`, we make a small object with `{ name, message, stack }`, but we filter out any lines from `node_modules` so that you see only user-code frames in your stack trace.
- Otherwise, if someone literally did `throw 'something'`, we return that string.

### 7.5 `sanitizeBody(body: unknown): unknown`

```ts
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
```

- Removes sensitive fields from the request body before logging:

  - If there’s a `password`, `creditCard`, or `token` field, we delete it.
  - Returns a shallow copy. If the body is not an object, we just return it unchanged.

### 7.6 `sanitizeHeaders(headers: unknown): unknown`

```ts
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
```

- Similarly, removes sensitive headers before logging:

  - Deletes `authorization`, `cookie`, and `set-cookie` keys from the headers object.
  - Returns a shallow copy. Non-object headers pass through unchanged.

---

## 8. Summary: How This Filter Protects Production Secrets

1. **Catches anything not handled by other filters** (because `@Catch()` has no type argument).
2. **Generates or reuses a `requestId`** so that logs and users can correlate.
3. **Logs minimally in production** (class name, method, URL, timestamp, requestId)—never the stack, body, or headers.
4. **Logs fully in development** (stack trace, sanitized body, sanitized headers) so you can debug quickly.
5. **Builds a safe JSON response**:

- In production: status code (500 or actual `HttpException` code), class-name style `"error"`, `requestId`, and a generic message.
- In development: includes real exception messages, and if it was an `HttpException`, any details embedded in `getResponse()`.

Because of all these steps, you prevent any sensitive information (passwords, tokens, stack frames, raw request bodies, etc.) from ever being sent to an end user or showing up in your production logs. At the same time, you still have full debug visibility in development.
