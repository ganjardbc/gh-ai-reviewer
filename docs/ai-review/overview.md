# AI Reviewer V1 — Overview

## Purpose

AI Reviewer V1 automates code review for GitLab Merge Requests. When a developer opens or updates an MR, the system receives a webhook, fetches the diff, sends it through an LLM pipeline (via 9router), and posts a structured review summary as a note on the MR.

The goal is to catch real issues early — permission gaps, tenant-scope leaks, business logic misplacement, validation holes — before human reviewers spend time on them.

---

## Why This Feature Exists

Manual MR reviews on a multi-tenant backend are slow and miss consistent patterns:

- RBAC / merchant-scope enforcement is easy to forget across new endpoints.
- Business logic leaks into controllers routinely.
- Validation and transaction safety are inconsistently applied.

A deterministic LLM-assisted reviewer running on every MR surfaces these issues immediately, at consistent quality, without reviewer fatigue.

---

## V1 Scope

| Included | Excluded |
|---|---|
| GitLab Merge Request webhook receiver | GitHub support |
| Project binding + per-project config | Inline line-by-line MR comments |
| Async review job processing (queue/worker) | Auto-fix / patch suggestion |
| Diff-based review (patch text) | Multi-agent orchestration |
| LLM review via 9router | Dashboard-heavy UI |
| Findings persistence (`AiReviewFinding`) | Human feedback loop |
| Summary note published to GitLab MR | Full file content retrieval as mandatory default |

---

## Non-Goals for V1

- No GitHub, Bitbucket, or other SCM support.
- No inline comment posting (only a single MR-level note).
- No AI-suggested patches or auto-merge.
- No user-facing review dashboard beyond raw job/finding records.
- No feedback mechanism to retrain or tune the LLM.

---

## Success Criteria

A V1 release is successful when:

1. A GitLab MR webhook arrives → a review job is created and enqueued within 200ms.
2. The worker processes the job end-to-end → findings are persisted → a summary note appears on the MR.
3. The summary note is consistently structured: risk level, finding list, suggested tests.
4. Known patterns (missing `@RequirePermission`, missing merchant scoping, controller-level business logic) are flagged reliably across test MRs.
5. Jobs that fail (GitLab API down, LLM error) are marked `FAILED` with a stored error message and do not silently disappear.
6. The system handles 20 concurrent MR review jobs without data corruption.
