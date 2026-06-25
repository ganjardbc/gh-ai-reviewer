# Task: Generate complete documentation set for AI REVIEWER V1 in `gh-ai-reviewer`

You are working inside the monorepo project **`gh-ai-reviewer`**.

Your task is to **generate a complete documentation set in Markdown** for a new backend feature/module called **AI REVIEWER V1**.

The output must be **real `.md` document content**, not just outlines.
Write each document with enough detail that it can be used by me as the implementation guide for development.

---

# Project context

## Monorepo structure

```txt
gh-ai-reviewer/
├── apps/web/          # Vue 3 + Vite + PrimeVue frontend
├── apps/api/          # NestJS + Prisma + MySQL backend
├── apps/landing/      # Marketing landing page
├── packages/
│   ├── shared-types/
│   ├── shared-utils/
│   └── eslint-config/
├── infra/
└── docs/
```

## Backend stack

* **NestJS**
* **Prisma**
* **MySQL**

## Existing backend concepts

This skeleton project already has foundational modules such as:

* RBAC / permission system
* users
* merchants / tenant-like scoping
* settings
* notifications

---

# Goal of the feature

We want to build **AI REVIEWER V1** focused on **GitLab Merge Request review automation**.

This is **not** an MCP server.
This is a **backend module inside `apps/api`**.

The module should:

1. receive **GitLab Merge Request webhook events**
2. create a **review job**
3. process the job asynchronously using a **queue/worker**
4. fetch **MR detail + changed files/diff** from GitLab
5. build review context
6. call an LLM through **9router**
7. normalize the LLM result
8. save findings
9. publish a **single summary note** back to the GitLab MR

---

# V1 scope

## Included in V1

* GitLab-first only
* Merge Request webhook receiver
* project binding/config for GitLab repos
* async review job processing
* diff-based review
* LLM review via 9router
* findings persistence
* summary note publishing to GitLab MR

## Excluded from V1

* GitHub support
* inline line-by-line MR comments
* auto-fix / patch suggestion
* multi-agent orchestration
* dashboard-heavy UI
* human feedback loop
* full file content retrieval as mandatory default

---

# Proposed backend module location

All implementation is inside:

```txt
apps/api/src/modules/ai-review
```

Proposed module structure:

```txt
apps/api/
└── src/
    ├── modules/
    │   ├── ai-review/
    │   │   ├── ai-review.module.ts
    │   │   ├── controllers/
    │   │   │   ├── ai-review-project.controller.ts
    │   │   │   ├── ai-review-job.controller.ts
    │   │   │   └── gitlab-webhook.controller.ts
    │   │   ├── dto/
    │   │   │   ├── create-ai-review-project.dto.ts
    │   │   │   ├── update-ai-review-project.dto.ts
    │   │   │   └── enqueue-mr-review.dto.ts
    │   │   ├── services/
    │   │   │   ├── ai-review-project.service.ts
    │   │   │   ├── ai-review-job.service.ts
    │   │   │   ├── ai-review-runner.service.ts
    │   │   │   ├── ai-review-context-builder.service.ts
    │   │   │   ├── ai-review-result-normalizer.service.ts
    │   │   │   ├── ai-review-summary-builder.service.ts
    │   │   │   └── gitlab-webhook.service.ts
    │   │   ├── repositories/
    │   │   │   ├── ai-review-project.repository.ts
    │   │   │   ├── ai-review-job.repository.ts
    │   │   │   └── ai-review-finding.repository.ts
    │   │   ├── queue/
    │   │   │   ├── ai-review.queue.ts
    │   │   │   └── ai-review.processor.ts
    │   │   ├── gitlab/
    │   │   │   ├── gitlab-api.service.ts
    │   │   │   ├── gitlab-webhook-verifier.service.ts
    │   │   │   └── gitlab-mapper.ts
    │   │   ├── llm/
    │   │   │   ├── ai-review-llm.service.ts
    │   │   │   ├── nine-router.adapter.ts
    │   │   │   ├── prompt-builder.service.ts
    │   │   │   └── prompts/
    │   │   │       ├── reviewer-system.prompt.ts
    │   │   │       └── reviewer-user.prompt.ts
    │   │   ├── constants/
    │   │   ├── enums/
    │   │   ├── interfaces/
    │   │   └── utils/
```

---

# Data model / Prisma schema direction

The module will use 3 core Prisma models:

## `AiReviewProject`

Stores GitLab project binding and review config.

Suggested fields:

* `id`
* `merchantId?`
* `name`
* `provider`
* `gitlabBaseUrl`
* `gitlabProjectId`
* `gitlabProjectPath`
* `webhookSecret`
* `accessToken`
* `defaultBranch?`
* `isActive`
* `autoReviewEnabled`
* `reviewMode`
* `maxChangedFiles`
* `maxPatchChars`
* `ignorePatterns`
* `createdBy?`
* `createdAt`
* `updatedAt`

## `AiReviewJob`

Stores one review execution for one MR event.

Suggested fields:

* `id`
* `aiReviewProjectId`
* `provider`
* `eventType`
* `status`
* `gitlabProjectId`
* `mrIid`
* `mrId?`
* `mrTitle`
* `mrUrl?`
* `sourceBranch?`
* `targetBranch?`
* `sha?`
* `baseSha?`
* `changedFilesCount`
* `modelName?`
* `reviewModeSnapshot?`
* `summaryMarkdown?`
* `rawResponseJson?`
* `errorMessage?`
* `startedAt?`
* `finishedAt?`
* `createdAt`
* `updatedAt`

## `AiReviewFinding`

Stores review findings.

Suggested fields:

* `id`
* `aiReviewJobId`
* `filePath?`
* `line?`
* `severity`
* `category`
* `title`
* `description`
* `suggestion?`
* `confidence?`
* `fingerprint?`
* `createdAt`
* `updatedAt`

Suggested enums:

* `AiReviewProvider`
* `AiReviewReviewMode`
* `AiReviewJobStatus`
* `AiReviewSeverity`
* `AiReviewFindingCategory`

---

# Review pipeline design

## Webhook flow

GitLab sends MR webhook to:

```txt
POST /webhooks/gitlab/merge-request
```

The system should:

1. verify event/token
2. map GitLab payload
3. find matching `AiReviewProject`
4. create `AiReviewJob` with status `QUEUED`
5. enqueue background job

## Worker flow

The worker should:

1. load job + project
2. mark job as `PROCESSING`
3. fetch MR detail + changes from GitLab
4. filter ignored files
5. build review context
6. call LLM via 9router
7. normalize result
8. persist findings
9. build summary markdown
10. publish MR summary note
11. mark job `SUCCESS`

On failure:

* mark job `FAILED`
* store `errorMessage`

---

# GitLab integration assumptions

Use GitLab API for:

* `GET /projects/:id/merge_requests/:iid`
* `GET /projects/:id/merge_requests/:iid/changes`
* `POST /projects/:id/merge_requests/:iid/notes`

Webhook token is verified using GitLab secret token header.

---

# LLM / 9router direction

Use an internal adapter such as:

* `NineRouterAdapter`
* `AiReviewLlmService`

The reviewer should produce **strict JSON output** like:

```json
{
  "summary": "string",
  "riskLevel": "low | medium | high",
  "findings": [
    {
      "severity": "high | medium | low",
      "category": "security | bug | architecture | validation | performance | maintainability | testing",
      "filePath": "src/modules/...",
      "line": 12,
      "title": "Short title",
      "description": "What is wrong and why it matters",
      "suggestion": "Concrete recommendation",
      "confidence": 0.92
    }
  ],
  "suggestedTests": [
    "..."
  ]
}
```

---

# Reviewer priorities

The AI reviewer should prioritize findings around:

* missing permission / RBAC checks
* merchant / tenant scope leakage
* validation problems
* business logic in controller instead of service
* risky settings mutation flow
* notification side effects before safe completion
* data integrity / transaction risk
* maintainability issues that are actually meaningful

The reviewer should **avoid noisy style comments**.

---

# Default review constraints

Suggested defaults:

* `maxChangedFiles = 30`
* `maxPatchChars = 120000`

Suggested ignore patterns:

* `dist/**`
* `build/**`
* `coverage/**`
* `node_modules/**`
* lockfiles
* snapshots
* binary/image files

---

# Documentation task

Create a documentation set under:

```txt
docs/ai-review/
```

Generate the full content for these files:

1. `docs/ai-review/overview.md`
2. `docs/ai-review/architecture.md`
3. `docs/ai-review/domain-model.md`
4. `docs/ai-review/data-model.md`
5. `docs/ai-review/gitlab-integration.md`
6. `docs/ai-review/review-pipeline.md`
7. `docs/ai-review/prompting-strategy.md`
8. `docs/ai-review/configuration.md`
9. `docs/ai-review/testing-strategy.md`
10. `docs/ai-review/implementation-plan-v1.md`
11. `docs/ai-review/roadmap.md`
12. `docs/ai-review/runbook.md`

---

# Requirements for the generated documents

## General writing rules

* Write in **clear technical English**
* Be concrete, implementation-oriented, and practical
* Do not write fluff
* Use headings, tables, bullet lists, and examples where useful
* Assume the docs are for **the engineering team implementing this module**
* Keep consistency across all files
* Make the docs feel like they belong to the same project

## Very important

Do **not** only provide outlines.
Write the **actual content** of each Markdown file.

Each document should be sufficiently detailed to be useful immediately.

---

# Expected output format

Return the answer as a sequence of Markdown documents.

For each document:

1. print the file path as a heading, for example:

```md
# docs/ai-review/overview.md
```

2. then write the full Markdown content for that file.

Repeat this for all requested files.

---

# Additional expectations per file

## `overview.md`

Should cover:

* purpose
* why this feature exists
* V1 scope
* non-goals
* success criteria

## `architecture.md`

Should cover:

* system components
* high-level request flow
* responsibilities of each service/module
* deployment/runtime considerations

## `domain-model.md`

Should cover:

* business/domain concepts
* job lifecycle
* review project concept
* findings concept
* key relationships

## `data-model.md`

Should cover:

* Prisma models
* enums
* example schema snippets
* rationale for each field
* indexing considerations

## `gitlab-integration.md`

Should cover:

* webhook flow
* supported MR events
* GitLab API endpoints used
* auth/token handling
* failure modes

## `review-pipeline.md`

Should cover:

* end-to-end review execution flow
* context building
* filtering/truncation rules
* normalization and persistence
* publishing summary note

## `prompting-strategy.md`

Should cover:

* system prompt responsibilities
* user prompt structure
* JSON schema contract
* anti-noise rules
* reviewer priorities tied to this project

## `configuration.md`

Should cover:

* env vars
* project-level config
* review limits
* ignore patterns
* model settings

## `testing-strategy.md`

Should cover:

* unit test targets
* integration test targets
* mocked GitLab/LLM scenarios
* acceptance criteria for V1

## `implementation-plan-v1.md`

Should cover:

* exact implementation phases
* recommended commit order
* what to implement in each phase
* MVP milestones

## `roadmap.md`

Should cover:

* V1
* V1.1
* V2
* possible future GitHub support, inline comments, repo-aware rules, feedback loop, autofix

## `runbook.md`

Should cover:

* how to set up a GitLab project binding
* how to configure webhook
* how to verify the worker is running
* how to troubleshoot common failures
* operational checks after deployment

---

Now generate all of the documentation content.
