import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database';
import { Prisma, ai_review_findings } from '@prisma/client';

@Injectable()
export class AiReviewFindingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(
    aiReviewJobId: string,
    findings: Omit<
      Prisma.ai_review_findingsUncheckedCreateInput,
      'ai_review_job_id'
    >[],
  ): Promise<Prisma.BatchPayload> {
    const data = findings.map((f) => ({
      ...f,
      ai_review_job_id: aiReviewJobId,
    }));
    return this.prisma.ai_review_findings.createMany({
      data,
    });
  }

  async listByJob(jobId: string): Promise<ai_review_findings[]> {
    return this.prisma.ai_review_findings.findMany({
      where: { ai_review_job_id: jobId },
      orderBy: { created_at: 'asc' },
    });
  }
}
