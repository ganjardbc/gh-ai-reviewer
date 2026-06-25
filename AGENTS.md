# AGENTS.md

## Project

GH Skeleton Project

## Product Summary

GH Skeleton Project adalah platform **Point of Sale + Manajemen Bisnis Skeleton untuk UMKM**.

Produk ini memungkinkan merchant untuk:

* Mengelola user dengan RBAC (flat role-based).
* Mengelola data organisasi/merchant.
* Melakukan upload file/media.
* Menerima notifikasi sistem.

---

# Mandatory Context

Sebelum mengerjakan task, baca dokumen berikut sesuai kebutuhan.

## Database

```txt
docs/database/database-design.md
```

## Backend

```txt
docs/backend/nestjs-guidelines.md
docs/backend/prisma-guidelines.md
```

---

# Architecture Rules

Project menggunakan:

```txt
Monorepo (Turborepo + PNPM Workspace)
Vue 3 + Vite
Pinia
PrimeVue
Tailwind CSS v4
NestJS
Prisma
MySQL
```

Root structure:

```txt
apps/
  web/        — Vue 3 frontend (dashboard)
  api/        — NestJS backend
  landing/    — Vue 3 landing page (marketing)

packages/
  shared-types/
  shared-utils/
  eslint-config/

docs/
```

---

# Implementation Principles

## Build One Task At A Time

Jangan membangun seluruh fitur sekaligus. Selesaikan satu task kecil, lalu lanjut ke task berikutnya.

---

# Backend Rules

Backend berada di:

```txt
apps/api
```

Framework:

```txt
NestJS
Prisma
MySQL
JWT
RBAC
```

Ikuti:

```txt
docs/backend/nestjs-guidelines.md
docs/backend/prisma-guidelines.md
apps/api/AGENTS.md
```

---

## Backend Module Structure

Setiap module harus mengikuti struktur:

```txt
module-name/
  dto/
  module-name.module.ts
  module-name.controller.ts
  module-name.service.ts
```

Contoh:

```txt
users/
  dto/
    create-user.dto.ts
    update-user.dto.ts

  users.module.ts
  users.controller.ts
  users.service.ts
```

---

## Controller Rules

Controller hanya boleh:

* Menerima request.
* Menggunakan DTO.
* Menggunakan decorator.
* Memanggil service.
* Mengembalikan response.

Controller **tidak boleh** berisi business logic, DB query, atau Prisma call.

---

## Service Rules

Service berisi:

* Business logic.
* Multi-tenant scope (merchant_id dari auth user, bukan dari client).
* Database query via Prisma.
* Error handling.

---

## Auth Rules

Gunakan global JWT guard.

Semua route protected secara default.

Public route wajib memakai:

```ts
@Public()
```

---

## RBAC Rules

Gunakan permission decorator:

```ts
@RequirePermission('user.create')
```

Permission format: `<resource>.<action>`

Contoh:

```txt
merchants.read
merchants.update
role.create
role.read
role.update
role.delete
role.assign
permission.create
permission.read
permission.delete
user.create
user.read
user.update
user.delete
notification.read
notification.update
upload.create
upload.read
upload.delete
```

---

## Multi-Tenant Rules

Setiap query harus di-scope dengan `merchant_id` from auth user.

Jangan pernah mengambil `merchant_id` dari client request body.

Benar:

```ts
const merchantId = currentUser.merchantId;
return this.prisma.users.findMany({
  where: { merchant_id: merchantId },
});
```

Salah:

```ts
return this.prisma.users.findMany({
  where: { merchant_id: body.merchantId }, // FORBIDDEN
});
```

---

## Prisma Rules

Jangan membuat PrismaClient baru di service.

Gunakan:

```ts
constructor(private readonly prisma: PrismaService) {}
```

Prisma berada di:

```txt
apps/api/prisma/schema.prisma
```

---

# Frontend Rules

Frontend berada di:

```txt
apps/web
```

Framework:

```txt
Vue 3
Composition API
Pinia
Vue Router
PrimeVue
Tailwind CSS v4
```

Ikuti:

```txt
apps/web/AGENTS.md
```

---

## Frontend Module Structure

Setiap frontend module harus mengikuti:

```txt
modules/module-name/
  pages/
  components/
  stores/
    state.ts
    getters.ts
    actions.ts
    index.ts
  services/
    module.service.ts
    constants.ts
    rbac.ts
  router/
    index.ts
```

---

## Routing Rules

Setiap module memiliki route sendiri:

```txt
modules/*/router/index.ts
```

Global router auto-load route module menggunakan pattern:

```ts
import.meta.glob('../modules/**/router/index.ts', { eager: true });
```

Route meta wajib menggunakan:

```ts
meta: {
  title: 'Page Title',
  layout: 'default',
  permission: ['user.read'],
  breadcrumbs: [...],
}
```

Layout tersedia:

```txt
default    — dashboard layout (sidebar + header)
auth       — auth layout (centered)
public     — public layout (no auth)
```

---

## Store Rules

Gunakan Pinia.

Store pattern split file:

```txt
stores/
  state.ts     — state definition
  getters.ts   — computed getters
  actions.ts   — async actions + mutations
  index.ts     — compose & export
```

Store hanya untuk: Auth state, UI state (loading, pagination, filters), cached module data.

Business logic utama tetap di backend.

---

## Service Rules

API call frontend harus berada di:

```txt
modules/module-name/services/module.service.ts
```

Gunakan shared HTTP client dari:

```txt
src/plugins/axios.ts
```

---

# Shared Package Rules

## shared-types

Path: `packages/shared-types` — scope `@gh-skeleton/shared-types`

Isi type yang menjadi kontrak antara frontend dan backend:

```txt
ApiResponse<T>
PaginationMeta
AuthUser
UserSummary
```

## shared-utils

Path: `packages/shared-utils` — Pure function, tidak bergantung ke Vue atau NestJS.

---

# Database Rules

Ikuti:

```txt
docs/database/database-design.md
```

Wajib gunakan:

```txt
UUID primary key (CHAR 36)
snake_case database column dan Prisma model (DB-first)
index untuk foreign key dan field yang sering diquery
```

Prisma naming mengikuti DB column karena project ini DB-first (schema.prisma di-generate dari MySQL).

---

# API Rules

Base path: `/api`

Response format success:

```json
{
  "success": true,
  "data": {}
}
```

Response format list:

```json
{
  "success": true,
  "data": [],
  "meta": { "page": 1, "limit": 10, "total": 100, "total_pages": 10 }
}
```

Response format error:

```json
{
  "success": false,
  "message": "Error message",
  "code": "ERROR_CODE"
}
```

---

# Security Rules

Jangan pernah:

```txt
Menyimpan password plain text
Log JWT token atau password
Query resource tanpa merchant_id scope
Trust merchant_id dari client input
Expose data merchant lain
Bypass RBAC permission check
```

---

# AI Agent Working Rules

Saat mengerjakan task:

1. Baca dokumen terkait dari `docs/`.
2. Jangan mengubah scope tanpa alasan kuat.
3. Jangan refactor besar tanpa instruksi.
4. Jangan menghapus file tanpa alasan jelas.
5. Jangan membuat duplicate type jika sudah ada di `shared-types`.
6. Setelah selesai, update dokumentasi yang relevan.
7. Pastikan typecheck dan build berjalan.

---

# Definition of Done

```txt
Code implemented
No obvious TypeScript error
No duplicate logic
No broken existing flow
Follows folder convention
Follows API contract
Multi-tenant scope applied
Permission check applied
```

---

# Forbidden Actions

```txt
Generate all modules at once
Trust merchant_id dari client body
Bypass permission guard
Bypass JWT guard tanpa @Public()
Membuat PrismaClient baru di service
Menyimpan logic bisnis di controller
Menyimpan DB query di controller
Duplicate type yang sudah ada di shared-types
```
