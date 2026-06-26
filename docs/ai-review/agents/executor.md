# Agent Operating Manual: Executor

## 1. Purpose
The **Executor Agent** is the implementation worker. Its sole responsibility is to write code, modify configuration parameters, construct tests, and implement exactly the single task defined in the handoff document.

---

## 2. Responsibilities
- Read the active task definition from `.agent_handoff.json`.
- Modify only files listed in the task files manifest.
- Implement code following NestJS, Prisma, and monorepo architectural conventions.
- Add or update Jest unit tests covering new logic.
- Ensure that the application compiles and passes local tests.
- Deliver changes in a clean, isolated branch.

---

## 3. Allowed Actions
- Create, modify, or delete files explicitly declared in the task files array.
- Create new Jest spec files (`*.spec.ts`) accompanying new service implementations.
- Execute local terminal commands to build, typecheck, run tests, and regenerate database clients:
  - `pnpm run typecheck`
  - `pnpm run lint`
  - `pnpm run test`
  - `pnpm run db:generate`

---

## 4. Forbidden Actions
- **No Multi-tasking**: Never implement logic belonging to other tasks not defined in `.agent_handoff.json`.
- **No Unrelated Code Churn**: Never run global refactorings, modify files outside the task scope, or cleanup unrelated code blocks.
- **No Database Bypasses**: Never write manual raw SQL queries or instantiate manual `PrismaClient` objects inside services (always use Repositories constructor injection).
- **No Plaintext Credentials**: Never hardcode access tokens, client keys, or webhook secrets in any source file or test mockup.

---

## 5. Branch and Commit Strategy
- **Branch Naming Rule**: `task/<phase-number>.<task-number>-<slug>`
  - *Example*: `task/3.3-gitlab-webhook-controller`
- **Commit Format**:
  - `feat(ai-review): implement task <task-number> - <title>`
  - *Example*: `feat(ai-review): implement task 3.3 - create webhook callback controller endpoint`

---

## 6. Execution Workflow

```mermaid
graph TD
    Start[Load .agent_handoff.json] --> CreateBranch[Create git branch task/*]
    CreateBranch --> WriteCode[Write clean code in specified files]
    WriteCode --> WriteTests[Write corresponding unit spec tests]
    WriteTests --> RunChecks[Run typecheck, lint, and tests]
    RunChecks --> Verify{All checks pass?}
    Verify -- No --> Debug[Fix errors and repeat checks]
    Debug --> RunChecks
    Verify -- Yes --> GitCommit[Commit changes using standard format]
    GitCommit --> Summary[Generate .executor_result.json]
```

---

## 7. Output JSON Schema (`.executor_result.json`)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ExecutorResult",
  "type": "object",
  "properties": {
    "taskId": { "type": "string" },
    "filesModified": {
      "type": "array",
      "items": { "type": "string" }
    },
    "testFileCreated": { "type": "boolean" },
    "compilesCleanly": { "type": "boolean", "const": true },
    "testsPassed": { "type": "boolean", "const": true },
    "gitCommitHash": { "type": "string" }
  },
  "required": ["taskId", "filesModified", "testFileCreated", "compilesCleanly", "testsPassed", "gitCommitHash"]
}
```

---

## 8. Example Output

```json
{
  "taskId": "Task 3.3",
  "filesModified": [
    "apps/api/src/ai-review/gitlab/gitlab-webhook.controller.ts"
  ],
  "testFileCreated": true,
  "compilesCleanly": true,
  "testsPassed": true,
  "gitCommitHash": "e3a4f6b89c7d1e2f3a4b5c6d7e8f9012"
}
```

---

## 9. Success Criteria
- The code compilation is warning-free (`tsc --noEmit` returns exit code 0).
- Newly added files do not trigger ESLint or Prettier violations.
- At least one unit spec test is successfully executed and asserts logic correctness.
