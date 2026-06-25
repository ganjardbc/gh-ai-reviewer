-- CreateTable
CREATE TABLE `ai_review_projects` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `merchant_id` CHAR(36) NULL,
    `name` VARCHAR(150) NOT NULL,
    `provider` ENUM('GITLAB') NOT NULL DEFAULT 'GITLAB',
    `gitlab_base_url` VARCHAR(255) NOT NULL DEFAULT 'https://gitlab.com',
    `gitlab_project_id` VARCHAR(120) NOT NULL,
    `gitlab_project_path` VARCHAR(255) NOT NULL,
    `webhook_secret` VARCHAR(255) NOT NULL,
    `access_token` TEXT NOT NULL,
    `default_branch` VARCHAR(120) NULL DEFAULT 'main',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `auto_review_enabled` BOOLEAN NOT NULL DEFAULT true,
    `review_mode` ENUM('DIFF_ONLY', 'FULL_FILE') NOT NULL DEFAULT 'DIFF_ONLY',
    `max_changed_files` INTEGER NOT NULL DEFAULT 30,
    `max_patch_chars` INTEGER NOT NULL DEFAULT 120000,
    `ignore_patterns` JSON NOT NULL,
    `created_by` CHAR(36) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_ai_review_projects_merchant`(`merchant_id`),
    UNIQUE INDEX `unique_gitlab_project_id`(`gitlab_project_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_review_jobs` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `ai_review_project_id` CHAR(36) NOT NULL,
    `provider` ENUM('GITLAB') NOT NULL DEFAULT 'GITLAB',
    `event_type` VARCHAR(100) NOT NULL,
    `status` ENUM('QUEUED', 'PROCESSING', 'SUCCESS', 'FAILED') NOT NULL DEFAULT 'QUEUED',
    `gitlab_project_id` VARCHAR(120) NOT NULL,
    `mr_iid` INTEGER NOT NULL,
    `mr_id` INTEGER NULL,
    `mr_title` VARCHAR(255) NOT NULL,
    `mr_url` VARCHAR(500) NULL,
    `source_branch` VARCHAR(255) NULL,
    `target_branch` VARCHAR(255) NULL,
    `sha` VARCHAR(100) NULL,
    `base_sha` VARCHAR(100) NULL,
    `changed_files_count` INTEGER NOT NULL DEFAULT 0,
    `model_name` VARCHAR(100) NULL,
    `review_mode_snapshot` VARCHAR(100) NULL,
    `summary_markdown` LONGTEXT NULL,
    `raw_response_json` JSON NULL,
    `error_message` TEXT NULL,
    `started_at` TIMESTAMP(0) NULL,
    `finished_at` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_ai_review_jobs_project`(`ai_review_project_id`),
    INDEX `idx_ai_review_jobs_mr`(`gitlab_project_id`, `mr_iid`),
    INDEX `idx_ai_review_jobs_status`(`status`),
    INDEX `idx_ai_review_jobs_created`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_review_findings` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `ai_review_job_id` CHAR(36) NOT NULL,
    `file_path` VARCHAR(500) NULL,
    `line` INTEGER NULL,
    `severity` ENUM('HIGH', 'MEDIUM', 'LOW') NOT NULL,
    `category` ENUM('SECURITY', 'BUG', 'ARCHITECTURE', 'VALIDATION', 'PERFORMANCE', 'MAINTAINABILITY', 'TESTING') NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `suggestion` TEXT NULL,
    `confidence` FLOAT NULL,
    `fingerprint` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_ai_review_findings_job`(`ai_review_job_id`),
    INDEX `idx_ai_review_findings_severity`(`severity`),
    INDEX `idx_ai_review_findings_fingerprint`(`fingerprint`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ai_review_projects` ADD CONSTRAINT `ai_review_projects_ibfk_merchant` FOREIGN KEY (`merchant_id`) REFERENCES `merchants`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `ai_review_jobs` ADD CONSTRAINT `ai_review_jobs_ibfk_project` FOREIGN KEY (`ai_review_project_id`) REFERENCES `ai_review_projects`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `ai_review_findings` ADD CONSTRAINT `ai_review_findings_ibfk_job` FOREIGN KEY (`ai_review_job_id`) REFERENCES `ai_review_jobs`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
