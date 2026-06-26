# AI Workspace Context: Architecture

This document summarizes system boundaries, dependency directions, and package separations. Detailed specifications reside under the main [docs/](file://{project-root}/docs/) directory.

---

## 1. Dependency Flow Invariant

Code dependencies must strictly flow in a single direction. Circular dependencies between modules, folders, or services are strictly forbidden.

```text
HTTP Controller
     │
     ▼
Business Service
     │
     ▼
Repository Layer
     │
     ▼
Prisma Service (Database)
```

---

## 2. Module Decoupling and Boundaries

1.  **Shared Types Contract**: Contracts between frontend (`web`) and backend (`api`) are defined inside `@gh-skeleton/shared-types` workspace package.
2.  **No Direct Cross-Module Imports**: Services in Module A must never import services from Module B directly. Communication must be routed through shared events or modular helper services.
3.  **Repository Isolation**: Access to database models must always be routed through repositories. Do not import `PrismaService` inside services or controllers directly.

---

## 3. Layer Responsibilities

### Controller Boundary
- Parse incoming HTTP requests, validate parameters (DTOs), apply guards (JWT/RBAC), and return standardized success/failure JSON envelopes.

### Service Boundary
- Execute business validations, enforce multi-tenant isolation, process external client HTTP integrations, and update transaction records.

### Repository Boundary
- Execute raw database queries, handle batch transactions, and translate prisma schemas outputs to application domain models.
