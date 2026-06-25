import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AiReviewProjectRepository } from '../repositories/ai-review-project.repository';
import { AiReviewJobRepository } from '../repositories/ai-review-job.repository';
import { GitlabWebhookVerifierService } from './gitlab-webhook-verifier.service';
import { mapGitlabWebhook } from './gitlab-mapper';
import { AI_REVIEW_QUEUE } from '../constants';

@Injectable()
export class GitlabWebhookService {
  constructor(
    private readonly projectRepository: AiReviewProjectRepository,
    private readonly jobRepository: AiReviewJobRepository,
    private readonly verifierService: GitlabWebhookVerifierService,
    @InjectQueue(AI_REVIEW_QUEUE) private readonly aiReviewQueue: Queue,
  ) {}

  async handleWebhook(token: string, payload: any): Promise<{ jobId?: string; skipped: boolean }> {
    if (!payload || !payload.object_attributes) {
      throw new BadRequestException('Malformed webhook payload');
    }

    const mrEvent = mapGitlabWebhook(payload);
    
    // Only process supported actions
    const supportedActions = ['open', 'update', 'reopen'];
    if (!supportedActions.includes(mrEvent.action)) {
      return { skipped: true };
    }

    if (!mrEvent.gitlabProjectId) {
      throw new BadRequestException('Missing gitlabProjectId in payload');
    }

    // 1. Find project
    const project = await this.projectRepository.findByGitlabProjectId(mrEvent.gitlabProjectId);
    if (!project) {
      throw new NotFoundException(`AiReviewProject not found for gitlabProjectId: ${mrEvent.gitlabProjectId}`);
    }

    // 2. Verify token
    this.verifierService.verify(token, project.webhook_secret);

    // 3. Create AiReviewJob
    const job = await this.jobRepository.create({
      ai_review_project_id: project.id,
      provider: 'GITLAB',
      event_type: 'merge_request',
      status: 'QUEUED',
      gitlab_project_id: mrEvent.gitlabProjectId,
      mr_iid: mrEvent.mrIid,
      mr_id: mrEvent.mrId,
      mr_title: mrEvent.mrTitle,
      mr_url: mrEvent.mrUrl,
      source_branch: mrEvent.sourceBranch,
      target_branch: mrEvent.targetBranch,
      sha: mrEvent.sha,
      base_sha: mrEvent.baseSha,
    });

    // 4. Enqueue or skip
    if (!project.auto_review_enabled) {
      return { jobId: job.id, skipped: true };
    }

    // Add to queue
    await this.aiReviewQueue.add('review', { jobId: job.id });

    return { jobId: job.id, skipped: false };
  }
}
