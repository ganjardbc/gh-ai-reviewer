import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database';
import { ListJobsDto } from '../dto/list-jobs.dto';
import type { ai_review_jobs } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class AiReviewJobService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    merchantId: string,
    query: ListJobsDto,
  ): Promise<{ data: ai_review_jobs[]; meta: any }> {
    const { page = 1, limit = 10, project_id, status } = query;
    const skip = ((page ?? 1) - 1) * (limit ?? 10);

    const where: any = {
      project: {
        merchant_id: merchantId,
      },
    };

    if (project_id) {
      where.ai_review_project_id = project_id;
    }

    if (status) {
      where.status = status;
    }

    const [jobs, total] = await this.prisma.$transaction([
      this.prisma.ai_review_jobs.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        include: {
          project: {
            select: {
              name: true,
            },
          },
        },
      }),
      this.prisma.ai_review_jobs.count({ where }),
    ]);

    return {
      data: jobs,
      meta: PaginationDto.calculateMeta(total, page ?? 1, limit ?? 10),
    };
  }

  async findOne(id: string, merchantId: string): Promise<any> {
    const job = await this.prisma.ai_review_jobs.findUnique({
      where: { id },
      include: {
        project: true,
        ai_review_findings: true,
      },
    });

    if (!job || job.project.merchant_id !== merchantId) {
      throw new NotFoundException(`AiReviewJob not found: ${id}`);
    }

    return job;
  }
}
