# **ZodService Documentation**

`ZodService` is a robust configuration service that manages environment variables with Zod type validation. It provides typed and secure access to application configuration.

## **Key Features**

- Strict environment variable validation
- Value caching for optimal performance
- Detailed logging in development mode
- Environment-specific handling (dev/prod)
- Immutable configuration

---

## **Public Methods**

### **`config`**

Returns the complete application configuration as an immutable object.

```typescript
/**
 * Retrieves and validates the application configuration from environment variables.
 * @returns {Readonly<EnvVariables>} Immutable configuration object
 * @throws {Error} If any required variable is missing
 */
get config(): Readonly<EnvVariables>
```

---

### **`get(key)`**

Retrieves a specific environment variable with caching and strong typing.

```typescript
/**
 * Gets an environment variable with type safety and caching
 * @template K - Key type (auto-inferred)
 * @param {K} key - Variable name
 * @returns {EnvVariables[K]} Typed value
 * @throws {EnvVariablesError} If variable is missing
 */
get<K extends keyof EnvVariables>(key: K): EnvVariables[K]
```

---

## **Utility Getters**

### **Environment**

| Method       | Description              |
| ------------ | ------------------------ | ------------ | ------- |
| `isProd`     | `true` if in production  |
| `isDev`      | `true` if in development |
| `currentEnv` | Returns `'development'   | 'production' | 'test'` |

### **Application Configuration**

| Method            | Description                            |
| ----------------- | -------------------------------------- |
| `ApplicationPort` | Application listening port             |
| `apiPrefix`       | API route prefix (e.g. `/api`)         |
| `databaseURL`     | Database connection URL                |
| `frontendURL`     | Frontend URL (environment-appropriate) |

---

## **Private Methods**

### **`getRaw(key)`**

Non-cached version of `get()` for initialization.

```typescript
/**
 * Internal method to bypass cache for initial setup
 * @private
 */
private getRaw<K extends keyof EnvVariables>(key: K): EnvVariables[K]
```

---

## **Lifecycle**

### **`onModuleInit()`**

Initializes the service when the application starts.

```typescript
/**
 * NestJS lifecycle hook - Loads environment configuration
 */
onModuleInit(): void
```

---

## **Usage Example**

```typescript
// Accessing configuration
const dbUrl = zodService.databaseURL;
const port = zodService.ApplicationPort;

// Environment check
if (zodService.isDev) {
  logger.debug('Development mode active');
}

// Direct typed access
const apiPrefix = zodService.get('APP_PREFIX');
```

---

## **Error Handling**

The service throws custom `EnvVariablesError` when:

- A required variable is missing
- A value is empty or malformed

In development mode, every config access is logged for debugging.

---

## **Best Practices**

1. **Prefer getters** (`databaseURL`) over direct `get()` for clarity
2. **Always catch** `EnvVariablesError` during startup
3. **Use `isProd`/`isDev`** for feature flipping

This service centralizes all application configuration with an additional layer of security and type safety.
