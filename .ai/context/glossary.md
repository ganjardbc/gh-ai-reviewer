# AI Workspace Context: Glossary

This glossary defines standard terminology used across the AI MR Reviewer codebase and agent workspaces:

-   **Merchant / Tenant**: An organization using the POS platform. Represents the root ownership container (`merchant_id`).
-   **Review Project**: A configuration binding mapping a GitLab project to the POS merchant tenant.
-   **Review Job**: A single review execution instance representing a git commit event triggered by a GitLab webhook.
-   **Finding**: A specific code issue identified by the LLM (severity, category, file, line, explanation, suggestion).
-   **Queue**: The BullMQ Redis queue named `ai-review` storing pending tasks.
-   **Runner**: The service orchestration logic executing the end-to-end review process.
-   **Worker / Processor**: The BullMQ consumer listening to Redis events and executing runner workloads.
-   **Context Builder**: Logic filtering file diff patches, excluding binaries, and formatting system prompts within size constraints.
-   **Normalizer**: Parser sanitizing LLM responses and matching properties to database enums.
-   **Planner**: The agent scheduling tasks from [tasks-v1.md](file://{project-root}/docs/ai-review/tasks-v1.md).
-   **Executor**: The agent implementing code changes for a single task.
-   **Reviewer**: The validation agent grading executor results before merge.
-   **Fixer**: The correction agent resolving reviewer violations.
-   **Merger**: The gatekeeper agent marking tasks complete and merging branches.
