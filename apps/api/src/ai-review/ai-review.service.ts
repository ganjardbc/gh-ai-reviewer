import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class AiReviewService {
  constructor(
    @InjectQueue('ai-review') private readonly aiReviewQueue: Queue,
  ) {}
}
