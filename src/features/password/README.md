# 🔐 PasswordService — Secure Hashing & Verification for NestJS

> 🛡️ A production-grade service for password hashing and verification with industrial error handling and Zod-powered environment awareness.

## 🚀 Overview

`PasswordService` is a clean, injectable service that handles password protection and verification using a hashing abstraction (`AbstractHashingService`). It also includes:

- ✅ Built-in error wrapping and logging
- 🔐 Environment-aware error responses (detailed in `dev`, minimal in `prod`)
- 🧠 Zod config integration via singleton
- ⚙️ Composable & testable architecture

---

## 🧩 Architecture

```txt
                ┌────────────────────────────┐
                │ AbstractHashingService     │
                └──────────┬─────────────────┘
                           │
           hashPassword() / comparePassword()
                           │
                ▼
        ┌────────────────────────────┐
        │     PasswordService        │
        │  └─ protectPassword()      │
        │  └─ confirmPassword()      │
        │  └─ handleError()          │
        └────────────────────────────┘
                           │
                   Throws HttpException
```

---

## 🔧 API

### `protectPassword(password: string | Buffer): Promise<string>`

Securely hashes a plain password using the injected hashing strategy.

```ts
const hashed = await passwordService.protectPassword('myPassword123');
```

---

### `confirmPassword(providedPassword: string | Buffer, encryptedPassword: string): Promise<boolean>`

Verifies whether the plain password matches the encrypted version.

```ts
const isValid = await passwordService.confirmPassword(
  'secret',
  user.passwordHash
);
```

---

## 🧱 Error Handling

All internal errors are caught and transformed into `HttpException` objects:

- In **development**, you get:

  ```json
  {
    "message": {
      "errorMessage": "Error: Hash failed",
      "stack": "...",
      "causes": null
    }
  }
  ```

- In **production**, you only get:

  ```json
  {
    "message": "Failed to verify credentials"
  }
  ```

This logic is controlled via the global `zod.currentEnv`.

---

## 🔄 Dependency Injection

This service depends on an abstract interface:

```ts
@Injectable()
export class Argon2HashService implements AbstractHashingService {
  async hashPassword(password: string | Buffer): Promise<string> { ... }

  async comparePassword(password: string | Buffer, hash: string): Promise<boolean> { ... }
}
```

---

## 📁 Folder Structure Recommendation

```
src/
├── auth/
│   └── hashing/
│       ├── abstract/
│       │   └── hashing.service.ts
│       ├── argon2-hash.service.ts
│       ├── password.service.ts
│       └── README.md ← (This file)
```

---

## 🧪 Test Example

```ts
it('should hash and verify password', async () => {
  const hash = await service.protectPassword('admin');
  expect(hash).toBeDefined();
  const match = await service.confirmPassword('admin', hash);
  expect(match).toBe(true);
});
```

---

## 🧠 Best Practices

- ✅ Never expose detailed stack in `prod` (already handled via `zod`)
- 🔁 Use interface-driven hashing (swap between bcrypt, argon2, etc.)
- 🧪 Use unit tests for every edge case (invalid hash, empty password…)

---

## 💬 Credits & Notes

Part of the **Hard Machine Core™ Security Layer**.
Pairs perfectly with `ZodService` and the config singleton pattern.

> **We don't guess credentials — we verify and secure.**

---

## 📎 Related

- [`ZodService`](../../shared/config/README.md) – for environment awareness
- [`AbstractHashingService`](./abstract/hashing.service.ts) – hash strategy contract
- [`AuthModule`](../auth.module.ts) – injectable module
