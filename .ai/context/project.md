# AI Workspace Context: Project Overview

## 1. Project Summary
The `gh-skeleton` project is a Point of Sale (POS) and merchant business management platform designed for UMKM (Micro, Small, and Medium Enterprises). It is a multi-tenant system structured to manage organizations, configurations, users, and automated services (such as AI Code Reviewers).

---

## 2. Monorepo Layout
The repository is managed as a Turborepo + PNPM workspace monorepo:

```text
gh-skeleton/
├── apps/
│   ├── api/            # NestJS Backend API Application
│   ├── web/            # Vue 3 + PrimeVue Merchant Dashboard
│   └── landing/        # Vue 3 Marketing Landing Page
├── packages/
│   ├── shared-types/   # Shared typescript interfaces (API contracts)
│   └── shared-utils/   # Pure utility functions (no framework dependencies)
└── docs/               # In-depth architectural/domain documents
```

---

## 3. Technology Stack

### Backend App (`apps/api`)
- **Core Framework**: NestJS (v11+)
- **Database Access ORM**: Prisma ORM (v7+)
- **Database Engine**: MySQL (snake_case column schemas)
- **Queue System**: BullMQ backed by Redis
- **Authentication**: JWT Guard and RBAC Permissions

### Frontend App (`apps/web`)
- **Core Framework**: Vue 3 (Composition API)
- **Styling UI Framework**: PrimeVue + Tailwind CSS v4
- **State Store**: Pinia

---

## 4. Module Philosophy
- **Feature Encapsulation**: Every new feature operates as an independent module directory containing its own controllers, services, repositories, and DTOs.
- **Strict Decoupling**: Controllers handle routing; services handle business logic; repositories handle SQL query definitions.
