import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database';
import { Prisma, ai_review_jobs, AiReviewJobStatus } from '@prisma/client';

@Injectable()
export class AiReviewJobRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.ai_review_jobsUncheckedCreateInput,
  ): Promise<ai_review_jobs> {
    return this.prisma.ai_review_jobs.create({ data });
  }

  async findById(id: string): Promise<ai_review_jobs | null> {
    return this.prisma.ai_review_jobs.findUnique({
      where: { id },
      include: {
        ai_review_findings: true,
      },
    });
  }

  async updateStatus(
    id: string,
    status: AiReviewJobStatus,
    extras?: Partial<Omit<Prisma.ai_review_jobsUpdateInput, 'status'>>,
  ): Promise<ai_review_jobs> {
    return this.prisma.ai_review_jobs.update({
      where: { id },
      data: {
        status,
        ...extras,
      },
    });
  }

  async listByProject(projectId: string): Promise<ai_review_jobs[]> {
    return this.prisma.ai_review_jobs.findMany({
      where: { ai_review_project_id: projectId },
      orderBy: { created_at: 'desc' },
    });
  }
}
