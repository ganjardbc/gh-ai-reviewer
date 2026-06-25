# AI Reviewer V1 — Domain Model

## Core Concepts

### AiReviewProject (Review Project)

A **Review Project** is the binding between one GitLab repository and the AI Reviewer system. It holds:

- The GitLab connection details (base URL, project ID/path, access token, webhook secret).
- Review behaviour config (auto-review toggle, review mode, file/patch limits, ignore patterns).
- Merchant scope (optional `merchantId` for multi-tenant isolation).

A project must exist before any webhooks from that GitLab repo are accepted. One GitLab project maps to exactly one `AiReviewProject`. Creating a second binding for the same `gitlabProjectId` should be rejected.

### AiReviewJob (Review Job)

A **Review Job** represents one execution of the review pipeline triggered by one MR event. A new job is created for every qualifying webhook (open, update, reopen). Jobs are the unit of work — they carry the snapshot of what was reviewed and the result.

Jobs are the primary audit trail. Even on failure, the job record is preserved with `errorMessage`.

### AiReviewFinding (Finding)

A **Finding** is one discrete issue identified by the LLM reviewer on one review job. Findings are attached to a job (not a project or MR directly). Each finding has a file path, optional line number, severity, category, title, description, suggestion, and a confidence score.

Findings are write-once — they are never updated after creation. If a job is retried, the old job's findings remain and a new job's findings are created separately.

---

## Job Lifecycle

```
[Webhook received]
       │
       ▼
    QUEUED ──── job created, enqueued in BullMQ
       │
       ▼
  PROCESSING ── worker picks up job, marks this status
       │
       ├──── Success path ────────────────────────────────────► SUCCESS
       │         findings saved, summary note posted, job updated
       │
       └──── Failure path ───────────────────────────────────► FAILED
                 errorMessage stored, job updated
```

### Status Transitions

| From | To | Trigger |
|---|---|---|
| — | `QUEUED` | Webhook accepted + job created |
| `QUEUED` | `PROCESSING` | Worker picks up job |
| `PROCESSING` | `SUCCESS` | Pipeline completes, note posted |
| `PROCESSING` | `FAILED` | Any unhandled error in pipeline |

There is no retry state in V1. Failed jobs stay `FAILED`. Manual retry can be implemented in V2 by re-enqueuing the job ID.

---

## Review Project Concept

A Review Project is created by an admin or merchant owner who wants their GitLab repo reviewed. The workflow:

1. Admin creates an `AiReviewProject` record via the management API, supplying:
   - GitLab project ID and path
   - A GitLab API access token with `api` scope
   - A webhook secret (used to verify incoming events)
   - Review configuration
2. Admin registers the webhook in GitLab pointing at `POST /webhooks/gitlab/merge-request` with the same secret.
3. On the next qualifying MR event, the system matches incoming `gitlabProjectId` to the stored record and begins processing.

If `autoReviewEnabled = false`, the webhook is accepted (job created) but not enqueued — useful for testing the webhook binding without triggering reviews.

---

## Review Modes

| Mode | Behaviour |
|---|---|
| `DIFF_ONLY` | Only the unified diff (patch text) is sent to the LLM. Default and recommended for V1. |
| `FULL_FILE` | Reserved for future use. Would fetch full file content for changed files. Excluded from V1. |

---

## Findings Concept

Findings are the LLM's structured output after reviewing the diff. Each finding maps to a specific file (and optionally a line) and is classified along two axes:

**Severity**:
- `HIGH` — should block merge (security, data loss, scope leak)
- `MEDIUM` — should be addressed (logic error, risky pattern)
- `LOW` — suggestion level (minor maintainability, style with semantic impact)

**Category**:
- `SECURITY` — auth, permission, injection, token exposure
- `BUG` — logic error, null-dereference, off-by-one
- `ARCHITECTURE` — wrong layer (controller doing service work), coupling
- `VALIDATION` — missing input validation, unguarded fields
- `PERFORMANCE` — N+1, missing index usage, inefficient query
- `MAINTAINABILITY` — complexity, dead code with actual consequence
- `TESTING` — missing coverage for a critical branch

---

## Key Relationships

```
Merchant (optional)
  └── AiReviewProject  (1 per GitLab repo)
        └── AiReviewJob  (1 per MR event)
              └── AiReviewFinding  (N per job, from LLM output)
```

- A `Merchant` can own zero or more `AiReviewProject` records.
- An `AiReviewProject` can have many `AiReviewJob` records (one per MR event over time).
- Each `AiReviewJob` has zero or more `AiReviewFinding` records.
- `AiReviewFinding` records belong to exactly one job and are never moved.
