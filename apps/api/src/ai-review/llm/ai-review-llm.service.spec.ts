import { Test, TestingModule } from '@nestjs/testing';
import { AiReviewLlmService } from './ai-review-llm.service';
import { PromptBuilderService, ChatMessage } from './prompt-builder.service';
import { NineRouterAdapter } from './nine-router.adapter';
import { ReviewContext } from '../services/ai-review-context-builder.service';

describe('AiReviewLlmService', () => {
  let service: AiReviewLlmService;
  let promptBuilderService: PromptBuilderService;
  let nineRouterAdapter: NineRouterAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiReviewLlmService,
        {
          provide: PromptBuilderService,
          useValue: {
            buildMessages: jest.fn(),
          },
        },
        {
          provide: NineRouterAdapter,
          useValue: {
            complete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AiReviewLlmService>(AiReviewLlmService);
    promptBuilderService =
      module.get<PromptBuilderService>(PromptBuilderService);
    nineRouterAdapter = module.get<NineRouterAdapter>(NineRouterAdapter);
  });

  const mockContext: ReviewContext = {
    mrTitle: 'Refactor user service',
    sourceBranch: 'feature/refactor',
    targetBranch: 'main',
    changedFilesCount: 2,
    totalPatchChars: 150,
    truncated: false,
    omittedFilesCount: 0,
    files: [],
  };

  const mockMessages: ChatMessage[] = [
    { role: 'system', content: 'system-prompt' },
    { role: 'user', content: 'user-prompt' },
  ];

  it('should compile messages and execute completions complete method', async () => {
    jest
      .spyOn(promptBuilderService, 'buildMessages')
      .mockReturnValueOnce(mockMessages);
    jest
      .spyOn(nineRouterAdapter, 'complete')
      .mockResolvedValueOnce('{"summary": "ok"}');

    const result = await service.review(mockContext, 'gpt-4o-mini');

    expect(result).toBe('{"summary": "ok"}');
    expect(promptBuilderService.buildMessages).toHaveBeenCalledWith(
      mockContext,
    );
    expect(nineRouterAdapter.complete).toHaveBeenCalledWith(
      mockMessages,
      'gpt-4o-mini',
    );
  });
});
