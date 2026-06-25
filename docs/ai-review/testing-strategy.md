# AI Reviewer V1 — Testing Strategy

## Unit Test Targets

Unit tests run with Jest, no external dependencies. Mock all I/O.

### `GitlabWebhookVerifierService`

- Valid token matches → no throw
- Invalid token → throws `UnauthorizedException`
- Empty token → throws `UnauthorizedException`
- Whitespace-only token → throws

### `gitlab-mapper.ts`

Use fixture JSON payloads (real GitLab webhook samples saved in `test/fixtures/gitlab/`).

- Maps `open` action correctly to `GitlabMrEvent`
- Maps `update` action
- Maps `reopen` action
- Extracts `gitlabProjectId`, `mrIid`, `mrId`, `sha`, `baseSha` correctly
- Handles missing optional fields gracefully (`mrUrl` absent → `undefined`)

### `AiReviewContextBuilderService`

- Files matching ignore patterns are excluded
- Binary files (empty diff) are excluded
- File count capped at `maxChangedFiles`
- Patch truncated at `maxPatchChars`, `truncated = true`
- `changedFilesCount` reflects post-filter count
- Empty file list after filtering → returns empty context (no throw)
- Default patterns applied when `ignorePatterns = []`

### `AiReviewResultNormalizerService`

- Valid JSON with all required fields → returns `NormalizedReviewResult`
- `confidence < 0.6` → finding dropped
- Invalid JSON → throws
- Missing `findings` array → throws
- Unknown severity string → finding dropped (or mapped to `LOW`)
- Unknown category string → finding dropped
- `confidence` > 1 → clamped to 1
- Empty `findings` array → valid result with zero findings

### `AiReviewSummaryBuilderService`

- HIGH findings get `🔴` prefix
- MEDIUM findings get `🟡` prefix
- LOW findings get `🔵` prefix
- `riskLevel` displayed correctly
- Empty `findings` → "No significant issues found" section
- `suggestedTests` rendered as bullet list
- Timestamp injected in footer
- Long description does not break Markdown rendering

### `PromptBuilderService`

- System prompt is non-empty
- User prompt contains MR title
- User prompt contains file paths
- User prompt contains diff content
- Truncation warning injected when `context.truncated = true`
- Multiple files rendered in correct order

---

## Integration Test Targets

Integration tests use a real test database (MySQL) via Prisma. Mock GitLab API and 9router HTTP calls.

### Webhook Ingestion

Use `supertest` against the NestJS app.

```
POST /webhooks/gitlab/merge-request
```

Fixtures: `test/fixtures/gitlab/mr-opened.json`, `mr-updated.json`, `mr-closed.json`.

- `open` event → job created with `status = QUEUED`, job in queue
- `update` event → job created
- `close` event → 200 response, `{ skipped: true }`, no job created
- Invalid `X-Gitlab-Token` → 401, no job created
- Unknown `gitlabProjectId` → 404, no job created
- `autoReviewEnabled = false` → job created with `QUEUED`, not enqueued
- Missing body → 400

### Review Pipeline (Worker)

Test `AiReviewRunnerService.run()` directly with mocked dependencies.

Mocks:
- `GitlabApiService.getMergeRequest` → returns fixture MR detail
- `GitlabApiService.getMergeRequestChanges` → returns fixture diff
- `AiReviewLlmService.review` → returns fixture JSON response
- `GitlabApiService.postMergeRequestNote` → no-op

Scenarios:
- Happy path → job ends `SUCCESS`, findings saved, `summaryMarkdown` populated
- LLM returns malformed JSON → job ends `FAILED`, `errorMessage` set
- GitLab MR fetch returns 404 → job ends `FAILED`
- GitLab note post returns 403 → job ends `FAILED`, findings still saved
- Zero files after filtering → review proceeds with empty context, LLM returns zero findings
- `maxChangedFiles` exceeded → only N files in context

### Repository Layer

- `AiReviewProjectRepository.findByGitlabProjectId()` → returns correct record
- `AiReviewJobRepository.create()` → record persisted with correct fields
- `AiReviewFindingRepository.createMany()` → all findings persisted
- Job status transitions → `updateStatus()` changes field correctly

---

## Mocked GitLab / LLM Scenarios

Save fixture files in `apps/api/test/fixtures/`:

```
test/fixtures/
├── gitlab/
│   ├── mr-opened.json           # raw GitLab webhook body
│   ├── mr-updated.json
│   ├── mr-closed.json
│   ├── mr-detail.json           # GET /merge_requests/:iid response
│   └── mr-changes.json          # GET /merge_requests/:iid/changes response
└── llm/
    ├── review-response-valid.json       # well-formed LLM output
    ├── review-response-no-findings.json # zero findings
    ├── review-response-malformed.json   # invalid JSON
    └── review-response-low-confidence.json  # all findings confidence < 0.6
```

Use `nock` or NestJS `HttpService` mock to intercept outbound HTTP calls.

---

## V1 Acceptance Criteria

These scenarios must pass before V1 is considered shippable:

| # | Scenario | Expected Outcome |
|---|---|---|
| 1 | `open` webhook arrives for a registered project | Job created, enqueued, worker processes it, note posted to GitLab MR |
| 2 | Webhook with wrong secret | 401 response, no job created |
| 3 | Webhook for unknown `gitlabProjectId` | 404 response, no job created |
| 4 | `close` event | 200 `{ skipped: true }`, no job |
| 5 | MR with 40 changed files | Only 30 files reviewed, note mentions truncation |
| 6 | MR diff exceeds `maxPatchChars` | Patch truncated, note includes truncation warning |
| 7 | LLM returns malformed JSON | Job marked `FAILED`, `errorMessage` stored, no crash |
| 8 | GitLab note POST returns 403 | Job marked `FAILED`, findings still saved in DB |
| 9 | Known patterns in diff (missing `@RequirePermission`) | Finding with `SECURITY / HIGH` appears in output |
| 10 | Clean diff (no real issues) | Zero findings, note states "no significant issues found" |
