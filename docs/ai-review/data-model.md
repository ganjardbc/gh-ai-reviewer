# AI Reviewer V1 — Data Model

## Enums

```prisma
enum AiReviewProvider {
  GITLAB
}

enum AiReviewReviewMode {
  DIFF_ONLY
  FULL_FILE
}

enum AiReviewJobStatus {
  QUEUED
  PROCESSING
  SUCCESS
  FAILED
}

enum AiReviewSeverity {
  HIGH
  MEDIUM
  LOW
}

enum AiReviewFindingCategory {
  SECURITY
  BUG
  ARCHITECTURE
  VALIDATION
  PERFORMANCE
  MAINTAINABILITY
  TESTING
}
```

---

## Models

### `AiReviewProject`

```prisma
model AiReviewProject {
  id                 String              @id @default(cuid())
  merchantId         String?
  name               String
  provider           AiReviewProvider    @default(GITLAB)

  // GitLab connection
  gitlabBaseUrl      String              @default("https://gitlab.com")
  gitlabProjectId    String
  gitlabProjectPath  String
  webhookSecret      String
  accessToken        String

  // Review behaviour
  defaultBranch      String?             @default("main")
  isActive           Boolean             @default(true)
  autoReviewEnabled  Boolean             @default(true)
  reviewMode         AiReviewReviewMode  @default(DIFF_ONLY)
  maxChangedFiles    Int                 @default(30)
  maxPatchChars      Int                 @default(120000)
  ignorePatterns     Json                @default("[]")   // string[]

  createdBy          String?
  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt

  jobs               AiReviewJob[]

  @@unique([gitlabProjectId])
  @@index([merchantId])
  @@map("ai_review_projects")
}
```

**Field notes:**

| Field | Rationale |
|---|---|
| `gitlabProjectId` | Unique — prevents duplicate bindings for the same GitLab repo |
| `webhookSecret` | Stored per-project; verified against `X-Gitlab-Token` header |
| `accessToken` | GitLab personal/project access token with `api` scope. Store encrypted in production. |
| `maxChangedFiles` | Hard cap on files sent to LLM. Prevents prompt overflow on large MRs. |
| `maxPatchChars` | Hard cap on total patch text characters. Prevents 9router token limit breach. |
| `ignorePatterns` | JSON array of glob patterns (e.g. `["dist/**", "*.lock"]`). |
| `autoReviewEnabled` | When false, webhooks are accepted but jobs are not enqueued. |
| `reviewMode` | V1 only supports `DIFF_ONLY`. `FULL_FILE` is reserved for V2. |

---

### `AiReviewJob`

```prisma
model AiReviewJob {
  id                    String              @id @default(cuid())
  aiReviewProjectId     String
  provider              AiReviewProvider    @default(GITLAB)
  eventType             String              // "merge_request"
  status                AiReviewJobStatus   @default(QUEUED)

  // MR identity
  gitlabProjectId       String
  mrIid                 Int
  mrId                  Int?
  mrTitle               String
  mrUrl                 String?
  sourceBranch          String?
  targetBranch          String?
  sha                   String?
  baseSha               String?

  // Processing metrics
  changedFilesCount     Int                 @default(0)
  modelName             String?
  reviewModeSnapshot    String?             // snapshot of mode at time of review

  // Output
  summaryMarkdown       String?             @db.LongText
  rawResponseJson       Json?
  errorMessage          String?             @db.Text

  // Timing
  startedAt             DateTime?
  finishedAt            DateTime?
  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt

  project               AiReviewProject     @relation(fields: [aiReviewProjectId], references: [id])
  findings              AiReviewFinding[]

  @@index([aiReviewProjectId])
  @@index([gitlabProjectId, mrIid])
  @@index([status])
  @@index([createdAt])
  @@map("ai_review_jobs")
}
```

**Field notes:**

| Field | Rationale |
|---|---|
| `mrIid` | GitLab internal-per-project MR number (e.g. `!42`). Used for API calls. |
| `mrId` | GitLab global MR ID. Stored for reference. |
| `sha` / `baseSha` | HEAD and base commit SHAs at time of review. For traceability. |
| `changedFilesCount` | After filtering; reflects what was actually sent to LLM. |
| `modelName` | LLM model used (from 9router response or config). |
| `reviewModeSnapshot` | Snapshot of `reviewMode` at execution time — project config may change later. |
| `summaryMarkdown` | The rendered Markdown that was posted to GitLab. |
| `rawResponseJson` | Full JSON response from LLM. Debug / audit trail. |
| `errorMessage` | Populated on `FAILED`. First 1000 chars of the caught error. |

---

### `AiReviewFinding`

```prisma
model AiReviewFinding {
  id             String                   @id @default(cuid())
  aiReviewJobId  String

  filePath       String?
  line           Int?
  severity       AiReviewSeverity
  category       AiReviewFindingCategory
  title          String
  description    String                   @db.Text
  suggestion     String?                  @db.Text
  confidence     Float?
  fingerprint    String?

  createdAt      DateTime                 @default(now())
  updatedAt      DateTime                 @updatedAt

  job            AiReviewJob              @relation(fields: [aiReviewJobId], references: [id])

  @@index([aiReviewJobId])
  @@index([severity])
  @@index([fingerprint])
  @@map("ai_review_findings")
}
```

**Field notes:**

| Field | Rationale |
|---|---|
| `filePath` | Nullable — some findings are MR-level (not tied to a specific file). |
| `line` | Nullable — not always deterministic from diff context. |
| `confidence` | Float 0–1 from LLM output. Useful for filtering noise. |
| `fingerprint` | SHA of `filePath + title + description` — deduplication key for future use. |

---

## Indexing Considerations

- `ai_review_projects.gitlabProjectId` — unique; used on every webhook to find the project.
- `ai_review_jobs.(gitlabProjectId, mrIid)` — compound; used to check for duplicate jobs on the same MR.
- `ai_review_jobs.status` — used for worker health dashboards and stuck-job detection.
- `ai_review_jobs.createdAt` — used for time-range queries (admin dashboards, cleanup).
- `ai_review_findings.aiReviewJobId` — FK lookup; always needed when loading findings for a job.
- `ai_review_findings.severity` — filtered views (e.g. "show HIGH findings only").
- `ai_review_findings.fingerprint` — future deduplication and trend analysis.
