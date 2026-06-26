import { Test, TestingModule } from '@nestjs/testing';
import { AiReviewProjectController } from './ai-review-project.controller';
import { AiReviewProjectService } from '../services/ai-review-project.service';
import { CreateAiReviewProjectDto } from '../dto/create-ai-review-project.dto';
import { UpdateAiReviewProjectDto } from '../dto/update-ai-review-project.dto';
import { PrismaService } from '../../database';

describe('AiReviewProjectController', () => {
  let controller: AiReviewProjectController;
  let service: jest.Mocked<AiReviewProjectService>;

  beforeEach(async () => {
    const serviceMock = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiReviewProjectController],
      providers: [
        { provide: AiReviewProjectService, useValue: serviceMock },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = module.get<AiReviewProjectController>(
      AiReviewProjectController,
    );
    service = module.get(AiReviewProjectService);
  });

  it('should call service.create on create()', async () => {
    const dto: CreateAiReviewProjectDto = {
      name: 'Project',
      gitlab_project_id: '123',
      gitlab_project_path: 'org/repo',
      webhook_secret: 'sec',
      access_token: 'tok',
    };
    service.create.mockResolvedValue({ id: 'proj-1' } as any);

    const result = await controller.create(dto, 'merchant-1', 'user-1');
    expect(result).toEqual({ id: 'proj-1' });
    expect(service.create).toHaveBeenCalledWith(dto, 'merchant-1', 'user-1');
  });

  it('should call service.findAll on findAll()', async () => {
    service.findAll.mockResolvedValue([{ id: 'proj-1' }] as any);

    const result = await controller.findAll('merchant-1');
    expect(result).toEqual([{ id: 'proj-1' }]);
    expect(service.findAll).toHaveBeenCalledWith('merchant-1');
  });

  it('should call service.findOne on findOne()', async () => {
    service.findOne.mockResolvedValue({ id: 'proj-1' } as any);

    const result = await controller.findOne('proj-1', 'merchant-1');
    expect(result).toEqual({ id: 'proj-1' });
    expect(service.findOne).toHaveBeenCalledWith('proj-1', 'merchant-1');
  });

  it('should call service.update on update()', async () => {
    const dto: UpdateAiReviewProjectDto = { name: 'New Name' };
    service.update.mockResolvedValue({ id: 'proj-1', name: 'New Name' } as any);

    const result = await controller.update('proj-1', dto, 'merchant-1');
    expect(result).toEqual({ id: 'proj-1', name: 'New Name' });
    expect(service.update).toHaveBeenCalledWith('proj-1', dto, 'merchant-1');
  });

  it('should call service.remove on remove()', async () => {
    service.remove.mockResolvedValue({ id: 'proj-1' } as any);

    const result = await controller.remove('proj-1', 'merchant-1');
    expect(result).toEqual({ id: 'proj-1' });
    expect(service.remove).toHaveBeenCalledWith('proj-1', 'merchant-1');
  });
});
