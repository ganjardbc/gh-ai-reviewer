import { Test, TestingModule } from '@nestjs/testing';
import { AiReviewRunnerService } from './ai-review-runner.service';
import { AiReviewJobRepository } from '../repositories/ai-review-job.repository';
import { AiReviewProjectRepository } from '../repositories/ai-review-project.repository';
import { AiReviewFindingRepository } from '../repositories/ai-review-finding.repository';
import { GitlabApiService } from '../gitlab/gitlab-api.service';
import { AiReviewContextBuilderService } from './ai-review-context-builder.service';
import { AiReviewLlmService } from '../llm/ai-review-llm.service';
import { AiReviewResultNormalizerService } from './ai-review-result-normalizer.service';
import { AiReviewSummaryBuilderService } from './ai-review-summary-builder.service';
import { AiReviewSeverity, AiReviewFindingCategory } from '@prisma/client';

describe('AiReviewRunnerService', () => {
  let runner: AiReviewRunnerService;
  let jobRepo: jest.Mocked<AiReviewJobRepository>;
  let projectRepo: jest.Mocked<AiReviewProjectRepository>;
  let findingRepo: jest.Mocked<AiReviewFindingRepository>;
  let gitlabApi: jest.Mocked<GitlabApiService>;
  let llmService: jest.Mocked<AiReviewLlmService>;

  const mockJob = {
    id: 'job-1',
    ai_review_project_id: 'proj-1',
    mr_iid: 42,
    mr_title: 'Fix auth',
  } as any;

  const mockProject = {
    id: 'proj-1',
    gitlab_base_url: 'https://gitlab.com',
    gitlab_project_id: '123',
    access_token: 'token',
    review_mode: 'DIFF_ONLY',
    max_changed_files: 30,
    max_patch_chars: 120000,
    ignore_patterns: [],
  } as any;

  const mockMrDetail = {
    title: 'Fix auth',
    source_branch: 'fix-auth',
    target_branch: 'main',
    web_url: 'https://gitlab.com/org/repo/-/merge_requests/42',
    id: 999,
    iid: 42,
    sha: 'sha123',
    diff_refs: {
      base_sha: 'base123',
      head_sha: 'head123',
      start_sha: 'start123',
    },
  };

  const mockMrChanges = {
    changes: [
      {
        new_path: 'src/auth.ts',
        old_path: 'src/auth.ts',
        diff: '@@ -1,2 +1,3 @@\n+const x = 1;',
        new_file: false,
        deleted_file: false,
        renamed_file: false,
      },
    ],
  };

  const mockLlmResponse = JSON.stringify({
    summary: 'Looks good.',
    riskLevel: 'low',
    findings: [
      {
        severity: 'low',
        category: 'bug',
        filePath: 'src/auth.ts',
        line: 1,
        title: 'Unused x',
        description: 'Variable x is unused.',
        suggestion: 'Remove it.',
        confidence: 0.9,
      },
    ],
    suggestedTests: ['Verify compilation.'],
  });

  beforeEach(async () => {
    const jobRepoMock = {
      findById: jest.fn(),
      updateStatus: jest.fn(),
    };
    const projectRepoMock = {
      findById: jest.fn(),
    };
    const findingRepoMock = {
      createMany: jest.fn(),
    };
    const gitlabApiMock = {
      getMergeRequest: jest.fn(),
      getMergeRequestChanges: jest.fn(),
      postMergeRequestNote: jest.fn(),
    };
    const llmServiceMock = {
      review: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiReviewRunnerService,
        AiReviewContextBuilderService,
        AiReviewResultNormalizerService,
        AiReviewSummaryBuilderService,
        { provide: AiReviewJobRepository, useValue: jobRepoMock },
        { provide: AiReviewProjectRepository, useValue: projectRepoMock },
        { provide: AiReviewFindingRepository, useValue: findingRepoMock },
        { provide: GitlabApiService, useValue: gitlabApiMock },
        { provide: AiReviewLlmService, useValue: llmServiceMock },
      ],
    }).compile();

    runner = module.get<AiReviewRunnerService>(AiReviewRunnerService);
    jobRepo = module.get(AiReviewJobRepository);
    projectRepo = module.get(AiReviewProjectRepository);
    findingRepo = module.get(AiReviewFindingRepository);
    gitlabApi = module.get(GitlabApiService);
    llmService = module.get(AiReviewLlmService);
  });

  it('should run the review pipeline end-to-end successfully', async () => {
    jobRepo.findById.mockResolvedValue(mockJob);
    projectRepo.findById.mockResolvedValue(mockProject);
    gitlabApi.getMergeRequest.mockResolvedValue(mockMrDetail);
    gitlabApi.getMergeRequestChanges.mockResolvedValue(mockMrChanges);
    llmService.review.mockResolvedValue(mockLlmResponse);
    findingRepo.createMany.mockResolvedValue({ count: 1 });
    gitlabApi.postMergeRequestNote.mockResolvedValue({ id: 101 });
    jobRepo.updateStatus.mockResolvedValue({} as any);

    await runner.run('job-1');

    // Verify DB processing state transition
    expect(jobRepo.updateStatus).toHaveBeenNthCalledWith(
      1,
      'job-1',
      'PROCESSING',
      expect.objectContaining({
        started_at: expect.any(Date),
      }),
    );

    // Verify GitLab calls
    expect(gitlabApi.getMergeRequest).toHaveBeenCalledWith(
      mockProject.gitlab_base_url,
      mockProject.access_token,
      mockProject.gitlab_project_id,
      mockJob.mr_iid,
    );
    expect(gitlabApi.getMergeRequestChanges).toHaveBeenCalledWith(
      mockProject.gitlab_base_url,
      mockProject.access_token,
      mockProject.gitlab_project_id,
      mockJob.mr_iid,
    );

    // Verify LLM call
    expect(llmService.review).toHaveBeenCalled();

    // Verify findings are created
    expect(findingRepo.createMany).toHaveBeenCalledWith('job-1', [
      {
        severity: AiReviewSeverity.LOW,
        category: AiReviewFindingCategory.BUG,
        filePath: 'src/auth.ts',
        line: 1,
        title: 'Unused x',
        description: 'Variable x is unused.',
        suggestion: 'Remove it.',
        confidence: 0.9,
      },
    ]);

    // Verify note is posted
    expect(gitlabApi.postMergeRequestNote).toHaveBeenCalledWith(
      mockProject.gitlab_base_url,
      mockProject.access_token,
      mockProject.gitlab_project_id,
      mockJob.mr_iid,
      expect.stringContaining('## AI Review Summary'),
    );

    // Verify final DB success transition
    expect(jobRepo.updateStatus).toHaveBeenNthCalledWith(
      2,
      'job-1',
      'SUCCESS',
      expect.objectContaining({
        finished_at: expect.any(Date),
        summary_markdown: expect.stringContaining('## AI Review Summary'),
        raw_response_json: mockLlmResponse,
        changed_files_count: 1,
        review_mode_snapshot: 'DIFF_ONLY',
      }),
    );
  });

  it('should gracefully handle pipeline errors, mark job FAILED and re-throw', async () => {
    jobRepo.findById.mockResolvedValue(mockJob);
    projectRepo.findById.mockResolvedValue(mockProject);
    gitlabApi.getMergeRequest.mockResolvedValue(mockMrDetail);
    gitlabApi.getMergeRequestChanges.mockResolvedValue(mockMrChanges);

    // Simulate LLM error
    llmService.review.mockRejectedValue(new Error('LLM request timed out'));
    jobRepo.updateStatus.mockResolvedValue({} as any);

    await expect(runner.run('job-1')).rejects.toThrow('LLM request timed out');

    // Verify DB failure transition
    expect(jobRepo.updateStatus).toHaveBeenNthCalledWith(
      2,
      'job-1',
      'FAILED',
      expect.objectContaining({
        finished_at: expect.any(Date),
        error_message: 'LLM request timed out',
      }),
    );
  });
});
