import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AiReviewJobRepository } from '../repositories/ai-review-job.repository';
import { AiReviewProjectRepository } from '../repositories/ai-review-project.repository';
import { AiReviewFindingRepository } from '../repositories/ai-review-finding.repository';
import { GitlabApiService } from '../gitlab/gitlab-api.service';
import { AiReviewContextBuilderService } from './ai-review-context-builder.service';
import { AiReviewLlmService } from '../llm/ai-review-llm.service';
import { AiReviewResultNormalizerService } from './ai-review-result-normalizer.service';
import { AiReviewSummaryBuilderService } from './ai-review-summary-builder.service';

@Injectable()
export class AiReviewRunnerService {
  private readonly logger = new Logger(AiReviewRunnerService.name);

  constructor(
    private readonly jobRepository: AiReviewJobRepository,
    private readonly projectRepository: AiReviewProjectRepository,
    private readonly findingRepository: AiReviewFindingRepository,
    private readonly gitlabApiService: GitlabApiService,
    private readonly contextBuilderService: AiReviewContextBuilderService,
    private readonly llmService: AiReviewLlmService,
    private readonly normalizerService: AiReviewResultNormalizerService,
    private readonly summaryBuilderService: AiReviewSummaryBuilderService,
  ) {}

  async run(jobId: string): Promise<void> {
    this.logger.log(`Starting review runner for job: ${jobId}`);

    // 1. Load job
    const job = await this.jobRepository.findById(jobId);
    if (!job) {
      throw new NotFoundException(`AiReviewJob not found: ${jobId}`);
    }

    // Load project
    const project = await this.projectRepository.findById(
      job.ai_review_project_id,
    );
    if (!project) {
      throw new NotFoundException(
        `AiReviewProject not found: ${job.ai_review_project_id}`,
      );
    }

    // 2. Mark status -> PROCESSING
    await this.jobRepository.updateStatus(jobId, 'PROCESSING', {
      started_at: new Date(),
    });

    try {
      // 3. Fetch latest MR details
      this.logger.debug(
        `Fetching MR details for IID ${job.mr_iid} in project ${project.gitlab_project_id}`,
      );
      const mrDetail = await this.gitlabApiService.getMergeRequest(
        project.gitlab_base_url,
        project.access_token,
        project.gitlab_project_id,
        job.mr_iid,
      );

      // 4. Fetch changes
      this.logger.debug(`Fetching MR changes for IID ${job.mr_iid}`);
      const changesResponse =
        await this.gitlabApiService.getMergeRequestChanges(
          project.gitlab_base_url,
          project.access_token,
          project.gitlab_project_id,
          job.mr_iid,
        );

      const changes = changesResponse.changes || [];

      // 5. Build context
      this.logger.debug('Building review context');
      const context = this.contextBuilderService.build(
        {
          title: mrDetail.title,
          source_branch: mrDetail.source_branch,
          target_branch: mrDetail.target_branch,
        },
        changes,
        project,
      );

      // 6. Call LLM
      this.logger.debug('Invoking LLM for code review');
      const rawJson = await this.llmService.review(context);

      // 7. Normalize results
      this.logger.debug('Normalizing review findings');
      const normalizedResult = this.normalizerService.normalize(rawJson);

      // 8. Store findings and raw JSON response
      this.logger.debug(
        `Saving ${normalizedResult.findings.length} findings to database`,
      );
      if (normalizedResult.findings.length > 0) {
        await this.findingRepository.createMany(
          jobId,
          normalizedResult.findings,
        );
      }

      // 9. Render summary Markdown
      this.logger.debug('Rendering summary markdown');
      const summaryMarkdown =
        this.summaryBuilderService.build(normalizedResult);

      // 10. Post note to GitLab
      this.logger.debug('Posting review comment to GitLab');
      await this.gitlabApiService.postMergeRequestNote(
        project.gitlab_base_url,
        project.access_token,
        project.gitlab_project_id,
        job.mr_iid,
        summaryMarkdown,
      );

      // 11. Mark success
      this.logger.log(`Review job ${jobId} finished successfully`);
      await this.jobRepository.updateStatus(jobId, 'SUCCESS', {
        finished_at: new Date(),
        summary_markdown: summaryMarkdown,
        raw_response_json: rawJson as any,
        changed_files_count: context.changedFilesCount,
        review_mode_snapshot: project.review_mode,
      });
    } catch (error: any) {
      this.logger.error(
        `Error processing review job ${jobId}: ${error.message}`,
        error.stack,
      );

      const errorMessage = (error.message || String(error)).substring(0, 1000);
      await this.jobRepository.updateStatus(jobId, 'FAILED', {
        finished_at: new Date(),
        error_message: errorMessage,
      });

      // Re-throw so worker knows it failed
      throw error;
    }
  }
}
