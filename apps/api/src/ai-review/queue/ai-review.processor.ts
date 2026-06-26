import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { AiReviewRunnerService } from '../services/ai-review-runner.service';
import { AI_REVIEW_QUEUE } from '../constants';

@Processor(AI_REVIEW_QUEUE, { concurrency: 5 })
export class AiReviewProcessor extends WorkerHost {
  private readonly logger = new Logger(AiReviewProcessor.name);

  constructor(private readonly runnerService: AiReviewRunnerService) {
    super();
  }

  async process(job: Job<{ jobId: string }>): Promise<void> {
    this.logger.log(`Processing BullMQ job: name=${job.name}, id=${job.id}`);

    if (job.name !== 'review') {
      this.logger.warn(`Skipping unknown job type: ${job.name}`);
      return;
    }

    const { jobId } = job.data;
    if (!jobId) {
      this.logger.error(
        `Missing jobId in job data: ${JSON.stringify(job.data)}`,
      );
      throw new Error('Missing jobId in job data');
    }

    try {
      await this.runnerService.run(jobId);
      this.logger.log(
        `BullMQ job ${job.id} (review jobId: ${jobId}) processed successfully`,
      );
    } catch (error: any) {
      this.logger.error(
        `BullMQ worker error on job ${job.id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
