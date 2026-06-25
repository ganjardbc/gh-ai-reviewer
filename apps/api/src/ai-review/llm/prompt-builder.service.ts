import { Injectable } from '@nestjs/common';
import { ReviewContext } from '../services/ai-review-context-builder.service';
import { REVIEWER_SYSTEM_PROMPT } from './prompts/reviewer-system.prompt';
import { renderUserPrompt } from './prompts/reviewer-user.prompt';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

@Injectable()
export class PromptBuilderService {
  buildMessages(context: ReviewContext): ChatMessage[] {
    return [
      {
        role: 'system',
        content: REVIEWER_SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: renderUserPrompt(context),
      },
    ];
  }
}
