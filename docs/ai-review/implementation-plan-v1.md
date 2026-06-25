# AI Reviewer V1 — Implementation Plan

## Phase Overview

| Phase | Focus | Deliverable |
|---|---|---|
| 0 | Infrastructure | Redis + BullMQ wired, env vars, module scaffold |
| 1 | Data model | Prisma schema + migration, repositories |
| 2 | GitLab integration | Webhook receiver + GitLab API client |
| 3 | Pipeline core | Context builder, LLM adapter, normalizer |
| 4 | Output | Summary builder, note posting |
| 5 | Queue + processor | Worker wiring, end-to-end flow |
| 6 | Management API | Project CRUD, job listing |
| 7 | Tests + hardening | Unit + integration tests, error handling audit |

---

## Phase 0 — Infrastructure

**Goal**: The module can be imported, queues are registered, env vars are documented.

### Tasks

1. Add `@nestjs/bull`, `bull`, `ioredis` (or `bullmq` + `@nestjs/bullmq`) to `apps/api`.
2. Add Redis connection config to `app.module.ts` using `ConfigService`.
3. Create `apps/api/src/modules/ai-review/` directory scaffold (all subdirectories, empty index files).
4. Create `ai-review.module.ts` with `BullModule.registerQueue({ name: 'ai-review' })`.
5. Document required env vars in `apps/api/.env.example`.

### Commit order

```
feat: scaffold ai-review module structure
feat: configure BullMQ redis connection for ai-review queue
```

---

## Phase 1 — Data Model

**Goal**: All three Prisma models exist and are migrated. Repositories are functional.

### Tasks

1. Add enums to `schema.prisma`: `AiReviewProvider`, `AiReviewReviewMode`, `AiReviewJobStatus`, `AiReviewSeverity`, `AiReviewFindingCategory`.
2. Add models: `AiReviewProject`, `AiReviewJob`, `AiReviewFinding`.
3. Run `prisma migrate dev --name add_ai_review_tables`.
4. Implement `AiReviewProjectRepository`:
   - `create(data)`
   - `findById(id)`
   - `findByGitlabProjectId(gitlabProjectId)`
   - `update(id, data)`
   - `list(merchantId?)`
5. Implement `AiReviewJobRepository`:
   - `create(data)`
   - `findById(id)`
   - `updateStatus(id, status, extras?)`
   - `listByProject(projectId)`
6. Implement `AiReviewFindingRepository`:
   - `createMany(aiReviewJobId, findings[])`
   - `listByJob(jobId)`

### Commit order

```
feat: add AiReview Prisma models and enums
feat: implement ai-review repository layer
```

---

## Phase 2 — GitLab Integration

**Goal**: Webhook endpoint works end-to-end. GitLab API client can fetch MR details and post notes.

### Tasks

1. Implement `gitlab-mapper.ts` — pure function, unit-testable, no deps.
2. Implement `GitlabWebhookVerifierService` — token comparison.
3. Implement `GitlabApiService`:
   - `getMergeRequest()`
   - `getMergeRequestChanges()`
   - `postMergeRequestNote()`
4. Implement `GitlabWebhookService`:
   - Verify token
   - Map payload
   - Find `AiReviewProject`
   - Create `AiReviewJob`
   - Enqueue (or skip if `autoReviewEnabled = false`)
5. Implement `GitlabWebhookController`:
   - `POST /webhooks/gitlab/merge-request`
   - No auth guard (public endpoint)
   - Returns `{ jobId }` on enqueue, `{ skipped: true }` on skip
6. Write unit tests for mapper + verifier.
7. Write integration test for webhook endpoint (mock GitLab API, assert job created).

### Commit order

```
feat: implement gitlab-mapper and webhook verifier
feat: implement GitlabApiService (MR detail, changes, note post)
feat: implement webhook ingestion flow (service + controller)
test: add unit tests for gitlab integration layer
```

---

## Phase 3 — Pipeline Core

**Goal**: Given a loaded job + project, the system can build a context, call the LLM, and normalize results.

### Tasks

1. Implement `AiReviewContextBuilderService`:
   - File filtering (ignore patterns, binary)
   - File count cap
   - Patch char cap + truncation flag
2. Implement `reviewer-system.prompt.ts` — system prompt constant.
3. Implement `reviewer-user.prompt.ts` — `renderUserPrompt(context: ReviewContext): string`.
4. Implement `PromptBuilderService` — composes `messages[]`.
5. Implement `NineRouterAdapter` — HTTP POST to 9router, handles timeout.
6. Implement `AiReviewLlmService` — calls adapter, returns raw JSON string.
7. Implement `AiReviewResultNormalizerService` — parse + validate + map enums.
8. Write unit tests for context builder and normalizer (use fixtures).

### Commit order

```
feat: implement AiReviewContextBuilderService with filtering and truncation
feat: implement LLM prompt templates (system + user)
feat: implement NineRouterAdapter and AiReviewLlmService
feat: implement AiReviewResultNormalizerService
test: add unit tests for context builder and result normalizer
```

---

## Phase 4 — Output

**Goal**: The system can render a Markdown summary and post it to GitLab.

### Tasks

1. Implement `AiReviewSummaryBuilderService` — renders Markdown from `NormalizedReviewResult`.
2. Write unit tests for summary builder (assert Markdown structure, emoji presence, zero-findings case).
3. Manually test summary rendering by calling `postMergeRequestNote` against a real test GitLab project.

### Commit order

```
feat: implement AiReviewSummaryBuilderService
test: add unit tests for summary markdown rendering
```

---

## Phase 5 — Queue Processor

**Goal**: End-to-end flow is wired. A queued job runs to completion.

### Tasks

1. Implement `AiReviewRunnerService` — orchestrates steps 1–11 of the pipeline (see `review-pipeline.md`).
2. Implement `AiReviewProcessor`:
   - Extend `WorkerHost` (BullMQ)
   - Call `AiReviewRunnerService.run(jobId)`
   - Handle errors → mark `FAILED`
3. Wire all services into `ai-review.module.ts` providers.
4. Write integration test for `AiReviewRunnerService` with mocked GitLab + LLM.
5. Manual end-to-end test: trigger a real webhook, verify note appears on GitLab MR.

### Commit order

```
feat: implement AiReviewRunnerService pipeline orchestration
feat: implement AiReviewProcessor BullMQ worker
feat: wire ai-review.module.ts providers and exports
test: add integration test for end-to-end review pipeline
```

---

## Phase 6 — Management API

**Goal**: Admins can create/update/list review projects and view jobs via REST API.

### Tasks

1. Implement `AiReviewProjectService` — CRUD delegating to repository.
2. Create DTOs: `CreateAiReviewProjectDto`, `UpdateAiReviewProjectDto`.
3. Implement `AiReviewProjectController`:
   - `POST /ai-review/projects`
   - `GET /ai-review/projects`
   - `GET /ai-review/projects/:id`
   - `PATCH /ai-review/projects/:id`
   - `DELETE /ai-review/projects/:id`
4. Implement `AiReviewJobService` — fetch jobs, paginate.
5. Implement `AiReviewJobController`:
   - `GET /ai-review/jobs` (filter by projectId, status)
   - `GET /ai-review/jobs/:id` (includes findings)

All management endpoints require authentication + appropriate permission codes.

### Commit order

```
feat: implement AiReviewProjectService and management controller
feat: implement AiReviewJobController for job listing and detail
```

---

## Phase 7 — Tests and Hardening

**Goal**: All V1 acceptance criteria pass. Error paths are robust.

### Tasks

1. Complete test coverage for all services (unit) and key flows (integration).
2. Audit all error paths: every `throw` in the pipeline should result in a `FAILED` job, not a crash.
3. Verify `accessToken` is never returned in any API response (check all DTOs and serializers).
4. Load test: simulate 20 concurrent webhooks, verify no job data corruption.
5. Review and update `runbook.md` based on what was actually built.

### Commit order

```
test: add remaining unit and integration tests for ai-review module
fix: harden error handling across review pipeline
security: exclude accessToken from all AiReviewProject API responses
```

---

## MVP Milestone

V1 MVP is complete when:

- [ ] Phase 0–5 all merged to main
- [ ] At least one real GitLab MR has been reviewed end-to-end
- [ ] All 10 acceptance criteria in `testing-strategy.md` pass
- [ ] No `accessToken` or `webhookSecret` exposed in any API response
- [ ] Runbook is up to date and tested by at least one non-author
