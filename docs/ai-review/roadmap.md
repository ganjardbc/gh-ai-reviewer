# AI Reviewer V1 — Roadmap

## V1 (Current)

**Theme**: GitLab MR review automation, diff-based, single summary note.

### Scope

- GitLab Merge Request webhook ingestion
- Async review job queue (BullMQ + Redis)
- Diff-based context building (DIFF_ONLY mode)
- LLM review via 9router
- Structured findings persistence
- Single Markdown summary note posted to GitLab MR
- Per-project configuration (limits, ignore patterns, auto-review toggle)
- Management API for project bindings and job listing

### Exit Criteria

All items in `implementation-plan-v1.md` Phase 0–7 complete and all acceptance criteria in `testing-strategy.md` pass.

---

## V1.1

**Theme**: Observability, reliability, and usability improvements on top of V1.

### Features

- **Retry support**: Allow failed jobs to be re-enqueued via `POST /ai-review/jobs/:id/retry`.
- **Job webhook callback**: Notify an external URL when a review job completes (configurable per project).
- **Dashboard API**: Aggregated stats endpoint — job counts by status, average processing time, finding severity breakdown per project.
- **Per-project model override**: Add `modelOverride` to `AiReviewProject` so different repos can use different LLM models.
- **Webhook delivery log**: Store raw webhook payloads for debugging ingestion issues.
- **Access token encryption**: Application-level encryption for `accessToken` at rest (using AES-256-GCM with a `ENCRYPTION_KEY` env var).
- **Ignore pattern management UI**: Basic frontend form for managing `ignorePatterns` per project.

---

## V2

**Theme**: Richer review output and multi-platform support.

### Features

- **Inline MR comments**: Post findings as inline comments on specific lines instead of (or in addition to) a single summary note. Uses GitLab `POST /projects/:id/merge_requests/:iid/discussions` with position data.
- **Full file retrieval mode**: Activate `FULL_FILE` review mode — fetch complete file content for changed files via `GET /projects/:id/repository/files/:file_path/raw`. Context builder selects mode based on `reviewMode` setting.
- **GitHub support**: Add `GitHubApiService`, `github-mapper.ts`, and GitHub-specific webhook verification (`X-Hub-Signature-256`). Shared pipeline core reused unchanged.
- **Human feedback loop**: Allow engineers to mark findings as "false positive" or "valid". Store feedback on `AiReviewFinding`. Feed aggregate false-positive rates back into prompt tuning.
- **Finding deduplication**: Use `fingerprint` field to detect when the same issue is flagged across multiple MRs on the same file. Surface trend data in the dashboard.

---

## V2.5

**Theme**: Contextual intelligence — reviewer knows the repository beyond the diff.

### Features

- **Repo-aware rules**: Allow teams to configure custom review rules in a `.ai-reviewer.yml` at repo root. The pipeline fetches and injects repo-specific rules into the system prompt.
- **Historical context**: Optionally inject recent findings from the same file paths into the prompt ("this file had 3 HIGH findings in the last 30 days").
- **Dependency-aware review**: When a `package.json` or `pnpm-lock.yaml` changes, trigger a separate dependency audit pipeline (check for known vulnerabilities via npm audit / Snyk API).

---

## V3

**Theme**: Autonomous fix suggestions and agent orchestration.

### Features

- **Auto-fix / patch suggestion**: For HIGH-confidence findings, the LLM generates a code patch. Patch is stored as `suggestion_patch` on the finding. Presented as a diff in the MR note. One-click apply via a new API endpoint.
- **Multi-agent orchestration**: Replace single-shot LLM call with a coordinator agent that dispatches specialist sub-agents (security agent, architecture agent, performance agent) and merges their findings.
- **PR labelling**: Automatically apply GitLab labels (e.g. `ai-review: high-risk`) to MRs based on `riskLevel`.
- **Slack / Teams notifications**: When a HIGH risk-level MR is detected, send a notification to a configured webhook channel.

---

## Future Considerations

| Idea | Notes |
|---|---|
| Bitbucket support | Would require `BitbucketApiService` + mapper. Pipeline core unchanged. |
| Azure DevOps support | Similar to Bitbucket — provider-specific adapter only. |
| Self-hosted LLM support | Replace 9router adapter with a local Ollama or vLLM adapter. |
| Review on schedule | Re-review the main branch weekly, not just on MR events. |
| SARIF export | Export findings as SARIF format for GitLab Security Dashboard integration. |
| Custom prompt library | Allow merchants/teams to contribute and A/B test prompt variants. |
