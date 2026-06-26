# Technical Design Specification — AI MR Reviewer V1

This document specifies the technical design, architectural guidelines, code contract, and database schemas for the AI Merge Request Reviewer V1 system built within the `gh-skeleton` monorepo. It serves as a strict implementation contract for developers and AI coding agents.

---

## 1. Module Structure

All backend logic for the AI MR Reviewer resides in `apps/api/src/ai-review`. The directory layout and file responsibilities are detailed below:

```text
apps/api/src/ai-review/
├── constants.ts                    # Global string tokens, queue names, and model configurations
├── ai-review.module.ts             # NestJS module declaration, dependency wiring, and exports
├── ai-review.service.ts            # Simple module status service
├── ai-review.controller.ts         # Module status public check endpoint
│
├── controllers/                    # REST HTTP Endpoints
│   ├── ai-review-project.controller.ts   # CRUD operations for project bindings (scoped to tenant)
│   ├── ai-review-job.controller.ts       # Review job history, status details, and findings viewer
│   ├── ai-review-job.controller.spec.ts  # Controller unit specs
│   └── ai-review-project.controller.spec.ts # Controller unit specs
│
├── dto/                            # Data Transfer Objects with validation annotations
│   ├── create-ai-review-project.dto.ts   # Request body for binding a project configuration
│   ├── update-ai-review-project.dto.ts   # Request body for changing project settings
│   └── list-jobs.dto.ts                  # Paginated filters for job search
│
├── gitlab/                         # GitLab API clients and webhook verifiers
│   ├── gitlab-api.service.ts       # HTTP REST wrapper for MR details, diffs, and notes
│   ├── gitlab-mapper.ts            # Webhook JSON mapper
│   ├── gitlab-mapper.spec.ts       # Webhook mapping specs
│   ├── gitlab-webhook.controller.ts # Callback endpoint for GitLab webhook triggers
│   ├── gitlab-webhook-verifier.service.ts # Validates x-gitlab-token headers
│   ├── gitlab-webhook-verifier.spec.ts # Verifier specs
│   ├── gitlab-webhook.service.ts   # Webhook parser and queue broker
│   └── gitlab-webhook.service.spec.ts # Webhook service specs
│
├── queue/                          # BullMQ queue runner processing
│   ├── ai-review.processor.ts      # BullMQ worker processor extending WorkerHost
│   └── constants.ts                # Queue name token definitions
│
├── repositories/                   # Prisma Data Access Layer (DB First Naming)
│   ├── ai-review-project.repository.ts # SQL wrapper for projects CRUD using unchecked inputs
│   ├── ai-review-job.repository.ts     # SQL wrapper for jobs status manipulation
│   └── ai-review-finding.repository.ts # SQL wrapper for writing bulk findings
│
├── services/                       # Business Logic Layer
│   ├── ai-review-project.service.ts    # Enforces multi-tenant ownership on projects CRUD
│   ├── ai-review-job.service.ts        # Enforces ownership on job details & findings views
│   ├── ai-review-runner.service.ts     # End-to-end review orchestrator
│   ├── ai-review-runner.service.spec.ts # Runner pipeline integration specs
│   ├── ai-review-context-builder.service.ts # Diff filter, truncation, and structure building
│   ├── ai-review-context-builder.service.spec.ts # Context builder specs
│   ├── ai-review-result-normalizer.service.ts # LLM output JSON validation and mapper
│   ├── ai-review-result-normalizer.service.spec.ts # Normalizer specs
│   ├── ai-review-summary-builder.service.ts # Render final MR comment markdown
│   └── ai-review-summary-builder.service.spec.ts # Summary builder specs
│
├── utils/                          # Common pure helper logic
│   └── glob-matcher.ts             # Case-insensitive path wildcard filter
└── llm/                            # LLM adapters and routing prompts
    ├── prompt-builder.service.ts   # Composes ChatMessage array structures
    ├── nine-router.adapter.ts      # 9router client posting json prompts with timeouts
    ├── ai-review-llm.service.ts    # Service mapping context structures to prompt responses
    └── prompts/
        ├── reviewer-system.prompt.ts # System persona and JSON output schema definition
        └── reviewer-user.prompt.ts   # User context structure mapping
```

---

## 2. Dependency Graph

The block diagram below details the operational dependency flow between controllers, services, repositories, and third-party integrations:

```mermaid
graph TD
    GitlabWebhookController --> GitlabWebhookService
    GitlabWebhookService --> AiReviewProjectRepository
    GitlabWebhookService --> AiReviewJobRepository
    GitlabWebhookService --> GitlabWebhookVerifierService
    GitlabWebhookService --> Queue[BullMQ: ai-review Queue]

    AiReviewProcessor --> AiReviewRunnerService

    AiReviewRunnerService --> AiReviewJobRepository
    AiReviewRunnerService --> AiReviewProjectRepository
    AiReviewRunnerService --> AiReviewFindingRepository
    AiReviewRunnerService --> GitlabApiService
    AiReviewRunnerService --> AiReviewContextBuilderService
    AiReviewRunnerService --> AiReviewLlmService
    AiReviewRunnerService --> AiReviewResultNormalizerService
    AiReviewRunnerService --> AiReviewSummaryBuilderService

    AiReviewLlmService --> PromptBuilderService
    AiReviewLlmService --> NineRouterAdapter
```

---

## 3. Request Flow

The sequence diagram illustrates how a GitLab webhook event triggers the API, queues processing, gathers context, connects to the LLM, and publishes a review.

```mermaid
sequenceDiagram
    autonumber
    participant GitLab as GitLab Server
    participant Controller as GitlabWebhookController
    participant WebhookSrv as GitlabWebhookService
    participant Queue as BullMQ (Redis)
    participant Worker as AiReviewProcessor
    participant Runner as AiReviewRunnerService
    participant DB as Prisma (MySQL)
    participant GitLabAPI as GitLab API
    participant NineRouter as 9router Endpoint

    GitLab->>Controller: POST /api/webhooks/gitlab/merge-request (x-gitlab-token)
    activate Controller
    Controller->>WebhookSrv: handleWebhook(token, payload)
    activate WebhookSrv
    WebhookSrv->>DB: findByGitlabProjectId(payload.project.id)
    DB-->>WebhookSrv: project config (webhook_secret, auto_review_enabled)
    WebhookSrv-->>WebhookSrv: verify token matching webhook_secret
    WebhookSrv->>DB: create job (status: QUEUED)
    DB-->>WebhookSrv: saved job
    WebhookSrv->>Queue: Enqueue 'review' (jobId)
    Queue-->>WebhookSrv: ack
    WebhookSrv-->>Controller: { jobId, skipped: false }
    deactivate WebhookSrv
    Controller-->>GitLab: 200 OK (processed)
    deactivate Controller

    Note over Queue, Worker: Worker picks up task asynchronously
    activate Worker
    Queue->>Worker: process(job)
    Worker->>Runner: run(jobId)
    activate Runner
    Runner->>DB: findById(jobId) & findById(projectId)
    DB-->>Runner: job & project records
    Runner->>DB: update status to PROCESSING
    
    Runner->>GitLabAPI: GET /merge_requests/:iid
    GitLabAPI-->>Runner: MR metadata (title, branches)
    Runner->>GitLabAPI: GET /merge_requests/:iid/changes
    GitLabAPI-->>Runner: MR changes (diff patches)
    
    Runner-->>Runner: Filter patterns, construct context, apply limits
    
    Runner->>NineRouter: POST /v1/chat/completions (messages, JSON response format)
    activate NineRouter
    NineRouter-->>Runner: Raw JSON String (findings, summary, riskLevel)
    deactivate NineRouter
    
    Runner-->>Runner: Normalize outputs, check categories, clamp confidence
    
    alt Findings exist
        Runner->>DB: createMany(jobId, findings)
    end
    
    Runner-->>Runner: Build summary markdown string
    
    Runner->>GitLabAPI: POST /merge_requests/:iid/notes (summary markdown)
    GitLabAPI-->>Runner: note published
    
    Runner->>DB: update job to SUCCESS (finished_at, summary_markdown)
    Runner-->>Worker: success
    deactivate Runner
    deactivate Worker
```

---

## 4. Class Responsibilities

### AiReviewProjectService
- **Purpose**: Exposes multi-tenant safe operations to manage project config schemas. Ensures that sensitive credential columns (`access_token`, `webhook_secret`) are sanitized and never exposed to controllers.
- **Dependencies**: `AiReviewProjectRepository`
- **Public Methods**:
  - `create(dto: CreateAiReviewProjectDto, merchantId: string, userId: string): Promise<SanitizedAiReviewProject>`
  - `findAll(merchantId: string): Promise<SanitizedAiReviewProject[]>`
  - `findOne(id: string, merchantId: string): Promise<SanitizedAiReviewProject>`
  - `update(id: string, dto: UpdateAiReviewProjectDto, merchantId: string): Promise<SanitizedAiReviewProject>`
  - `remove(id: string, merchantId: string): Promise<SanitizedAiReviewProject>`
- **Side Effects**: Reads/Writes database records.
- **Expected Errors**: `NotFoundException` if project does not exist or belongs to another merchant.

### AiReviewJobService
- **Purpose**: Provides query logic to list and detail review jobs scoped by tenant.
- **Dependencies**: `PrismaService`
- **Public Methods**:
  - `findAll(merchantId: string, query: ListJobsDto): Promise<{ data: ai_review_jobs[], meta: any }>`
  - `findOne(id: string, merchantId: string): Promise<any>`
- **Side Effects**: Reads database records.
- **Expected Errors**: `NotFoundException` if job not found or associated project belongs to a different merchant.

### AiReviewRunnerService
- **Purpose**: Pipeline orchestrator fetching git changes, calling context builder, sending payload to LLM adapter, parsing, storing findings, and publishing notes to GitLab.
- **Dependencies**: `AiReviewJobRepository`, `AiReviewProjectRepository`, `AiReviewFindingRepository`, `GitlabApiService`, `AiReviewContextBuilderService`, `AiReviewLlmService`, `AiReviewResultNormalizerService`, `AiReviewSummaryBuilderService`
- **Public Methods**:
  - `run(jobId: string): Promise<void>`
- **Side Effects**: Fetches external endpoints, updates job status, writes database tables, posts note comments to GitLab.
- **Expected Errors**: `NotFoundException` on missing entities, or generic bubbles (which transition state to `FAILED`).

### GitlabWebhookService
- **Purpose**: Handles incoming GitLab payload parsing, matches `gitlab_project_id` bindings, validates signatures, creates `QUEUED` jobs, and brokers task enqueues.
- **Dependencies**: `AiReviewProjectRepository`, `AiReviewJobRepository`, `GitlabWebhookVerifierService`, `Queue`
- **Public Methods**:
  - `handleWebhook(token: string, payload: any): Promise<{ jobId?: string, skipped: boolean }>`
- **Side Effects**: Inserts job database records, adds tasks to Redis.
- **Expected Errors**: `BadRequestException` on missing parameter schemas, `NotFoundException` on missing target projects.

### GitlabApiService
- **Purpose**: Direct HTTP client calling GitLab API v4 endpoints with authentication.
- **Dependencies**: None (uses raw `fetch` library)
- **Public Methods**:
  - `getMergeRequest(baseUrl: string, token: string, projectId: string, mrIid: number): Promise<GitlabMrDetail>`
  - `getMergeRequestChanges(baseUrl: string, token: string, projectId: string, mrIid: number): Promise<any>`
  - `postMergeRequestNote(baseUrl: string, token: string, projectId: string, mrIid: number, body: string): Promise<any>`
- **Expected Errors**: `HttpException` reflecting HTTP response statuses.

### AiReviewLlmService
- **Purpose**: Orchestrates prompt compilation and invokes LLM adapter.
- **Dependencies**: `PromptBuilderService`, `NineRouterAdapter`
- **Public Methods**:
  - `review(context: any): Promise<string>`
- **Side Effects**: None.

### NineRouterAdapter
- **Purpose**: Direct API client wrapper connecting to 9router completions endpoint. Enforces a strict 3-minute request timeout.
- **Dependencies**: `ConfigService`
- **Public Methods**:
  - `complete(messages: ChatMessage[], modelOverride?: string): Promise<string>`
- **Expected Errors**: `InternalServerErrorException` on timeout (after 180000ms) or API failures.

### PromptBuilderService
- **Purpose**: Composes system and user chat prompt message structures.
- **Dependencies**: None
- **Public Methods**:
  - `buildSystemPrompt(): string`
  - `buildUserPrompt(context: any): ChatMessage[]`

### AiReviewResultNormalizerService
- **Purpose**: Parses completion strings, strips markdown wrappers, drops invalid findings, maps categories, and transforms objects to standard types.
- **Dependencies**: None
- **Public Methods**:
  - `normalize(rawJson: string): NormalizedReviewResult`

### AiReviewSummaryBuilderService
- **Purpose**: Formats parsed findings, risk levels, and suggested tests into structural Markdown reports.
- **Dependencies**: None
- **Public Methods**:
  - `build(result: NormalizedReviewResult): string`

### AiReviewContextBuilderService
- **Purpose**: Truncates and filters file changes based on pattern filters to ensure prompt limits are not exceeded.
- **Dependencies**: None
- **Public Methods**:
  - `build(mrInfo: any, changes: GitlabMrChange[], project: ai_review_projects): any`

---

## 5. Controller Specification

### `AiReviewProjectController`
- **Base Route**: `/api/ai-review/projects`
- **Guard**: `PermissionGuard` (requires global JWT payload verification)

| Route | Method | Required DTO | Permission | Success | Failure |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/` | `POST` | `CreateAiReviewProjectDto` | `ai_review.projects.create` | `201 Created` with Sanitized Object | `400 Bad Request`, `401 Unauthorized` |
| `/` | `GET` | None | `ai_review.projects.read` | `200 OK` with Array of Sanitized Projects | `401 Unauthorized` |
| `/:id` | `GET` | Param `id` string | `ai_review.projects.read` | `200 OK` with Sanitized Project | `404 Not Found`, `401 Unauthorized` |
| `/:id` | `PATCH` | `UpdateAiReviewProjectDto` | `ai_review.projects.update` | `200 OK` with Updated Project | `404 Not Found`, `400 Bad Request` |
| `/:id` | `DELETE`| Param `id` string | `ai_review.projects.delete` | `200 OK` with Sanitized Deleted Project | `404 Not Found`, `401 Unauthorized` |

---

### `AiReviewJobController`
- **Base Route**: `/api/ai-review/jobs`
- **Guard**: `PermissionGuard`

| Route | Method | Required DTO | Permission | Success | Failure |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/` | `GET` | Query `ListJobsDto` | `ai_review.jobs.read` | `200 OK` with Paginated Jobs List and Meta | `400 Bad Request` |
| `/:id` | `GET` | Param `id` string | `ai_review.jobs.read` | `200 OK` with Job detail and related findings | `404 Not Found` |

---

### `GitlabWebhookController`
- **Base Route**: `/api/webhooks/gitlab`
- **Guard**: None (Public endpoint utilizing callback signature token validations)

| Route | Method | Payload | Headers | Success | Failure |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/merge-request` | `POST` | Raw GitLab Hook JSON | `x-gitlab-token` | `200 OK` with `{ jobId, skipped }` | `400 Bad Request`, `404 Not Found`, `401 Unauthorized` |

---

## 6. DTO Specification

### `CreateAiReviewProjectDto`

```typescript
export class CreateAiReviewProjectDto {
  name: string;                // Required. Min Length 1.
  gitlab_base_url?: string;    // Optional. Default: 'https://gitlab.com'. URL format.
  gitlab_project_id: string;   // Required. String representation of GitLab project ID.
  gitlab_project_path: string; // Required. Path slug representation (e.g. 'mygroup/myproject').
  webhook_secret: string;      // Required. Custom token verifying webhook callbacks.
  access_token: string;        // Required. GitLab Personal/Project Access Token.
  default_branch?: string;     // Optional. Default: 'main'.
  is_active?: boolean;         // Optional. Default: true.
  auto_review_enabled?: boolean; // Optional. Default: true.
  review_mode?: 'DIFF_ONLY' | 'FULL_FILE'; // Optional. Default: 'DIFF_ONLY'.
  max_changed_files?: number;  // Optional. Default: 30. Min: 1, Max: 100.
  max_patch_chars?: number;    // Optional. Default: 120000. Min: 1000, Max: 500000.
  ignore_patterns?: string[];  // Optional. Array of glob paths to ignore.
}
```

*Example Creation Payload:*
```json
{
  "name": "Acme Core Backend Review",
  "gitlab_base_url": "https://gitlab.com",
  "gitlab_project_id": "897654",
  "gitlab_project_path": "acme/backend-core",
  "webhook_secret": "7c980de...1e2f3",
  "access_token": "glpat-zYxWvUtSrQpOnMlKjIhG",
  "auto_review_enabled": true,
  "max_changed_files": 25,
  "max_patch_chars": 150000,
  "ignore_patterns": ["dist/**", "package-lock.json", "*.md"]
}
```

### `UpdateAiReviewProjectDto`
- Inherits from `PartialType(CreateAiReviewProjectDto)`. All properties are optional. Unsupplied properties are ignored.

### `ListJobsDto`
- Inherits from `PaginationDto` (`page` and `limit` default to `1` and `10`).

```typescript
export class ListJobsDto extends PaginationDto {
  project_id?: string;  // Optional UUID filter.
  status?: 'QUEUED' | 'PROCESSING' | 'SUCCESS' | 'FAILED'; // Optional enum filter.
}
```

---

## 7. Prisma Design

Below is the database table specification implemented in MySQL:

### Enums
- `AiReviewProvider`: `['GITLAB']`
- `AiReviewReviewMode`: `['DIFF_ONLY', 'FULL_FILE']`
- `AiReviewJobStatus`: `['QUEUED', 'PROCESSING', 'SUCCESS', 'FAILED']`
- `AiReviewSeverity`: `['HIGH', 'MEDIUM', 'LOW']`
- `AiReviewFindingCategory`: `['SECURITY', 'BUG', 'ARCHITECTURE', 'VALIDATION', 'PERFORMANCE', 'MAINTAINABILITY', 'TESTING']`

### Tables and Columns

```mermaid
erDiagram
    merchants ||--o{ ai_review_projects : owns
    ai_review_projects ||--o{ ai_review_jobs : tracks
    ai_review_jobs ||--o{ ai_review_findings : contains

    ai_review_projects {
        char(36) id PK
        char(36) merchant_id FK
        varchar(150) name
        varchar(255) gitlab_base_url
        varchar(120) gitlab_project_id UK
        varchar(255) gitlab_project_path
        varchar(255) webhook_secret
        text access_token
        varchar(120) default_branch
        boolean is_active
        boolean auto_review_enabled
        varchar(100) review_mode
        int max_changed_files
        int max_patch_chars
        json ignore_patterns
        char(36) created_by
        timestamp created_at
        timestamp updated_at
    }

    ai_review_jobs {
        char(36) id PK
        char(36) ai_review_project_id FK
        varchar(100) event_type
        varchar(100) status
        varchar(120) gitlab_project_id
        int mr_iid
        int mr_id
        varchar(255) mr_title
        varchar(500) mr_url
        varchar(255) source_branch
        varchar(255) target_branch
        varchar(100) sha
        varchar(100) base_sha
        int changed_files_count
        varchar(100) model_name
        varchar(100) review_mode_snapshot
        longtext summary_markdown
        json raw_response_json
        text error_message
        timestamp started_at
        timestamp finished_at
        timestamp created_at
        timestamp updated_at
    }

    ai_review_findings {
        char(36) id PK
        char(36) ai_review_job_id FK
        varchar(500) file_path
        int line
        varchar(50) severity
        varchar(100) category
        varchar(255) title
        text description
        text suggestion
        float confidence
        varchar(255) fingerprint
        timestamp created_at
        timestamp updated_at
    }
```

### Cascade Rules
- `ai_review_projects` to `ai_review_jobs`: `onDelete: Cascade` ensures deletions purge related executions.
- `ai_review_jobs` to `ai_review_findings`: `onDelete: Cascade` purges related child findings.

---

## 8. Queue Design

Asynchronous processing utilizes BullMQ connected to a Redis backend.

- **Queue Name**: `ai-review`
- **Job Name**: `review`
- **Concurrency**: `5` (configured via BullMQ worker registration in processor)
- **Job Payload**:
  ```json
  {
    "jobId": "uuid-string-representing-ai-review-job-record"
  }
  ```
- **Retry Policy**:
  - `attempts: 3`
  - `backoff: { type: 'exponential', delay: 5000 }` (Wait 5s, then 10s, then 20s)
- **Timeout**: Enforced via 9router HTTP signal timeout at `180000ms` (3 minutes).
- **Idempotency Strategy**: 
  - Each GitLab webhook triggers a single database record entry for `ai_review_jobs` with a unique ID mapping to a specific git commit SHA. 
  - The job processor will transition status to `PROCESSING` immediately on check-out. 
  - If a job with the exact same commit `sha` and `mr_iid` has been marked `SUCCESS` recently, the webhook processor skips double-processing.

---

## 9. GitLab Integration

### Webhook Mapping

Incoming GitLab JSON payloads map properties as follows:

| GitLab Payload path | Application Property | Type |
| :--- | :--- | :--- |
| `project.id` | `gitlabProjectId` | string |
| `object_attributes.iid` | `mrIid` | integer |
| `object_attributes.id` | `mrId` | integer |
| `object_attributes.title` | `mrTitle` | string |
| `object_attributes.url` | `mrUrl` | string |
| `object_attributes.source_branch` | `sourceBranch` | string |
| `object_attributes.target_branch` | `targetBranch` | string |
| `object_attributes.last_commit.id` | `sha` | string |
| `object_attributes.target.default_branch` | `defaultBranch` | string |

### Event Filters
- **Supported Action Events**: `open`, `update`, `reopen` trigger processing.
- **Ignored Events**: `close`, `merge`, or any other payload action returns `{ skipped: true }` without creating processing queues.

### GitLab API Endpoints
1. Get MR Info: `/api/v4/projects/:projectId/merge_requests/:mrIid`
2. Get Diff Changes: `/api/v4/projects/:projectId/merge_requests/:mrIid/changes`
3. Publish MR Note: `/api/v4/projects/:projectId/merge_requests/:mrIid/notes`

---

## 10. LLM Integration

### Prompt Compilation
- **System Prompt**: Defines the persona (Elite Code Reviewer), severity buckets (HIGH, MEDIUM, LOW), category scopes, anti-noise rules (no comments on style/formatting, only focus on logic/security/bugs), and strict schema rules.
- **User Prompt**: Supplies structured details containing target branch details, files list, changed lines, and diff fragments.

### JSON Output Schema
The model is strictly configured to return a valid JSON object matching the contract:

```json
{
  "summary": "High level structural analysis of the changes.",
  "riskLevel": "HIGH | MEDIUM | LOW",
  "findings": [
    {
      "filePath": "src/user.service.ts",
      "line": 45,
      "severity": "high | medium | low",
      "category": "security | bug | architecture | validation | performance | maintainability | testing",
      "title": "One line descriptive summary",
      "description": "Elaborate context and code impact explanation",
      "suggestion": "Concrete refactoring or correct implementation snippet",
      "confidence": 0.95
    }
  ],
  "suggestedTests": [
    "Test behavior descriptions for manual verification"
  ]
}
```

---

## 11. Review Algorithm

```text
1. Load Job record (UUID) -> status must be QUEUED.
2. Load Project configurations using associated FK.
3. Transition Job status to PROCESSING, update started_at.
4. Call GitLab API: Fetch MR detailed record (verify MR is not closed/merged).
5. Call GitLab API: Fetch MR file changes payload.
6. Context Builder:
   a. Filter files matching ignore_patterns (glob).
   b. Filter out binary changes or empty file changes.
   c. If file count exceeds max_changed_files: truncate list, append warning.
   d. For each file patch: check size. If character length exceeds max_patch_chars: truncate diff, append truncation flag.
7. Prompt Builder: Compose ChatMessage array injecting clean context structures.
8. NineRouterAdapter: Post body to 9router with response_format json_object.
9. Await response (with 3-minute AbortSignal timeout).
10. Normalizer Service:
    a. Verify valid JSON.
    b. Filter out findings lacking mandatory fields.
    c. Clamp confidence numbers between 0.0 and 1.0.
    d. Map severities and categories to uppercase DB enum values.
11. Write normalized findings bulk to database (findingRepository).
12. Summary Builder: Format markdown string containing headers, risk emojis, sorted findings (HIGH -> MEDIUM -> LOW), and UTC signature.
13. Call GitLab API: Publish MR note containing summary markdown.
14. Transition Job status to SUCCESS, populate finished_at, summary_markdown, and raw_response_json.
```

---

## 12. Error Handling Matrix

| Failure Scenario | Detection Method | Retry Policy | Recovery Action | Logging / Alert |
| :--- | :--- | :--- | :--- | :--- |
| **Invalid webhook token** | HMAC verification mismatch | None (Immediate rejection) | Return `401 Unauthorized` | Warn log showing mismatched client signature. |
| **GitLab unavailable** | `fetch` throws non-2xx status on Git endpoint | BullMQ backoff retry | Job fails, worker retries up to 3 times. | Error log with HTTP status code. |
| **9router API Timeout** | AbortSignal throws `TimeoutError` | BullMQ backoff retry | Job falls to try/catch -> updates status to `FAILED`. | Warn log: "9router: timeout after 180000ms". |
| **LLM returns bad JSON** | normalizer service throws SyntaxError | None | Transition job status to `FAILED`, store error string. | Error log: "Failed to parse LLM raw response JSON". |
| **Database down** | Prisma connection exceptions | BullMQ backoff retry | Let exception bubble to worker processor. | High priority system alert. |
| **Worker crash (OOM)** | Process termination event | Redis lock expiry | BullMQ marks job active/stuck, retry triggers on next API restart. | System logs state transition warning. |

---

## 13. Security Design

### Webhook Verification
GitLab publishes webhook payloads with the `X-Gitlab-Token` header.
```typescript
import { createHmac } from 'crypto';
// Verifier logic
verify(clientToken: string, projectSecret: string) {
  if (clientToken !== projectSecret) {
    throw new UnauthorizedException('Invalid webhook signature');
  }
}
```

### Tenant / Merchant Isolation
- Every database query containing project metadata or job details requires a strict `where: { merchant_id: currentUser.merchantId }` check.
- System pipelines never accept `merchant_id` values from client-facing query inputs; it is extracted directly from the authenticated JWT token payload.

---

## 14. Logging Strategy

Structured JSON logging must be configured for all operational pipeline events:

```json
{
  "timestamp": "2026-06-26T13:30:00Z",
  "level": "INFO",
  "context": "AiReviewRunnerService",
  "event": "review_started",
  "jobId": "job-uuid",
  "projectId": "project-uuid",
  "mrIid": 42
}
```

```json
{
  "timestamp": "2026-06-26T13:31:12Z",
  "level": "ERROR",
  "context": "NineRouterAdapter",
  "event": "llm_timeout",
  "jobId": "job-uuid",
  "error": "LLM request timed out after 180000ms"
}
```

---

## 15. Configuration Matrix

| Env Variable Name | Description | Default | Required / Optional |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | MySQL connection string | None | **Required** |
| `REDIS_HOST` | Redis host for BullMQ | `localhost` | Optional |
| `REDIS_PORT` | Redis port for BullMQ | `6379` | Optional |
| `NINE_ROUTER_API_KEY` | Authentication key for 9router | None | **Required** |
| `NINE_ROUTER_BASE_URL` | Base url endpoint for LLM completion requests | `https://api.9router.com` | Optional |
| `AI_REVIEW_LLM_MODEL` | Default model variant | `gpt-4o` | Optional |
| `AI_REVIEW_LLM_TEMPERATURE` | Temperature setting for review generation | `0.2` | Optional |
| `AI_REVIEW_LLM_MAX_TOKENS` | Tokens cap constraint | `4096` | Optional |

---

## 16. Sequence Diagrams

### Webhook Reception Flow

```mermaid
sequenceDiagram
    participant GitLab
    participant API as GitlabWebhookController
    participant Service as GitlabWebhookService
    participant DB as Prisma (MySQL)
    
    GitLab->>API: POST /webhooks/gitlab/merge-request (Token)
    API->>Service: handleWebhook(Token, Payload)
    Service->>DB: findByGitlabProjectId(projectId)
    DB-->>Service: Project Details (Secret)
    alt Token is valid
        Service->>DB: createJob (status: QUEUED)
        Service->>Queue: Enqueue (jobId)
        Service-->>API: { jobId, skipped: false }
        API-->>GitLab: 200 OK
    else Token is invalid
        Service-->>API: throws UnauthorizedException
        API-->>GitLab: 401 Unauthorized
    end
```

### Worker Flow

```mermaid
sequenceDiagram
    participant Queue as Redis Queue
    participant Worker as AiReviewProcessor
    participant Runner as AiReviewRunnerService
    
    Queue->>Worker: Job active signal (jobId)
    Worker->>Runner: run(jobId)
    alt Run success
        Runner-->>Worker: complete
        Worker->>Queue: Acknowledge job success
    else Run failure (Timeout, API error)
        Runner-->>Worker: throw Error
        Worker->>Queue: Move to FAILED (trigger retry backoff)
    end
```

### LLM Processing Flow

```mermaid
sequenceDiagram
    participant Runner as AiReviewRunnerService
    participant ContextBuilder as ContextBuilder
    participant Adapter as NineRouterAdapter
    participant normalizer as ResultNormalizer
    
    Runner->>ContextBuilder: build(changes, limits)
    ContextBuilder-->>Runner: Context Object (diff, paths)
    Runner->>Adapter: complete(messages)
    Adapter-->>Runner: Raw JSON String
    Runner->>normalizer: normalize(rawJson)
    normalizer-->>Runner: Validated JavaScript Object
```

### note Publishing Flow

```mermaid
sequenceDiagram
    participant Runner as AiReviewRunnerService
    participant DB as Prisma (MySQL)
    participant GitLab as GitLab Note Publisher
    
    Runner->>DB: createMany(findings)
    Runner->>GitLab: postMergeRequestNote(summaryMarkdown)
    GitLab-->>Runner: note created successfully
    Runner->>DB: updateStatus(SUCCESS)
```

---

## 17. State Machine

```mermaid
stateDiagram-v2
    [*] --> QUEUED : Webhook triggers job creation
    
    state QUEUED {
        [*] --> InQueue
    }
    
    InQueue --> PROCESSING : Worker pulls job from Redis
    
    state PROCESSING {
        [*] --> FetchingData
        FetchingData --> LLMCall : Context mapped
        LLMCall --> Normalizing : JSON response received
        Normalizing --> Storing : Validated findings
    }
    
    Storing --> SUCCESS : MR note posted successfully
    
    PROCESSING --> FAILED : Pipeline exception thrown
    
    FAILED --> QUEUED : Attempt count < max_retries (exponential backoff)
    FAILED --> [*] : Max retries exhausted
    SUCCESS --> [*]
```

---

## 18. Future Extension Points

```mermaid
graph TD
    subgraph VCS Providers
        GitLabAdapter[GitLab Provider]
        GitHubAdapter[GitHub Provider]
        BitbucketAdapter[Bitbucket Provider]
    end

    subgraph LLM Providers
        NineRouter[9router API]
        AnthropicClient[Direct Anthropic API]
        OpenAIClient[Direct OpenAI API]
    end

    VCSAdapterInterface[VCS Provider Interface] --> GitLabAdapter
    VCSAdapterInterface --> GitHubAdapter
    VCSAdapterInterface --> BitbucketAdapter

    LLMAdapterInterface[LLM Provider Interface] --> NineRouter
    LLMAdapterInterface --> AnthropicClient
    LLMAdapterInterface --> OpenAIClient
```

- **GitHub/Bitbucket Integration**: Decouple Git API wrappers into individual provider adapters inheriting from a generic `VcsProvider` base interface. Webhook controllers can then route events through a provider factory.
- **Multiple LLMs**: Implement an abstraction layer over `NineRouterAdapter` using an `LlmProvider` client interface. This will allow switching provider drivers (e.g. OpenAI SDK, Anthropic SDK, Bedrock) via config changes.
- **Inline Review Comments**: Switch note publishing from thread comments (`/notes` endpoint) to MR diff comments (`/discussions` endpoint) using GitLab's position parameters (`position: { base_sha, head_sha, start_sha, new_path, new_line }`).

---

## 19. Coding Standards

1. **DB-First Naming Naming Convention**:
   - Database model properties generated via Prisma Client mapping snake_case schema naming directly are written as-is (`ai_review_projects`, `merchant_id`).
   - Pure application variables, DTO properties, and service method declarations must use camelCase naming rules (`merchantId`, `gitlabBaseUrl`).
2. **Controller/Service Boundaries**:
   - Controllers must never write logic parsing raw payloads, running DB queries, or catching external API errors. They simply act as routers injecting decorators and calling service interfaces.
   - Services implement business logic, enforce isolation bounds, and throw standard NestJS HTTP Exceptions (`NotFoundException`, `BadRequestException`).
3. **Repository Pattern**:
   - Access to raw database queries (Prisma Client models) must remain inside dedicated files in `repositories/`. Avoid referencing the `PrismaService` directly in service logic.

---

## 20. Acceptance Checklist

Developers and AI agents must confirm the items below are verified before merging V1:

- [ ] **Cascade Purging**: Deleting a project config record must trigger cascade deletions for all child job logs and finding records.
- [ ] **Multi-Tenant Isolation**: Verify that a merchant tenant can never query or update project configs or jobs belonging to another merchant.
- [ ] **Token Security**: access_token and webhook_secret are excluded from responses returned by `AiReviewProjectController`.
- [ ] **Pattern Ignore Matching**: Ignore pattern configurations correctly skip match cases (e.g. `*.lock`, `dist/**`).
- [ ] **Timeout Enforcement**: A 9router call that hangs longer than 3 minutes must trigger a timeout exception and mark the job `FAILED`.
- [ ] **Validation Limits**: Maximum file changes or patch length limitations correctly trigger warnings and payload truncations, preventing LLM context overflow.
- [ ] **TypeScript Check**: `pnpm run typecheck` compiles with no syntax errors.
- [ ] **Unit and Integration Coverage**: Run all test suites inside `src/ai-review` and ensure 100% of specs pass.
