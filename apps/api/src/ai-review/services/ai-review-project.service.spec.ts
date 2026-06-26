import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AiReviewProjectService } from './ai-review-project.service';
import { AiReviewProjectRepository } from '../repositories/ai-review-project.repository';
import { CreateAiReviewProjectDto } from '../dto/create-ai-review-project.dto';
import { UpdateAiReviewProjectDto } from '../dto/update-ai-review-project.dto';

describe('AiReviewProjectService', () => {
  let service: AiReviewProjectService;
  let repo: jest.Mocked<AiReviewProjectRepository>;

  const mockDbProject = {
    id: 'proj-123',
    merchant_id: 'merchant-1',
    name: 'My Repo',
    provider: 'GITLAB' as any,
    gitlab_base_url: 'https://gitlab.com',
    gitlab_project_id: '12345',
    gitlab_project_path: 'org/repo',
    webhook_secret: 'secret-token',
    access_token: 'glpat-token',
    default_branch: 'main',
    is_active: true,
    auto_review_enabled: true,
    review_mode: 'DIFF_ONLY' as any,
    max_changed_files: 30,
    max_patch_chars: 120000,
    ignore_patterns: [],
    created_by: 'user-1',
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const repoMock = {
      create: jest.fn(),
      findById: jest.fn(),
      findByGitlabProjectId: jest.fn(),
      update: jest.fn(),
      list: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiReviewProjectService,
        { provide: AiReviewProjectRepository, useValue: repoMock },
      ],
    }).compile();

    service = module.get<AiReviewProjectService>(AiReviewProjectService);
    repo = module.get(AiReviewProjectRepository);
  });

  describe('create', () => {
    it('should create a project and sanitize secrets', async () => {
      const dto: CreateAiReviewProjectDto = {
        name: 'My Repo',
        gitlab_project_id: '12345',
        gitlab_project_path: 'org/repo',
        webhook_secret: 'secret-token',
        access_token: 'glpat-token',
      };
      repo.create.mockResolvedValue(mockDbProject);

      const result = await service.create(dto, 'merchant-1', 'user-1');

      expect(repo.create).toHaveBeenCalled();
      expect(result).not.toHaveProperty('access_token');
      expect(result).not.toHaveProperty('webhook_secret');
      expect(result.id).toBe('proj-123');
    });
  });

  describe('findAll', () => {
    it('should list all projects and sanitize secrets', async () => {
      repo.list.mockResolvedValue([mockDbProject]);

      const result = await service.findAll('merchant-1');

      expect(repo.list).toHaveBeenCalledWith('merchant-1');
      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty('access_token');
      expect(result[0]).not.toHaveProperty('webhook_secret');
    });
  });

  describe('findOne', () => {
    it('should return a sanitized project if it exists and belongs to the merchant', async () => {
      repo.findById.mockResolvedValue(mockDbProject);

      const result = await service.findOne('proj-123', 'merchant-1');

      expect(repo.findById).toHaveBeenCalledWith('proj-123');
      expect(result).not.toHaveProperty('access_token');
      expect(result).not.toHaveProperty('webhook_secret');
    });

    it('should throw NotFoundException if project belongs to another merchant', async () => {
      repo.findById.mockResolvedValue(mockDbProject);

      await expect(
        service.findOne('proj-123', 'different-merchant'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if project does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(
        service.findOne('non-existent', 'merchant-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update and sanitize the project', async () => {
      repo.findById.mockResolvedValue(mockDbProject);
      const updatedProject = { ...mockDbProject, name: 'New Name' };
      repo.update.mockResolvedValue(updatedProject);

      const dto: UpdateAiReviewProjectDto = { name: 'New Name' };
      const result = await service.update('proj-123', dto, 'merchant-1');

      expect(repo.update).toHaveBeenCalledWith('proj-123', {
        name: 'New Name',
      });
      expect(result.name).toBe('New Name');
      expect(result).not.toHaveProperty('access_token');
      expect(result).not.toHaveProperty('webhook_secret');
    });

    it('should throw NotFoundException on cross-tenant updates', async () => {
      repo.findById.mockResolvedValue(mockDbProject);

      const dto: UpdateAiReviewProjectDto = { name: 'New Name' };
      await expect(
        service.update('proj-123', dto, 'different-merchant'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete and sanitize the project', async () => {
      repo.findById.mockResolvedValue(mockDbProject);
      repo.delete.mockResolvedValue(mockDbProject);

      const result = await service.remove('proj-123', 'merchant-1');

      expect(repo.delete).toHaveBeenCalledWith('proj-123');
      expect(result).not.toHaveProperty('access_token');
      expect(result).not.toHaveProperty('webhook_secret');
    });

    it('should throw NotFoundException on cross-tenant deletes', async () => {
      repo.findById.mockResolvedValue(mockDbProject);

      await expect(
        service.remove('proj-123', 'different-merchant'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
