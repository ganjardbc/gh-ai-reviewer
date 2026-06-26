import { Test, TestingModule } from '@nestjs/testing';
import { AiReviewProcessor } from './ai-review.processor';
import { AiReviewRunnerService } from '../services/ai-review-runner.service';
import { Job } from 'bullmq';

describe('AiReviewProcessor', () => {
  let processor: AiReviewProcessor;
  let runnerService: jest.Mocked<AiReviewRunnerService>;

  beforeEach(async () => {
    const runnerServiceMock = {
      run: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiReviewProcessor,
        { provide: AiReviewRunnerService, useValue: runnerServiceMock },
      ],
    }).compile();

    processor = module.get<AiReviewProcessor>(AiReviewProcessor);
    runnerService = module.get(AiReviewRunnerService);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  it('should process job correctly when name is "review" and jobId is present', async () => {
    const mockJob = {
      id: 'job-id-1',
      name: 'review',
      data: { jobId: 'job-123' },
    } as unknown as Job;

    runnerService.run.mockResolvedValue(undefined);

    await processor.process(mockJob);

    expect(runnerService.run).toHaveBeenCalledWith('job-123');
  });

  it('should skip job when name is not "review"', async () => {
    const mockJob = {
      id: 'job-id-2',
      name: 'unknown',
      data: { jobId: 'job-123' },
    } as unknown as Job;

    await processor.process(mockJob);

    expect(runnerService.run).not.toHaveBeenCalled();
  });

  it('should throw error when jobId is missing', async () => {
    const mockJob = {
      id: 'job-id-3',
      name: 'review',
      data: {},
    } as unknown as Job;

    await expect(processor.process(mockJob)).rejects.toThrow(
      'Missing jobId in job data',
    );
    expect(runnerService.run).not.toHaveBeenCalled();
  });

  it('should re-throw error when runnerService throws', async () => {
    const mockJob = {
      id: 'job-id-4',
      name: 'review',
      data: { jobId: 'job-123' },
    } as unknown as Job;

    const error = new Error('Runner failed');
    runnerService.run.mockRejectedValue(error);

    await expect(processor.process(mockJob)).rejects.toThrow('Runner failed');
  });
});
