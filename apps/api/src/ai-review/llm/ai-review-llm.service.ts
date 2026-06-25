import { Injectable } from '@nestjs/common';
import { ReviewContext } from '../services/ai-review-context-builder.service';
import { PromptBuilderService } from './prompt-builder.service';
import { NineRouterAdapter } from './nine-router.adapter';

@Injectable()
export class AiReviewLlmService {
  constructor(
    private readonly promptBuilderService: PromptBuilderService,
    private readonly nineRouterAdapter: NineRouterAdapter,
  ) {}

  async review(context: ReviewContext, modelOverride?: string): Promise<string> {
    const messages = this.promptBuilderService.buildMessages(context);
    return this.nineRouterAdapter.complete(messages, modelOverride);
  }
}
