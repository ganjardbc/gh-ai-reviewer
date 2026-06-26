# AI Reviewer V1 — Runbook

## Prerequisites

- `apps/api` deployed with env vars set (see `configuration.md`)
- Redis reachable at `REDIS_HOST:REDIS_PORT`
- MySQL database migrated (Prisma migrations applied)
- A GitLab project with `Maintainer` or `Owner` role access
- A GitLab personal access token or project access token with `api` scope

---

## 1. Set Up a GitLab Project Binding

### 1.1 Generate a webhook secret

```bash
openssl rand -hex 32
# Example output: a3f9c2e1d4b7...
```

Save this value — you will need it in GitLab and in the API call.

### 1.2 Create the AiReviewProject record

```bash
curl -X POST https://your-api-host/ai-review/projects \
  -H "Authorization: Bearer <your-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Repo — AI Review",
    "gitlab_base_url": "https://gitlab.com",
    "gitlab_project_id": "12345678",
    "gitlab_project_path": "mygroup/myrepo",
    "webhook_secret": "<generated-secret>",
    "access_token": "<gitlab-access-token>",
    "auto_review_enabled": true,
    "max_changed_files": 30,
    "max_patch_chars": 120000
  }'
```

Response includes `{ id: "clxxx..." }`. Save the project ID.

### 1.3 Verify the record was created

```bash
curl https://your-api-host/ai-review/projects/<project-id> \
  -H "Authorization: Bearer <your-jwt>"
```

Confirm `is_active: true`, `auto_review_enabled: true`. Note that `access_token` and `webhook_secret` are not returned — this is by design.

---

## 2. Configure the GitLab Webhook

In the GitLab project:

1. Go to **Settings → Webhooks**.
2. Click **Add new webhook**.
3. Set URL: `https://your-api-host/webhooks/gitlab/merge-request`
4. Set **Secret Token**: paste the value from step 1.1.
5. Under **Trigger**, check only **Merge request events**.
6. Uncheck **SSL verification** only if your API host uses a self-signed cert (not recommended for production).
7. Click **Add webhook**.

### 2.1 Test the webhook from GitLab

Click **Test → Merge request events**. The GitLab UI shows the HTTP response.

Expected: `200 OK` with body `{ "skipped": true }` (test events use action `"open"` but the project may have no real MR — the job will still be created).

Check the API logs for:
```
[GitlabWebhookController] Webhook received for projectId=12345678
[GitlabWebhookService] Job created: clxxx... status=QUEUED
```

---

## 3. Verify the Worker Is Running

### 3.1 Check API logs

On startup, you should see:
```
[AiReviewProcessor] Worker started, queue=ai-review concurrency=5
```

If you don't see this, the module is not loaded or the BullMQ processor is not initialising.

### 3.2 Check Redis queue depth

```bash
redis-cli -h $REDIS_HOST -p $REDIS_PORT LLEN bull:ai-review:wait
```

A non-zero value means jobs are queued but not being processed (worker not running).

### 3.3 Check job status via API

```bash
curl "https://your-api-host/ai-review/jobs?project_id=<project-id>&status=PROCESSING" \
  -H "Authorization: Bearer <your-jwt>"
```

Jobs stuck in `PROCESSING` for more than 3 minutes indicate a worker crash or timeout.

---

## 4. Trigger a Real Review

1. Open a new MR (or push a commit to an existing MR) in the linked GitLab project.
2. GitLab fires the webhook.
3. Check the job was created:

```bash
curl "https://your-api-host/ai-review/jobs?project_id=<project-id>&status=SUCCESS" \
  -H "Authorization: Bearer <your-jwt>"
```

4. Check the GitLab MR for a new comment from the configured access token's account.

---

## 5. Troubleshoot Common Failures

### Job stuck in QUEUED

**Cause**: Worker is not running or Redis connection is broken.

**Check**:
```bash
# Is Redis reachable?
redis-cli -h $REDIS_HOST -p $REDIS_PORT PING
# Should return: PONG

# Check API logs for BullMQ worker startup message
```

**Fix**: Restart the API. Verify `REDIS_HOST` and `REDIS_PORT` env vars are set correctly.

---

### Job stuck in PROCESSING

**Cause**: Worker picked up the job but crashed mid-pipeline (OOM, uncaught exception, or timeout).

**Check**:
```bash
# Get details of the specific job
curl "https://your-api-host/ai-review/jobs/<job-id>" \
  -H "Authorization: Bearer <your-jwt>"
# Look at started_at vs. now. If > 3 minutes, it's stuck.
```

**Fix**: Restart the API. The BullMQ job will be recovered from Redis on next startup (it is still in the `active` set). The job will be retried if `attempts > 1` — in V1, it will remain in `PROCESSING` state in the DB even after BullMQ retries. A cleanup script or manual update may be needed.

---

### Job FAILED — "Invalid or expired access token"

**Cause**: The GitLab `access_token` stored in `AiReviewProject` is expired or revoked.

**Fix**:
1. Generate a new GitLab access token with `api` scope.
2. Update the project:

```bash
curl -X PATCH https://your-api-host/ai-review/projects/<project-id> \
  -H "Authorization: Bearer <your-jwt>" \
  -H "Content-Type: application/json" \
  -d '{ "access_token": "<new-token>" }'
```

---

### Job FAILED — "9router: timeout after 180000ms"

**Cause**: LLM request timed out. Usually happens on very large diffs.

**Check**: Look at `changed_files_count` and the diff size in `raw_response_json` (null on timeout).

**Fix**: Lower `max_patch_chars` for this project:

```bash
curl -X PATCH https://your-api-host/ai-review/projects/<project-id> \
  -H "Authorization: Bearer <your-jwt>" \
  -H "Content-Type: application/json" \
  -d '{ "max_patch_chars": 60000 }'
```

---

### Job FAILED — "403 when posting note"

**Cause**: The access token doesn't have permission to post notes on the MR. This can happen if the token is scoped to `read_api` instead of `api`.

**Fix**: Regenerate the token with full `api` scope and update the project (see above).

---

### No webhook delivery received

**Check**:
1. GitLab project → Settings → Webhooks → Recent deliveries. Look for failed deliveries.
2. Verify the webhook URL is correct and publicly reachable.
3. Verify the webhook is configured for **Merge request events**.

---

## 6. Operational Checks After Deployment

Run these checks after deploying a new version of the API:

```bash
# 1. API is running
curl https://your-api-host/health

# 2. Redis is reachable (check API startup logs for BullMQ connection)
redis-cli -h $REDIS_HOST -p $REDIS_PORT PING

# 3. Database migrations applied
pnpm --filter gh-skeleton-api prisma migrate status

# 4. No jobs stuck in PROCESSING
curl "https://your-api-host/ai-review/jobs?status=PROCESSING" \
  -H "Authorization: Bearer <admin-jwt>"

# 5. Recent jobs show SUCCESS
curl "https://your-api-host/ai-review/jobs?status=SUCCESS" \
  -H "Authorization: Bearer <admin-jwt>"
```

If step 4 returns jobs older than 5 minutes in `PROCESSING`, investigate worker health immediately.

---

## 7. Disabling Reviews for a Project

To pause reviews without deleting the project:

```bash
curl -X PATCH https://your-api-host/ai-review/projects/<project-id> \
  -H "Authorization: Bearer <your-jwt>" \
  -H "Content-Type: application/json" \
  -d '{ "auto_review_enabled": false }'
```

Webhooks will still be accepted and jobs created, but nothing will be enqueued. Re-enable by setting `auto_review_enabled: true`.

To fully disable: set `is_active: false`. The webhook handler will treat inactive projects as not found (404).
