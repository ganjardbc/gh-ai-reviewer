import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database';
import { Prisma, ai_review_projects } from '@prisma/client';

@Injectable()
export class AiReviewProjectRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ai_review_projectsCreateInput): Promise<ai_review_projects> {
    return this.prisma.ai_review_projects.create({ data });
  }

  async findById(id: string): Promise<ai_review_projects | null> {
    return this.prisma.ai_review_projects.findUnique({
      where: { id },
    });
  }

  async findByGitlabProjectId(gitlabProjectId: string): Promise<ai_review_projects | null> {
    return this.prisma.ai_review_projects.findUnique({
      where: { gitlab_project_id: gitlabProjectId },
    });
  }

  async update(id: string, data: Prisma.ai_review_projectsUpdateInput): Promise<ai_review_projects> {
    return this.prisma.ai_review_projects.update({
      where: { id },
      data,
    });
  }

  async list(merchantId?: string): Promise<ai_review_projects[]> {
    if (merchantId) {
      return this.prisma.ai_review_projects.findMany({
        where: { merchant_id: merchantId },
        orderBy: { created_at: 'desc' },
      });
    }
    return this.prisma.ai_review_projects.findMany({
      orderBy: { created_at: 'desc' },
    });
  }
}
