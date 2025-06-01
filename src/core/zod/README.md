# 🧠 ZodService — Validated & Cached Config Layer for NestJS

> 🔐 A typed, validated, and industrial-grade configuration service for NestJS apps, built with Zod.

## 🚀 Overview

`ZodService` is a powerful abstraction on top of NestJS’s `ConfigService` that provides:

- ✅ **Zod-based validation** of `.env` variables at startup
- 🧠 **Strong TypeScript typings** via `EnvVariables` inference
- ⚙️ **Internal caching** to avoid redundant lookups
- 🔍 **Verbose logging** (differentiated for `dev` vs `prod`)
- ❌ **Fail-fast error handling** with `EnvVariablesError`
- 🧱 **Global singleton export** (`zod`) to use outside DI context

---

## 📦 Features

- 🔐 Strict runtime validation of environment variables
- 🧰 Convenient helpers: `.isDev`, `.frontendURL`, `.ApplicationPort`, etc.
- 💾 Internal `Map` cache for performance
- 🚨 Throws custom error if any key is missing or invalid
- 🧪 Test-ready config support (`TEST_DB_*` block)

---

## 🧱 Architecture

```txt
┌─────────────────────┐
│    .env (raw)       │
└────────┬────────────┘
         ▼
┌─────────────────────┐
│   validateEnv()     │ ← Zod validation
└────────┬────────────┘
         ▼
┌─────────────────────┐
│ ConfigService<T>    │ ← Typed source
└────────┬────────────┘
         ▼
┌────────────────────────────────────────┐
│        ZodService (core logic)         │
│  └─ get(), getRaw(), config, etc.      │
│  └─ .isDev / .isProd / .apiPrefix      │
└────────────────────────────────────────┘
         ▼
┌─────────────────────────────┐
│     export const zod = ...  │ ← Global singleton
└─────────────────────────────┘
```

---

## 📂 Usage Example

```ts
// Anywhere in your app
import { zod } from '~/shared/config/zod-config.singleton';

const apiUrl = `${zod.frontendURL}${zod.apiPrefix}`;

if (zod.isDev) {
  console.log('⚙️ Running in development mode');
}
```

---

## 🔧 Key Methods

| Method            | Description                                     |
| ----------------- | ----------------------------------------------- |
| `get(key)`        | Retrieves a typed env var (with caching + logs) |
| `getRaw(key)`     | Same, but uncached (used at boot time)          |
| `config`          | Fully validated, frozen config object           |
| `isDev / isProd`  | Flags for current environment                   |
| `ApplicationPort` | Returns `APP_PORT` as a number                  |
| `frontendURL`     | Dynamic frontend URL based on current env       |
| `apiPrefix`       | Returns `APP_PREFIX` (e.g. `/api/v1`)           |

---

## 🧱 How it’s initialized

```ts
import * as dotenv from 'dotenv';
import { validateEnv } from './core/zod/validate-env';
import { ConfigService } from '@nestjs/config';
import { ZodService } from './core/zod/zod.service';

dotenv.config(); // 1. Load .env
const parsedEnv = validateEnv(process.env); // 2. Validate with Zod
const configService = new ConfigService(parsedEnv); // 3. Create typed config
export const zod = new ZodService(configService); // 4. Export singleton
```

---

## 🧪 Test Example

```ts
import { ZodService } from '~/core/zod/zod.service';
import { ConfigService } from '@nestjs/config';

const mockConfig = new ConfigService({
  NODE_ENV: 'test',
  DATABASE_URL: 'postgres://localhost/test-db',
  APP_PORT: 4000,
  // ...
});

const zod = new ZodService(mockConfig);
expect(zod.get('DATABASE_URL')).toContain('test-db');
```

---

## ❌ Error Handling

If a required variable is missing, empty, or invalid:

```ts
throw new EnvVariablesError('DATABASE_URL', 'development');
```

You’ll get logs + traceable context by default.

---

## 📁 Recommended Folder Structure

```
src/
├── core/
│   └── zod/
│       ├── zod.service.ts
│       ├── env-schemas.ts
│       ├── env-error.ts
│       ├── validate-env.ts
├── shared/
│   └── config/
│       └── zod-config.singleton.ts
```

---

## 💡 Best Practices

- ✅ Run `.env` validation **before** `AppModule` boot
- 💾 Use `zod` singleton anywhere: CLI tools, workers, tests
- 🚫 Never use `process.env` directly in your codebase

---

## 🛡️ License & Ownership

Created by \[Hard Machine × 🤖 Aegis] with passion and precision.
Free to use in any industrial-grade NestJS project.

---

> **We code. We build. We industrialize. No doubt. No barrier. No limit.**

```

---


```
