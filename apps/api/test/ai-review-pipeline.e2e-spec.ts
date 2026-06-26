process.env.NINE_ROUTER_API_KEY = 'mock-key';

jest.mock('bullmq', () => {
  return {
    Queue: jest.fn().mockImplementation(() => ({
      add: jest.fn().mockResolvedValue({ id: 'queued-job-id' }),
      close: jest.fn(),
    })),
    Worker: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      close: jest.fn(),
    })),
    QueueEvents: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      close: jest.fn(),
    })),
  };
});

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { getQueueToken } from '@nestjs/bullmq';
import { AI_REVIEW_QUEUE } from '../src/ai-review/constants';

describe('AiReview Pipeline (e2e)', () => {
  let app: INestApplication<App>;
  let prismaService: any;
  let mockQueue: any;

  beforeEach(async () => {
    prismaService = {
      ai_review_projects: {
        findUnique: jest.fn(),
      },
      ai_review_jobs: {
        create: jest.fn(),
      },
    };

    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: 'queued-job-id' }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaService)
      .overrideProvider(getQueueToken(AI_REVIEW_QUEUE))
      .useValue(mockQueue)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const validPayload = {
    object_kind: 'merge_request',
    project: {
      id: 123,
    },
    object_attributes: {
      action: 'open',
      iid: 42,
      id: 999,
      title: 'Fix auth vulnerability',
      url: 'https://gitlab.com/org/repo/-/merge_requests/42',
      source_branch: 'bugfix/auth-session',
      target_branch: 'main',
      last_commit: {
        id: 'sha123',
      },
      diff_refs: {
        base_sha: 'base123',
      },
    },
  };

  it('should accept gitlab webhook merge-request trigger, create job, and enqueue execution', async () => {
    const mockProject = {
      id: 'proj-1',
      gitlab_project_id: '123',
      webhook_secret: 'my-webhook-secret',
      auto_review_enabled: true,
      review_mode: 'DIFF_ONLY',
    };

    prismaService.ai_review_projects.findUnique.mockResolvedValue(mockProject);
    prismaService.ai_review_jobs.create.mockResolvedValue({
      id: 'job-1',
      status: 'QUEUED',
    });

    const response = await request(app.getHttpServer())
      .post('/webhooks/gitlab/merge-request')
      .set('x-gitlab-token', 'my-webhook-secret')
      .send(validPayload)
      .expect(201);

    expect(response.body).toEqual({
      jobId: 'job-1',
      skipped: false,
    });

    expect(prismaService.ai_review_projects.findUnique).toHaveBeenCalledWith({
      where: { gitlab_project_id: '123' },
    });

    expect(prismaService.ai_review_jobs.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ai_review_project_id: 'proj-1',
        status: 'QUEUED',
        mr_iid: 42,
        mr_title: 'Fix auth vulnerability',
      }),
    });

    expect(mockQueue.add).toHaveBeenCalledWith('review', { jobId: 'job-1' });
  });

  it('should reject webhook request if x-gitlab-token signature is invalid', async () => {
    const mockProject = {
      id: 'proj-1',
      gitlab_project_id: '123',
      webhook_secret: 'my-webhook-secret',
    };

    prismaService.ai_review_projects.findUnique.mockResolvedValue(mockProject);

    await request(app.getHttpServer())
      .post('/webhooks/gitlab/merge-request')
      .set('x-gitlab-token', 'wrong-signature')
      .send(validPayload)
      .expect(401);

    expect(prismaService.ai_review_jobs.create).not.toHaveBeenCalled();
    expect(mockQueue.add).not.toHaveBeenCalled();
  });

  it('should fail with BadRequestException if payload is malformed', async () => {
    await request(app.getHttpServer())
      .post('/webhooks/gitlab/merge-request')
      .set('x-gitlab-token', 'secret')
      .send({ invalid: 'payload' })
      .expect(400);
  });
});
