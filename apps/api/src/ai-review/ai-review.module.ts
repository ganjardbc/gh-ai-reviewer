import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AiReviewController } from './ai-review.controller';
import { AiReviewService } from './ai-review.service';
import { AiReviewProjectRepository } from './repositories/ai-review-project.repository';
import { AiReviewJobRepository } from './repositories/ai-review-job.repository';
import { AiReviewFindingRepository } from './repositories/ai-review-finding.repository';
import { GitlabWebhookController } from './gitlab/gitlab-webhook.controller';
import { GitlabWebhookService } from './gitlab/gitlab-webhook.service';
import { GitlabApiService } from './gitlab/gitlab-api.service';
import { GitlabWebhookVerifierService } from './gitlab/gitlab-webhook-verifier.service';
import { AiReviewContextBuilderService } from './services/ai-review-context-builder.service';
import { AiReviewResultNormalizerService } from './services/ai-review-result-normalizer.service';
import { PromptBuilderService } from './llm/prompt-builder.service';
import { NineRouterAdapter } from './llm/nine-router.adapter';
import { AiReviewLlmService } from './llm/ai-review-llm.service';
import { AiReviewSummaryBuilderService } from './services/ai-review-summary-builder.service';
import { AiReviewRunnerService } from './services/ai-review-runner.service';
import { AiReviewProcessor } from './queue/ai-review.processor';
import { AiReviewProjectService } from './services/ai-review-project.service';
import { AiReviewJobService } from './services/ai-review-job.service';
import { AiReviewProjectController } from './controllers/ai-review-project.controller';
import { AiReviewJobController } from './controllers/ai-review-job.controller';
import { AI_REVIEW_QUEUE } from './constants';

@Module({
  imports: [
    BullModule.registerQueue({
      name: AI_REVIEW_QUEUE,
    }),
  ],
  controllers: [
    AiReviewController,
    GitlabWebhookController,
    AiReviewProjectController,
    AiReviewJobController,
  ],
  providers: [
    AiReviewService,
    AiReviewProjectRepository,
    AiReviewJobRepository,
    AiReviewFindingRepository,
    GitlabWebhookService,
    GitlabApiService,
    GitlabWebhookVerifierService,
    AiReviewContextBuilderService,
    AiReviewResultNormalizerService,
    PromptBuilderService,
    NineRouterAdapter,
    AiReviewLlmService,
    AiReviewSummaryBuilderService,
    AiReviewRunnerService,
    AiReviewProcessor,
    AiReviewProjectService,
    AiReviewJobService,
  ],
  exports: [
    AiReviewService,
    AiReviewProjectRepository,
    AiReviewJobRepository,
    AiReviewFindingRepository,
    GitlabWebhookService,
    GitlabApiService,
    GitlabWebhookVerifierService,
    AiReviewContextBuilderService,
    AiReviewResultNormalizerService,
    PromptBuilderService,
    NineRouterAdapter,
    AiReviewLlmService,
    AiReviewSummaryBuilderService,
    AiReviewRunnerService,
    AiReviewProcessor,
    AiReviewProjectService,
    AiReviewJobService,
  ],
})
export class AiReviewModule {}
