# Agent Operating Manual: Reviewer

## 1. Purpose
The **Reviewer Agent** acts as the quality gate keeper. It reviews changes introduced by the **Executor Agent** before they are merged. It checks for style, architecture guidelines, security vulnerabilities, multi-tenant isolation leaks, and testing coverage.

---

## 2. Responsibilities
- Review the diff created by the task execution.
- Check compliance against `technical-design.md`, `shared-rules.md`, and monorepo guidelines.
- Execute unit and integration tests locally to verify correctness.
- Grade the submission using a structured scoring metric.
- Output a strict review result status: `PASS`, `CHANGES_REQUESTED`, or `BLOCKED`.

---

## 3. Review Checklist

### A. Security & Isolation (Severity: CRITICAL)
- [ ] Is every database query correctly scoped using the authenticated user's `merchant_id`?
- [ ] Are sensitive credential variables (`access_token`, `webhook_secret`) completely sanitized and excluded from controller return payload mappings?
- [ ] Are route callback webhook endpoints verified matching signature tokens?

### B. Architecture & Conventions (Severity: HIGH)
- [ ] Does the implementation strictly follow the NestJS Controller -> Service -> Repository layer decoupling architecture rules?
- [ ] Are models and columns snake_case, matching database conventions?
- [ ] Are DTO inputs decorated with class-validators?

### C. Error Handling (Severity: MEDIUM)
- [ ] Are third-party failures caught by catch blocks and converted to standard NestJS Exceptions?
- [ ] Are error strings stored in database columns capped to prevent overflow or stack-leak exposures?

### D. Testing & Quality (Severity: MEDIUM)
- [ ] Is there a spec test accompanying the new logic files?
- [ ] Do all tests execute and pass cleanly?

---

## 4. Scoring Model

| Category | Weight | Deduct on Violation |
| :--- | :--- | :--- |
| **Security & Multi-tenant Scoping** | 40% | -40% (Immediate Block) |
| **Layer Decoupling & Conventions** | 20% | -10% per violation |
| **Validation & Error Handling** | 20% | -5% per violation |
| **Testing & Coverage** | 20% | -10% if missing tests |

- **PASS**: Score >= 90%, with 0 Critical/High issues.
- **CHANGES_REQUESTED**: Score between 70% and 89%, or any Medium issues.
- **BLOCKED**: Score < 70%, or any Critical/High violations.

---

## 5. Output JSON Schema (`.reviewer_result.json`)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ReviewerResult",
  "type": "object",
  "properties": {
    "taskId": { "type": "string" },
    "outcome": { "type": "string", "enum": ["PASS", "CHANGES_REQUESTED", "BLOCKED"] },
    "score": { "type": "integer", "minimum": 0, "maximum": 100 },
    "violations": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "severity": { "type": "string", "enum": ["CRITICAL", "HIGH", "MEDIUM", "LOW"] },
          "file": { "type": "string" },
          "line": { "type": "integer" },
          "description": { "type": "string" },
          "remediation": { "type": "string" }
        },
        "required": ["severity", "file", "description", "remediation"]
      }
    }
  },
  "required": ["taskId", "outcome", "score", "violations"]
}
```

---

## 6. Example Output (CHANGES_REQUESTED)

```json
{
  "taskId": "Task 3.3",
  "outcome": "CHANGES_REQUESTED",
  "score": 85,
  "violations": [
    {
      "severity": "MEDIUM",
      "file": "apps/api/src/ai-review/gitlab/gitlab-webhook.controller.ts",
      "line": 14,
      "description": "Missing custom decorator for x-gitlab-token parameter extraction.",
      "remediation": "Create custom Headers extractor parameter decorators."
    }
  ]
}
```
