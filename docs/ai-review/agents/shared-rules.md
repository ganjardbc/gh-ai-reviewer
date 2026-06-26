# Agent Operating Manual: Shared Rules

This document outlines the system invariants and coding rules that apply to **every** autonomous agent operating within this workspace.

---

## 1. Naming Conventions

### Code Artifacts
- **File Names**: Use kebab-case for directories and filenames (`ai-review-project.service.ts`).
- **Class Names**: Use PascalCase (`AiReviewProjectService`).
- **Variables/Properties**: Use camelCase (`merchantId`, `gitlabBaseUrl`).

### Database Conventions (DB-First Prisma mapping)
- **Tables and Columns**: Must use snake_case (`ai_review_projects`, `merchant_id`).

---

## 2. Git Rules

### Branch Naming Standard
- `task/<phase-number>.<task-number>-<slug>`
- *Example*: `task/3.3-gitlab-webhook-controller`

### Commit Message Standard
- `feat(ai-review): implement task <task-number> - <title>`
- *Example*: `feat(ai-review): implement task 3.3 - create webhook callback controller endpoint`

---

## 3. Allowed and Forbidden File Modifications

### Allowed
- Code edits within the specified module directories: `apps/api/src/ai-review/`.
- Creating test specifications files `*.spec.ts` in matching subdirectories.
- Appendices changes in `docs/ai-review/runbook.md` or other local documentation.

### Forbidden
- **No changes** to shared authentication guards or base classes.
- **No global** imports updates in other unrelated features folder scopes.

---

## 4. Multi-Tenant and Isolation Constraints
- **Invariant**: No database query may select, update, or delete rows without specifying `merchant_id` matching the authenticated tenant context.
- **Request Bounding**: Never accept tenant identifiers from client POST request bodies (extract strictly from JWT credentials metadata).

---

## 5. Token Optimization Rules
- Read only relevant context files (do not load entire repositories directories).
- Write precise target lines replacements chunks to save token scopes.
- Clear temporary plan buffers upon task completion.

---

## 6. Definitions of Workflow States

### Definition of Blocked
A task is **Blocked** if it lacks necessary API secrets to verify third-party calls, contains compilation failures that cannot be resolved, or has conflicting dependencies.

### Definition of Complete
A task is **Complete** if its code exists in the codebase, passes all TypeScript compiler verification tests, has an accompanying unit test spec verifying its correctness, and is marked completed `[x]` inside [tasks-v1.md](file://{project-root}/docs/ai-review/tasks-v1.md).
