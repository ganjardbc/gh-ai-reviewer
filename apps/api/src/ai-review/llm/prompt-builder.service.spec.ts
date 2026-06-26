import { PromptBuilderService } from './prompt-builder.service';
import { ReviewContext } from '../services/ai-review-context-builder.service';
import { REVIEWER_SYSTEM_PROMPT } from './prompts/reviewer-system.prompt';

describe('PromptBuilderService', () => {
  let service: PromptBuilderService;

  beforeEach(() => {
    service = new PromptBuilderService();
  });

  const mockContext: ReviewContext = {
    mrTitle: 'Refactor user service',
    sourceBranch: 'feature/refactor',
    targetBranch: 'main',
    changedFilesCount: 2,
    totalPatchChars: 150,
    truncated: false,
    omittedFilesCount: 0,
    files: [
      {
        path: 'src/user.service.ts',
        isNewFile: true,
        isDeletedFile: false,
        isRenamedFile: false,
        diff: '+++ new file content',
      },
    ],
  };

  it('should compile correct system and user messages', () => {
    const messages = service.buildMessages(mockContext);

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[0].content).toBe(REVIEWER_SYSTEM_PROMPT);

    expect(messages[1].role).toBe('user');
    expect(messages[1].content).toContain('Refactor user service');
    expect(messages[1].content).toContain('feature/refactor → main');
    expect(messages[1].content).toContain('src/user.service.ts');
    expect(messages[1].content).toContain('+++ new file content');
    expect(messages[1].content).not.toContain('NOTE: The diff was truncated');
    expect(messages[1].content).not.toContain('files were omitted');
  });

  it('should include truncation warning if truncated is true', () => {
    const messages = service.buildMessages({
      ...mockContext,
      truncated: true,
    });

    expect(messages[1].content).toContain('NOTE: The diff was truncated');
  });

  it('should include omitted files count warning if omittedFilesCount > 0', () => {
    const messages = service.buildMessages({
      ...mockContext,
      omittedFilesCount: 3,
    });

    expect(messages[1].content).toContain('NOTE: 3 files were omitted');
  });
});
