# AI Reviewer V1 — Configuration

## Environment Variables

All env vars are defined in `apps/api/.env`. Required vars must be set before the module can process any jobs.

### Required

| Variable | Description | Example |
|---|---|---|
| `NINE_ROUTER_BASE_URL` | Base URL of the 9router API | `https://9router.internal` |
| `NINE_ROUTER_API_KEY` | API key for 9router authentication | `sk-...` |
| `REDIS_HOST` | Redis hostname for BullMQ | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |

### Optional

| Variable | Default | Description |
|---|---|---|
| `AI_REVIEW_LLM_MODEL` | `claude-sonnet-4-6` | Model name sent to 9router |
| `AI_REVIEW_LLM_TEMPERATURE` | `0.2` | LLM temperature (0–1) |
| `AI_REVIEW_LLM_MAX_TOKENS` | `4096` | Max tokens in LLM response |
| `AI_REVIEW_WORKER_CONCURRENCY` | `5` | BullMQ worker concurrency |
| `AI_REVIEW_JOB_TIMEOUT_MS` | `180000` | Worker job timeout (3 min) |
| `AI_REVIEW_JOB_TTL_COMPLETED_S` | `86400` | Seconds to keep completed jobs in Redis (24h) |
| `AI_REVIEW_JOB_TTL_FAILED_S` | `604800` | Seconds to keep failed jobs in Redis (7 days) |

---

## Project-Level Configuration

Each `AiReviewProject` record stores per-project configuration. These are set via the management API.

### Review Behaviour

| Field | Type | Default | Description |
|---|---|---|---|
| `auto_review_enabled` | boolean | `true` | When false, webhooks are accepted but jobs are not enqueued |
| `review_mode` | enum | `DIFF_ONLY` | V1 only supports `DIFF_ONLY` |
| `max_changed_files` | int | `30` | Max number of changed files sent to LLM after filtering |
| `max_patch_chars` | int | `120000` | Max total patch text characters sent to LLM |
| `ignore_patterns` | string[] (JSON) | see below | Glob patterns for files to exclude |

### Default `ignore_patterns`

```json
[
  "dist/**",
  "build/**",
  "coverage/**",
  "node_modules/**",
  "pnpm-lock.yaml",
  "yarn.lock",
  "package-lock.json",
  "*.lock",
  "**/__snapshots__/**",
  "*.snap",
  "*.png",
  "*.jpg",
  "*.jpeg",
  "*.gif",
  "*.svg",
  "*.ico",
  "*.woff",
  "*.woff2",
  "*.ttf",
  "*.eot",
  "*.pdf",
  "*.zip",
  "*.tar.gz"
]
```

These defaults are not stored per-project by default — they are applied in `AiReviewContextBuilderService` if `ignore_patterns` is an empty array. If a project sets a non-empty `ignore_patterns`, the defaults are **replaced**, not merged.

### GitLab Connection

| Field | Description |
|---|---|
| `gitlab_base_url` | GitLab instance base URL. Default: `https://gitlab.com` |
| `gitlab_project_id` | Numeric GitLab project ID (from project settings) |
| `gitlab_project_path` | Human-readable path (e.g. `mygroup/myrepo`). Used for display only. |
| `webhook_secret` | Secret token registered in GitLab webhook settings |
| `access_token` | GitLab access token with `api` scope |

---

## Review Limits Rationale

### `max_changed_files = 30`

Large MRs (50+ files) are typically infrastructure changes, large refactors, or generated code. These are both expensive to review and produce low-signal findings. Capping at 30 keeps prompt size predictable and forces teams to split large MRs.

### `max_patch_chars = 120,000`

At ~4 chars/token, 120k chars ≈ 30k tokens of diff content. Combined with system prompt + output, this fits within most large-context models' effective windows while leaving room for a complete JSON response.

---

## Model Settings

Model is configured per-environment via `AI_REVIEW_LLM_MODEL`. The value is passed directly to 9router. Changing the model affects all projects immediately.

To use different models per project, add a `model_override` field to `AiReviewProject` in V2.

Recommended models via 9router:

| Model | Use Case |
|---|---|
| `claude-sonnet-4-6` | Default. Good balance of cost, speed, and accuracy |
| `claude-opus-4-8` | Higher accuracy for complex codebases. 3–5x cost |
| `claude-haiku-4-5-20251001` | Fast + cheap for small MRs or high-volume repos |

---

## BullMQ Queue Configuration

Queue name: `ai-review` (constant in `ai-review.queue.ts`).

```typescript
// ai-review.queue.ts
export const AI_REVIEW_QUEUE = 'ai-review';

// Job options applied on enqueue
const jobOptions: JobsOptions = {
  attempts: 1,         // no retry in V1
  removeOnComplete: {
    age: parseInt(process.env.AI_REVIEW_JOB_TTL_COMPLETED_S ?? '86400'),
  },
  removeOnFail: {
    age: parseInt(process.env.AI_REVIEW_JOB_TTL_FAILED_S ?? '604800'),
  },
  timeout: parseInt(process.env.AI_REVIEW_JOB_TIMEOUT_MS ?? '180000'),
};
```

---

## NestJS Module Registration

In `ai-review.module.ts`:

```typescript
BullModule.registerQueue({
  name: AI_REVIEW_QUEUE,
}),
```

In `app.module.ts` (or root):

```typescript
BullModule.forRootAsync({
  useFactory: (configService: ConfigService) => ({
    connection: {
      host: configService.get('REDIS_HOST'),
      port: configService.get<number>('REDIS_PORT'),
    },
  }),
  inject: [ConfigService],
}),
```
