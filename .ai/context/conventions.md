# AI Workspace Context: Conventions

## 1. Naming & Case Styles
- **Source Files**: kebab-case (`gitlab-api.service.ts`).
- **TypeScript Classes**: PascalCase (`GitlabApiService`).
- **Prisma Schema Tables & Columns**: snake_case (`ai_review_projects`, `merchant_id`).
- **TypeScript Variables / Properties**: camelCase (`merchantId`, `gitlabBaseUrl`).

---

## 2. API Response Formatting
All endpoint controllers must envelope returns using standard response structures:

*Success Response Format:*
```json
{
  "success": true,
  "data": {}
}
```

*Error Response Format:*
```json
{
  "success": false,
  "message": "Error details here",
  "code": "ERROR_CODE"
}
```

---

## 3. NestJS Architecture Rules
- Enforce validation pipelines on all inputs via `ValidationPipe` annotations inside DTOs.
- Secure every route using global JWT guards. Public routes must use `@Public()`.
- Secure specific controller operations using `@RequirePermission('permission.code')` and `@UseGuards(PermissionGuard)`.

---

## 4. Testing Conventions
- Keep test specifications files next to code files under test (`ai-review-runner.service.spec.ts`).
- Mock third-party service dependencies (such as GitLab API and LLM clients) inside unit tests.
