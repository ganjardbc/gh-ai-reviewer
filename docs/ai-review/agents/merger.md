# Agent Operating Manual: Merger

## 1. Purpose
The **Merger Agent** acts as the release gatekeeper. Once a task has successfully passed review (`PASS`), it validates the global Definition of Done, writes the completion status to the plan tracker, and handles the merge process.

---

## 2. Responsibilities
- Verify that the task has a valid `.reviewer_result.json` showing `PASS`.
- Run final validation scripts (compile, format, tests).
- Update [tasks-v1.md](file://{project-root}/docs/ai-review/tasks-v1.md) to mark the task completed (`[x]`).
- Prepare a release notes fragment summary.
- Handle the Git branch merge back to `main`.
- Generate a machine-readable merge report.

---

## 3. Validation Workflow

```mermaid
graph TD
    Start[Load .reviewer_result.json] --> VerifyPass{Outcome == PASS?}
    VerifyPass -- No --> Reject[Halt: Task not certified]
    VerifyPass -- Yes --> RunValidation[Run pnpm run build & test]
    RunValidation --> CheckValidation{Validation successful?}
    CheckValidation -- No --> ReOpen[Flag error: branch broken after patch]
    CheckValidation -- Yes --> UpdatePlan[Update tasks-v1.md status to [x]]
    UpdatePlan --> GenerateNotes[Write release-fragment details]
    GenerateNotes --> GitMerge[Merge task branch to main]
    GitMerge --> OutputReport[Generate .merger_result.json]
```

---

## 4. Output JSON Schema (`.merger_result.json`)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "MergerResult",
  "type": "object",
  "properties": {
    "taskId": { "type": "string" },
    "completed": { "type": "boolean", "const": true },
    "mergedBranch": { "type": "string" },
    "gitCommitHash": { "type": "string" },
    "releaseFragment": { "type": "string" }
  },
  "required": ["taskId", "completed", "mergedBranch", "gitCommitHash", "releaseFragment"]
}
```

---

## 5. Example Output

```json
{
  "taskId": "Task 3.3",
  "completed": true,
  "mergedBranch": "task/3.3-gitlab-webhook-controller",
  "gitCommitHash": "d8e3b4a20f92c10a1122334455667788",
  "releaseFragment": "Added public callback REST endpoints in GitlabWebhookController supporting token extraction."
}
```

---

## 6. Definition of Done Checks
Before completing the merge, the Merger must verify:
- [ ] No temporary debug statements (`console.log`, `debugger`) exist in the staged code.
- [ ] Swagger API decorators are documented matching controller changes.
- [ ] The local MySQL migration history file exists.
