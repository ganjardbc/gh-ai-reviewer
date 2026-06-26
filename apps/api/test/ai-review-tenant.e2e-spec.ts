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
import { JwtService } from '@nestjs/jwt';

describe('AiReview Tenancy (e2e)', () => {
  let app: INestApplication<App>;
  let prismaService: any;
  let jwtService: JwtService;
  let authToken: string;

  // We define a dynamic calling user so we can adjust merchant_id across tests
  const callingUser = {
    id: 'user-1',
    email: 'user@merchant.com',
    merchant_id: 'merchant-1',
    is_active: true,
  };

  beforeEach(async () => {
    prismaService = {
      ai_review_projects: {
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      ai_review_jobs: {
        findUnique: jest.fn(),
      },
      users: {
        findUnique: jest.fn().mockImplementation(() => {
          return {
            id: callingUser.id,
            email: callingUser.email,
            merchant_id: callingUser.merchant_id,
            is_active: callingUser.is_active,
            merchants: {
              id: callingUser.merchant_id,
              name: 'Test Merchant',
              slug: 'test-merchant',
            },
          };
        }),
      },
      user_roles: {
        findMany: jest.fn().mockResolvedValue([
          {
            roles: {
              role_permissions: [
                { permissions: { code: 'ai_review.projects.read' } },
                { permissions: { code: 'ai_review.projects.create' } },
                { permissions: { code: 'ai_review.projects.update' } },
                { permissions: { code: 'ai_review.projects.delete' } },
                { permissions: { code: 'ai_review.jobs.read' } },
              ],
            },
          },
        ]),
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    jwtService = app.get<JwtService>(JwtService);
    authToken = jwtService.sign({
      sub: callingUser.id,
      email: callingUser.email,
    });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Project Tenancy', () => {
    const mockProject = {
      id: 'proj-1',
      name: 'Project 1',
      merchant_id: 'merchant-1',
      gitlab_project_id: '123',
    };

    it('should allow user of same merchant to get project details', async () => {
      callingUser.merchant_id = 'merchant-1';
      prismaService.ai_review_projects.findUnique.mockResolvedValue(
        mockProject,
      );

      await request(app.getHttpServer())
        .get('/ai-review/projects/proj-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('should block (404) user of different merchant from getting project details', async () => {
      callingUser.merchant_id = 'different-merchant';
      prismaService.ai_review_projects.findUnique.mockResolvedValue(
        mockProject,
      );

      await request(app.getHttpServer())
        .get('/ai-review/projects/proj-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should block (404) user of different merchant from updating project', async () => {
      callingUser.merchant_id = 'different-merchant';
      prismaService.ai_review_projects.findUnique.mockResolvedValue(
        mockProject,
      );

      await request(app.getHttpServer())
        .patch('/ai-review/projects/proj-1')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Hacked Name' })
        .expect(404);

      expect(prismaService.ai_review_projects.update).not.toHaveBeenCalled();
    });

    it('should block (404) user of different merchant from deleting project', async () => {
      callingUser.merchant_id = 'different-merchant';
      prismaService.ai_review_projects.findUnique.mockResolvedValue(
        mockProject,
      );

      await request(app.getHttpServer())
        .delete('/ai-review/projects/proj-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(prismaService.ai_review_projects.delete).not.toHaveBeenCalled();
    });
  });

  describe('Job Tenancy', () => {
    const mockJob = {
      id: 'job-1',
      ai_review_project_id: 'proj-1',
      project: {
        merchant_id: 'merchant-1',
      },
    };

    it('should allow user of same merchant to get job details', async () => {
      callingUser.merchant_id = 'merchant-1';
      prismaService.ai_review_jobs.findUnique.mockResolvedValue(mockJob);

      await request(app.getHttpServer())
        .get('/ai-review/jobs/job-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('should block (404) user of different merchant from getting job details', async () => {
      callingUser.merchant_id = 'different-merchant';
      prismaService.ai_review_jobs.findUnique.mockResolvedValue(mockJob);

      await request(app.getHttpServer())
        .get('/ai-review/jobs/job-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});
