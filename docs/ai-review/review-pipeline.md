# AI Reviewer V1 — Review Pipeline

## End-to-End Flow

```
AiReviewProcessor.process(job)
  │
  ├─ 1. Load AiReviewJob + AiReviewProject from DB
  ├─ 2. Mark job status → PROCESSING, set startedAt
  │
  ├─ 3. GitlabApiService.getMergeRequest()
  ├─ 4. GitlabApiService.getMergeRequestChanges()
  │
  ├─ 5. AiReviewContextBuilderService.build()
  │       ├─ filter ignored files
  │       ├─ filter binary / image files
  │       ├─ cap at maxChangedFiles
  │       ├─ truncate patch text to maxPatchChars
  │       └─ returns ReviewContext
  │
  ├─ 6. AiReviewLlmService.review(context)
  │       └─ NineRouterAdapter.complete(prompt)
  │           └─ returns raw LLM JSON string
  │
  ├─ 7. AiReviewResultNormalizerService.normalize(rawJson)
  │       └─ returns NormalizedReviewResult { summary, riskLevel, findings[], suggestedTests[] }
  │
  ├─ 8. AiReviewFindingRepository.createMany(findings)
  │
  ├─ 9. AiReviewSummaryBuilderService.build(normalizedResult)
  │       └─ returns Markdown string
  │
  ├─ 10. GitlabApiService.postMergeRequestNote(summaryMarkdown)
  │
  └─ 11. Mark job status → SUCCESS, set finishedAt, store summaryMarkdown
```

On any unhandled throw in steps 3–10:
- Mark job status → `FAILED`
- Store error message
- Re-throw (BullMQ records the failure)

---

## Step 5: Context Building

`AiReviewContextBuilderService` transforms the raw GitLab diff into a filtered, size-bounded review context.

### Filter: Ignored Files

Files whose `new_path` matches any glob in `project.ignorePatterns` are excluded.

Default patterns:
```
dist/**
build/**
coverage/**
node_modules/**
*.lock
pnpm-lock.yaml
yarn.lock
package-lock.json
**/__snapshots__/**
*.snap
*.png *.jpg *.jpeg *.gif *.svg *.ico *.woff *.woff2 *.ttf *.eot
```

### Filter: Binary Files

Files with empty `diff` string are skipped (GitLab omits diffs for binary files).

### Cap: maxChangedFiles

After filtering, if the remaining file count exceeds `project.maxChangedFiles` (default 30), only the first N files are included. Files are ordered by GitLab's natural response order (alphabetical by path). A note is appended to the context: `"N files were omitted due to maxChangedFiles limit."`.

### Cap: maxPatchChars

All included diffs are concatenated. If the total character count exceeds `project.maxPatchChars` (default 120,000), the concatenated patch is truncated at that boundary with a truncation marker appended: `"\n[DIFF TRUNCATED at maxPatchChars limit]"`.

### ReviewContext Shape

```typescript
interface ReviewContext {
  mrTitle: string;
  sourceBranch: string;
  targetBranch: string;
  changedFilesCount: number;        // after filtering
  totalPatchChars: number;          // before truncation
  truncated: boolean;
  files: ReviewContextFile[];
}

interface ReviewContextFile {
  path: string;
  isNewFile: boolean;
  isDeletedFile: boolean;
  isRenamedFile: boolean;
  oldPath?: string;
  diff: string;                     // patch text, possibly truncated
}
```

---

## Step 6: LLM Call

`AiReviewLlmService` composes the prompt via `PromptBuilderService` then calls `NineRouterAdapter`.

The system prompt and user prompt are rendered from templates in `llm/prompts/`. See [prompting-strategy.md](./prompting-strategy.md) for full prompt design.

`NineRouterAdapter` sends an HTTP POST to the 9router endpoint:

```
POST {NINE_ROUTER_BASE_URL}/v1/chat/completions
Authorization: Bearer {NINE_ROUTER_API_KEY}
```

The adapter sets `response_format: { type: "json_object" }` if the model supports it.

Timeout: 3 minutes. Retries: 0 in V1 (LLM errors surface as `FAILED` job).

---

## Step 7: Normalization

`AiReviewResultNormalizerService` parses the raw LLM JSON string.

Steps:
1. `JSON.parse()` the raw string — throws on malformed JSON.
2. Validate top-level keys: `summary`, `riskLevel`, `findings[]`.
3. For each finding, validate required fields: `severity`, `category`, `title`, `description`.
4. Clamp `confidence` to `[0, 1]` if present.
5. Map LLM string enums to internal `AiReviewSeverity` / `AiReviewFindingCategory` enums.
6. Findings that fail validation are dropped with a warning log — never throw.

If `JSON.parse` fails entirely, the service throws and the job is marked `FAILED`.

---

## Step 8: Findings Persistence

`AiReviewFindingRepository.createMany()` bulk-inserts all normalized findings in one Prisma `createMany` call. The job's `rawResponseJson` is also stored at this point.

---

## Step 9: Summary Markdown

`AiReviewSummaryBuilderService` renders a Markdown document from the normalized result.

Structure:

```markdown
## AI Review Summary

**Risk Level**: HIGH | MEDIUM | LOW

{summary paragraph}

---

### Findings ({count} total)

#### 🔴 HIGH — Security

**[Security] Missing @RequirePermission decorator** (`src/modules/foo/foo.controller.ts`)
> Line 42

Missing permission guard on this endpoint allows any authenticated user to access it,
regardless of role.

**Suggestion**: Add `@RequirePermission('foo.create')` before the route handler.

Confidence: 0.95

---

### Suggested Tests

- Verify that unauthenticated requests return 401
- Verify that a user without 'foo.create' permission receives 403

---
*Reviewed by AI Reviewer V1 · {timestamp}*
```

Severity emoji: `🔴` HIGH, `🟡` MEDIUM, `🔵` LOW.

---

## Step 10: Post Note

`GitlabApiService.postMergeRequestNote()` POSTs the Markdown to the GitLab MR notes API.

On success, the note appears as a comment on the MR authored by the account whose access token is configured.

On failure (403, 404, network), the job is still marked `FAILED`, but `summaryMarkdown` is already stored in the job record. An admin can manually re-post by calling the GitLab API directly with the stored `summaryMarkdown`.
