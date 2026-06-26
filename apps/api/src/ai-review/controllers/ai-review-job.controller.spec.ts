import { Test, TestingModule } from '@nestjs/testing';
import { AiReviewJobController } from './ai-review-job.controller';
import { AiReviewJobService } from '../services/ai-review-job.service';
import { ListJobsDto } from '../dto/list-jobs.dto';
import { PrismaService } from '../../database';

describe('AiReviewJobController', () => {
  let controller: AiReviewJobController;
  let service: jest.Mocked<AiReviewJobService>;

  beforeEach(async () => {
    const serviceMock = {
      findAll: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiReviewJobController],
      providers: [
        { provide: AiReviewJobService, useValue: serviceMock },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = module.get<AiReviewJobController>(AiReviewJobController);
    service = module.get(AiReviewJobService);
  });

  it('should call service.findAll on findAll()', async () => {
    const query: ListJobsDto = { page: 1, limit: 10 };
    service.findAll.mockResolvedValue({ data: [], meta: {} } as any);

    const result = await controller.findAll('merchant-1', query);
    expect(result).toEqual({ data: [], meta: {} });
    expect(service.findAll).toHaveBeenCalledWith('merchant-1', query);
  });

  it('should call service.findOne on findOne()', async () => {
    service.findOne.mockResolvedValue({ id: 'job-1' } as any);

    const result = await controller.findOne('job-1', 'merchant-1');
    expect(result).toEqual({ id: 'job-1' });
    expect(service.findOne).toHaveBeenCalledWith('job-1', 'merchant-1');
  });
});
