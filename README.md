# GH Skeleton Project Monorepo

Repository ini menggunakan struktur monorepo yang scalable:

- `apps/web` — frontend Vue + Vite.
- `apps/api` — backend NestJS + Prisma.
- `apps/landing` — landing page Vue + Vite.
- `packages/shared-types` — shared TypeScript types antar app.
- `packages/shared-utils` — stub utilitas bersama.
- `packages/eslint-config` — stub shared lint config.
- `docs/architecture` — dokumentasi arsitektur.

## Prasyarat

- Node.js 22+
- pnpm 9+ / 10+

## Setup

```bash
pnpm install
```

## Command dari root

```bash
pnpm dev          # Jalankan dev server untuk semua apps
pnpm build        # Build semua workspace aktif
pnpm test         # Jalankan test di workspace yang punya script test
pnpm lint         # Jalankan lint di workspace yang punya script lint
pnpm format       # Jalankan format di workspace yang punya script format
```

## Menjalankan command per workspace

```bash
pnpm --filter gh-skeleton-app <script>
pnpm --filter gh-skeleton-api <script>
pnpm --filter @gh-skeleton/shared-types <script>
pnpm --filter @gh-skeleton/landing <script>
```
