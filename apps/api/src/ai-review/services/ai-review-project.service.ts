import { Injectable, NotFoundException } from '@nestjs/common';
import { AiReviewProjectRepository } from '../repositories/ai-review-project.repository';
import { CreateAiReviewProjectDto } from '../dto/create-ai-review-project.dto';
import { UpdateAiReviewProjectDto } from '../dto/update-ai-review-project.dto';
import type { ai_review_projects } from '@prisma/client';
import { SanitizedAiReviewProject } from '@gh-skeleton/shared-types';

@Injectable()
export class AiReviewProjectService {
  constructor(private readonly projectRepo: AiReviewProjectRepository) {}

  private sanitize(project: ai_review_projects): SanitizedAiReviewProject {
    const { access_token: _, webhook_secret: __, ...sanitized } = project;
    return sanitized;
  }

  async create(
    dto: CreateAiReviewProjectDto,
    merchantId: string,
    userId: string,
  ): Promise<SanitizedAiReviewProject> {
    const project = await this.projectRepo.create({
      name: dto.name,
      gitlab_base_url: dto.gitlab_base_url,
      gitlab_project_id: dto.gitlab_project_id,
      gitlab_project_path: dto.gitlab_project_path,
      webhook_secret: dto.webhook_secret,
      access_token: dto.access_token,
      default_branch: dto.default_branch,
      is_active: dto.is_active,
      auto_review_enabled: dto.auto_review_enabled,
      review_mode: dto.review_mode,
      max_changed_files: dto.max_changed_files,
      max_patch_chars: dto.max_patch_chars,
      ignore_patterns: dto.ignore_patterns ? dto.ignore_patterns : [],
      merchant_id: merchantId,
      created_by: userId,
    });
    return this.sanitize(project);
  }

  async findAll(merchantId: string): Promise<SanitizedAiReviewProject[]> {
    const projects = await this.projectRepo.list(merchantId);
    return projects.map((p) => this.sanitize(p));
  }

  async findOne(
    id: string,
    merchantId: string,
  ): Promise<SanitizedAiReviewProject> {
    const project = await this.projectRepo.findById(id);
    if (!project || project.merchant_id !== merchantId) {
      throw new NotFoundException(`AiReviewProject not found: ${id}`);
    }
    return this.sanitize(project);
  }

  async update(
    id: string,
    dto: UpdateAiReviewProjectDto,
    merchantId: string,
  ): Promise<SanitizedAiReviewProject> {
    const project = await this.projectRepo.findById(id);
    if (!project || project.merchant_id !== merchantId) {
      throw new NotFoundException(`AiReviewProject not found: ${id}`);
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.gitlab_base_url !== undefined)
      data.gitlab_base_url = dto.gitlab_base_url;
    if (dto.gitlab_project_id !== undefined)
      data.gitlab_project_id = dto.gitlab_project_id;
    if (dto.gitlab_project_path !== undefined)
      data.gitlab_project_path = dto.gitlab_project_path;
    if (dto.webhook_secret !== undefined)
      data.webhook_secret = dto.webhook_secret;
    if (dto.access_token !== undefined) data.access_token = dto.access_token;
    if (dto.default_branch !== undefined)
      data.default_branch = dto.default_branch;
    if (dto.is_active !== undefined) data.is_active = dto.is_active;
    if (dto.auto_review_enabled !== undefined)
      data.auto_review_enabled = dto.auto_review_enabled;
    if (dto.review_mode !== undefined) data.review_mode = dto.review_mode;
    if (dto.max_changed_files !== undefined)
      data.max_changed_files = dto.max_changed_files;
    if (dto.max_patch_chars !== undefined)
      data.max_patch_chars = dto.max_patch_chars;
    if (dto.ignore_patterns !== undefined)
      data.ignore_patterns = dto.ignore_patterns;

    const updated = await this.projectRepo.update(id, data);
    return this.sanitize(updated);
  }

  async remove(
    id: string,
    merchantId: string,
  ): Promise<SanitizedAiReviewProject> {
    const project = await this.projectRepo.findById(id);
    if (!project || project.merchant_id !== merchantId) {
      throw new NotFoundException(`AiReviewProject not found: ${id}`);
    }
    const deleted = await this.projectRepo.delete(id);
    return this.sanitize(deleted);
  }
}
