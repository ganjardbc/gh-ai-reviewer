# AI Reviewer V1 — Architecture

## System Components

```
GitLab
  │  MR webhook (POST /webhooks/gitlab/merge-request)
  ▼
┌─────────────────────────────────────────────────────────────────┐
│  apps/api  (NestJS)                                             │
│                                                                 │
│  GitlabWebhookController                                        │
│      │  verify token → map payload → find AiReviewProject      │
│      │  create AiReviewJob (QUEUED) → enqueue                  │
│      ▼                                                          │
│  BullMQ Queue  ──────────────────────────────────────────────► │
│                                                                 │
│  AiReviewProcessor (BullMQ Worker)                             │
│      │  load job + project                                      │
│      │  mark PROCESSING                                         │
│      │                                                          │
│      ├── GitlabApiService                                       │
│      │       GET /projects/:id/merge_requests/:iid             │
│      │       GET /projects/:id/merge_requests/:iid/changes     │
│      │                                                          │
│      ├── AiReviewContextBuilderService                         │
│      │       filter ignored files, truncate patch              │
│      │                                                          │
│      ├── AiReviewLlmService → NineRouterAdapter                │
│      │       call 9router → strict JSON response               │
│      │                                                          │
│      ├── AiReviewResultNormalizerService                       │
│      │       parse + validate JSON → AiReviewFinding[]         │
│      │                                                          │
│      ├── AiReviewSummaryBuilderService                         │
│      │       render Markdown summary                            │
│      │                                                          │
│      └── GitlabApiService                                       │
│              POST /projects/:id/merge_requests/:iid/notes      │
│                                                                 │
│  Prisma → MySQL                                                │
│      AiReviewProject / AiReviewJob / AiReviewFinding           │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
                        GitLab MR note posted
```

---

## High-Level Request Flow

1. **Webhook ingress** — `GitlabWebhookController` receives `POST /webhooks/gitlab/merge-request`.
2. **Verification** — `GitlabWebhookVerifierService` validates `X-Gitlab-Token` header against the stored `webhookSecret` on the matching `AiReviewProject`.
3. **Payload mapping** — `gitlab-mapper.ts` normalises the raw GitLab JSON into an internal `GitlabMrEvent` shape.
4. **Project lookup** — `AiReviewProjectService` resolves the `AiReviewProject` by `gitlabProjectId`.
5. **Job creation** — `AiReviewJobService` creates an `AiReviewJob` record with `status = QUEUED`.
6. **Enqueue** — The job ID is pushed onto the BullMQ `ai-review` queue.
7. **Worker pickup** — `AiReviewProcessor` dequeues and executes the full review pipeline.
8. **Persistence** — Findings written via `AiReviewFindingRepository`; job updated to `SUCCESS` or `FAILED`.
9. **Note post** — `GitlabApiService` POSTs the Markdown summary to the MR.

---

## Service Responsibilities

| Service | Responsibility |
|---|---|
| `GitlabWebhookController` | HTTP entry point, delegates to service |
| `GitlabWebhookService` | Orchestrates webhook ingestion: verify → map → find project → create job → enqueue |
| `GitlabWebhookVerifierService` | Validates `X-Gitlab-Token` header |
| `GitlabApiService` | All outbound GitLab REST API calls (MR detail, changes, post note) |
| `gitlab-mapper.ts` | Stateless transform: raw GitLab payload → internal types |
| `AiReviewProjectService` | CRUD + lookup for `AiReviewProject` records |
| `AiReviewJobService` | Create, status-transition, fetch for `AiReviewJob` records |
| `AiReviewProcessor` | BullMQ processor; orchestrates the full review pipeline |
| `AiReviewRunnerService` | Core pipeline logic called by the processor |
| `AiReviewContextBuilderService` | Builds the review payload from MR diff (filter, truncate, format) |
| `AiReviewLlmService` | LLM client abstraction; delegates to `NineRouterAdapter` |
| `NineRouterAdapter` | HTTP adapter for 9router API |
| `PromptBuilderService` | Composes system + user prompts from templates |
| `AiReviewResultNormalizerService` | Parses and validates LLM JSON response into `AiReviewFinding[]` |
| `AiReviewSummaryBuilderService` | Renders Markdown summary from findings |

---

## Module Layout

```
apps/api/src/modules/ai-review/
├── ai-review.module.ts
├── controllers/
│   ├── ai-review-project.controller.ts   # CRUD API for project bindings
│   ├── ai-review-job.controller.ts       # Job listing + detail API
│   └── gitlab-webhook.controller.ts      # Webhook receiver
├── dto/
│   ├── create-ai-review-project.dto.ts
│   ├── update-ai-review-project.dto.ts
│   └── enqueue-mr-review.dto.ts
├── services/
│   ├── ai-review-project.service.ts
│   ├── ai-review-job.service.ts
│   ├── ai-review-runner.service.ts
│   ├── ai-review-context-builder.service.ts
│   ├── ai-review-result-normalizer.service.ts
│   ├── ai-review-summary-builder.service.ts
│   └── gitlab-webhook.service.ts
├── repositories/
│   ├── ai-review-project.repository.ts
│   ├── ai-review-job.repository.ts
│   └── ai-review-finding.repository.ts
├── queue/
│   ├── ai-review.queue.ts
│   └── ai-review.processor.ts
├── gitlab/
│   ├── gitlab-api.service.ts
│   ├── gitlab-webhook-verifier.service.ts
│   └── gitlab-mapper.ts
├── llm/
│   ├── ai-review-llm.service.ts
│   ├── nine-router.adapter.ts
│   ├── prompt-builder.service.ts
│   └── prompts/
│       ├── reviewer-system.prompt.ts
│       └── reviewer-user.prompt.ts
├── constants/
├── enums/
├── interfaces/
└── utils/
```

---

## Deployment / Runtime Considerations

- **Queue backend**: BullMQ requires Redis. Configure `REDIS_HOST` / `REDIS_PORT` env vars.
- **Worker concurrency**: Default concurrency = 5. Tune via `AI_REVIEW_WORKER_CONCURRENCY` env var. Each job makes external HTTP calls (GitLab + 9router), so concurrency is I/O-bound, not CPU-bound.
- **Job TTL**: Completed jobs should be removed from Redis after 24h to prevent unbounded growth (`removeOnComplete: { age: 86400 }`).
- **GitLab API rate limits**: GitLab SaaS enforces 2000 req/min per token. At 3 API calls per job, the ceiling is ~666 concurrent reviews/min — well above V1 needs.
- **9router timeouts**: LLM calls can take 30–90s. Set worker job timeout to 3 minutes.
- **Database**: All Prisma models target MySQL 8. JSON columns (`rawResponseJson`, `ignorePatterns`) use MySQL `JSON` type.
- **Horizontal scaling**: Multiple API instances can share the same Redis queue. BullMQ handles deduplication per job ID.
