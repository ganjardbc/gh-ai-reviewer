import { Test, TestingModule } from '@nestjs/testing';
import { GitlabWebhookService } from './gitlab-webhook.service';
import { AiReviewProjectRepository } from '../repositories/ai-review-project.repository';
import { AiReviewJobRepository } from '../repositories/ai-review-job.repository';
import { GitlabWebhookVerifierService } from './gitlab-webhook-verifier.service';
import { getQueueToken } from '@nestjs/bullmq';
import { AI_REVIEW_QUEUE } from '../constants';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('GitlabWebhookService', () => {
  let service: GitlabWebhookService;
  let projectRepo: jest.Mocked<AiReviewProjectRepository>;
  let jobRepo: jest.Mocked<AiReviewJobRepository>;
  let verifier: jest.Mocked<GitlabWebhookVerifierService>;
  let queue: jest.Mocked<any>;

  beforeEach(async () => {
    const projectRepoMock = {
      findByGitlabProjectId: jest.fn(),
    };
    const jobRepoMock = {
      create: jest.fn(),
    };
    const verifierMock = {
      verify: jest.fn(),
    };
    const queueMock = {
      add: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitlabWebhookService,
        { provide: AiReviewProjectRepository, useValue: projectRepoMock },
        { provide: AiReviewJobRepository, useValue: jobRepoMock },
        { provide: GitlabWebhookVerifierService, useValue: verifierMock },
        { provide: getQueueToken(AI_REVIEW_QUEUE), useValue: queueMock },
      ],
    }).compile();

    service = module.get<GitlabWebhookService>(GitlabWebhookService);
    projectRepo = module.get(AiReviewProjectRepository);
    jobRepo = module.get(AiReviewJobRepository);
    verifier = module.get(GitlabWebhookVerifierService);
    queue = module.get(getQueueToken(AI_REVIEW_QUEUE));
  });

  it('should throw BadRequestException on empty payload', async () => {
    await expect(service.handleWebhook('token', null)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should skip non-supported MR actions', async () => {
    const payload = {
      object_attributes: {
        action: 'close',
      },
    };
    const result = await service.handleWebhook('token', payload);
    expect(result).toEqual({ skipped: true });
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException if project not found', async () => {
    const payload = {
      object_attributes: {
        action: 'open',
      },
      project: {
        id: 123,
      },
    };
    projectRepo.findByGitlabProjectId.mockResolvedValue(null);

    await expect(service.handleWebhook('token', payload)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should create job and enqueue if autoReviewEnabled is true', async () => {
    const payload = {
      object_attributes: {
        action: 'open',
        iid: 1,
        id: 10,
        title: 'Title',
      },
      project: {
        id: 123,
      },
    };
    const mockProject = {
      id: 'proj-1',
      webhook_secret: 'secret',
      auto_review_enabled: true,
    } as any;
    const mockJob = {
      id: 'job-1',
    } as any;

    projectRepo.findByGitlabProjectId.mockResolvedValue(mockProject);
    jobRepo.create.mockResolvedValue(mockJob);

    const result = await service.handleWebhook('secret', payload);

    expect(result).toEqual({ jobId: 'job-1', skipped: false });
    expect(verifier.verify).toHaveBeenCalledWith('secret', 'secret');
    expect(jobRepo.create).toHaveBeenCalled();
    expect(queue.add).toHaveBeenCalledWith('review', { jobId: 'job-1' });
  });

  it('should create job and skip enqueue if autoReviewEnabled is false', async () => {
    const payload = {
      object_attributes: {
        action: 'open',
        iid: 1,
        id: 10,
        title: 'Title',
      },
      project: {
        id: 123,
      },
    };
    const mockProject = {
      id: 'proj-1',
      webhook_secret: 'secret',
      auto_review_enabled: false,
    } as any;
    const mockJob = {
      id: 'job-1',
    } as any;

    projectRepo.findByGitlabProjectId.mockResolvedValue(mockProject);
    jobRepo.create.mockResolvedValue(mockJob);

    const result = await service.handleWebhook('secret', payload);

    expect(result).toEqual({ jobId: 'job-1', skipped: true });
    expect(queue.add).not.toHaveBeenCalled();
  });
});
