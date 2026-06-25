# AI Reviewer V1 — GitLab Integration

## Webhook Flow

### Endpoint

```
POST /webhooks/gitlab/merge-request
```

This is a public endpoint (no JWT auth). Security is handled via the secret token header.

### GitLab Setup

In GitLab project settings → Webhooks:
- URL: `https://your-api-host/webhooks/gitlab/merge-request`
- Secret Token: the value stored in `AiReviewProject.webhookSecret`
- Trigger: **Merge request events** only

### Supported MR Events

The system processes:

| `object_attributes.action` | Behaviour |
|---|---|
| `open` | Triggers review |
| `update` | Triggers review (new commits pushed) |
| `reopen` | Triggers review |
| `close` | Ignored |
| `merge` | Ignored |
| `approved` / `unapproved` | Ignored |

Only events with `action` in `[open, update, reopen]` enqueue a review job. All others return `200 OK` with `{ skipped: true }` — GitLab expects 200 to consider a webhook delivery successful.

---

## Token Verification

GitLab sends the configured secret in the `X-Gitlab-Token` header.

`GitlabWebhookVerifierService`:

```typescript
verify(incomingToken: string, storedSecret: string): void {
  if (!incomingToken || incomingToken !== storedSecret) {
    throw new UnauthorizedException('Invalid webhook token');
  }
}
```

The verification happens **before** project lookup to avoid unnecessary DB queries on spoofed requests.

Because the token is per-project, the lookup order is:

1. Extract `gitlabProjectId` from the raw payload body (before full mapping).
2. Load `AiReviewProject` by `gitlabProjectId`.
3. Verify `X-Gitlab-Token` against `project.webhookSecret`.

---

## GitLab API Endpoints Used

All calls use the project's stored `accessToken` as `PRIVATE-TOKEN` header.

### Fetch MR Detail

```
GET /api/v4/projects/:projectId/merge_requests/:mrIid
```

Used to retrieve: `title`, `source_branch`, `target_branch`, `sha`, `diff_refs`, `web_url`, `iid`, `id`.

### Fetch MR Changes (Diff)

```
GET /api/v4/projects/:projectId/merge_requests/:mrIid/changes
```

Returns `changes[]` — array of file diffs. Each entry:

```json
{
  "old_path": "src/foo.ts",
  "new_path": "src/foo.ts",
  "diff": "@@ -1,5 +1,7 @@\n ...",
  "new_file": false,
  "deleted_file": false,
  "renamed_file": false
}
```

### Post MR Note (Summary)

```
POST /api/v4/projects/:projectId/merge_requests/:mrIid/notes
Content-Type: application/json

{ "body": "<markdown summary>" }
```

The summary note is posted once per review job after all findings are persisted.

---

## GitlabApiService

```typescript
class GitlabApiService {
  async getMergeRequest(
    baseUrl: string,
    token: string,
    projectId: string,
    mrIid: number,
  ): Promise<GitlabMrDetail>

  async getMergeRequestChanges(
    baseUrl: string,
    token: string,
    projectId: string,
    mrIid: number,
  ): Promise<GitlabMrChange[]>

  async postMergeRequestNote(
    baseUrl: string,
    token: string,
    projectId: string,
    mrIid: number,
    body: string,
  ): Promise<void>
}
```

All methods throw on non-2xx response. The processor catches and marks the job `FAILED`.

---

## Payload Mapping

`gitlab-mapper.ts` converts the raw GitLab webhook body into an internal `GitlabMrEvent`:

```typescript
interface GitlabMrEvent {
  eventType: string;           // always "merge_request"
  action: string;              // open | update | reopen | ...
  gitlabProjectId: string;
  mrIid: number;
  mrId: number;
  mrTitle: string;
  mrUrl: string;
  sourceBranch: string;
  targetBranch: string;
  sha: string;
  baseSha: string;
}
```

The mapper is a pure function — no side effects, no DB calls. Easy to unit test with fixture payloads.

---

## Authentication / Token Handling

- `accessToken` is stored in the `AiReviewProject` record.
- In production, this column should be encrypted at rest (application-level encryption or database encryption).
- The token is never returned in API responses — it is write-only from the client perspective.
- Token rotation: update via `PATCH /ai-review/projects/:id` with a new `accessToken`. Old token is overwritten.

---

## Failure Modes

| Failure | Behaviour |
|---|---|
| Invalid `X-Gitlab-Token` | 401 response; job not created |
| Unknown `gitlabProjectId` | 404 response; job not created |
| `autoReviewEnabled = false` | 200 response; job created with `QUEUED` but not enqueued |
| GitLab API 401 on diff fetch | Job marked `FAILED`, `errorMessage` set |
| GitLab API 404 on MR | Job marked `FAILED` (MR may have been deleted) |
| GitLab API 403 on note post | Job marked `FAILED`; findings are already persisted |
| GitLab API timeout | Job marked `FAILED` after worker timeout |
| Malformed webhook body | 400 response; job not created |

When a note POST fails, findings are already saved in the database. The job can be inspected and the summary re-posted manually via a future admin endpoint.
