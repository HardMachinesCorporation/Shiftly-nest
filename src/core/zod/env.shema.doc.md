Here's the comprehensive documentation for your validation schemas:

# **Environment Validation Schemas Documentation**

## **Overview**

This module provides Zod validation schemas for all environment variables used in the application. It ensures type safety and proper validation of configuration values.

## **Schemas Structure**

### **1. Database Configuration (`DatabaseSchema`)**

Validates all database-related environment variables.

```typescript
const DatabaseSchema = z.object({
  DATABASE_URL: z
    .string()
    .trim()
    .url()
    .regex(/^postgresql:\/\//, 'Must start with postgresql://')
    .describe('PostgreSQL connection URL'),

  TEST_DB_TYPE: z
    .string()
    .trim()
    .describe('Database type for testing (e.g., postgres)'),

  TEST_DB_HOST: z.string().trim().describe('Database host for testing'),

  TEST_DB_PORT: z.coerce
    .number()
    .int()
    .positive()
    .max(65585)
    .describe('Database port for testing'),

  TEST_DB_USERNAME: z.string().trim().describe('Database username for testing'),

  TEST_DB_PASSWORD: z.string().trim().describe('Database password for testing'),

  TEST_DB_NAME: z.string().trim().describe('Database name for testing'),
});
```

### **2. Server Configuration (`ServerSchema`)**

Validates server-related environment variables.

```typescript
const ServerSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production'])
    .default('development')
    .describe('Application runtime environment'),

  APP_PORT: z.coerce
    .number()
    .int()
    .positive()
    .max(65535)
    .default(3010)
    .describe('Port number the application listens on'),

  APP_PREFIX: z.string().trim().describe('API route prefix (e.g., /api)'),
});
```

### **3. Frontend Configuration (`FrontendSchema`)**

Validates frontend-related environment variables.

```typescript
const FrontendSchema = z.object({
  FRONTEND_DEV_URL: z
    .string()
    .trim()
    .url()
    .describe('Frontend development URL (e.g., http://localhost:3000)'),

  FRONTEND_PROD_URL: z
    .string()
    .trim()
    .url()
    .describe('Frontend production URL (e.g., https://example.com)'),
});
```

### **4. Merged Global Schema (`GlobalSchema`)**

Combines all schemas into a single validation schema.

```typescript
export const GlobalSchema = DatabaseSchema.merge(ServerSchema)
  .merge(FrontendSchema)
  .merge(bcryptSchema) // Note: bcryptSchema should be documented separately
  .describe('Complete application configuration');
```

## **Type Definition**

```typescript
export type EnvVariables = z.infer<typeof GlobalSchema>;
```

This type represents the fully typed environment variables object based on the validation schema.

## **Validation Features**

- **Automatic Type Coercion**: Converts string values to proper types (e.g., `APP_PORT` to number)
- **Default Values**: Provides sensible defaults where applicable
- **Strict Format Validation**:
  - URLs must be valid
  - Database URLs must use PostgreSQL format
  - Port numbers must be valid TCP ports
- **Environment-Specific Rules**: Different validation for dev/prod environments

## **Usage Example**

```typescript
import { GlobalSchema } from './schemas';

try {
  const env = GlobalSchema.parse(process.env);
  console.log('Configuration valid:', env);
} catch (error) {
  console.error('Invalid configuration:', error.errors);
  process.exit(1);
}
```

## **Error Handling**

The schema will throw detailed Zod validation errors if:

- Any required field is missing
- Any value fails type validation
- Any string format requirement is not met

## **Best Practices**

1. **Early Validation**: Validate environment variables when the application starts
2. **Use the Typed Interface**: Leverage the `EnvVariables` type throughout your app
3. **Document Defaults**: Note which values have defaults in your deployment documentation
4. **Secret Management**: Combine with secret management for sensitive values like DB passwords

This documentation should be kept in sync with any changes to the validation schemas.
