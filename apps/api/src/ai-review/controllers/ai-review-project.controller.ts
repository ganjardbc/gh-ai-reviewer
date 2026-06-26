import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AiReviewProjectService } from '../services/ai-review-project.service';
import { CreateAiReviewProjectDto } from '../dto/create-ai-review-project.dto';
import { UpdateAiReviewProjectDto } from '../dto/update-ai-review-project.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../../common/guards/permission.guard';

@ApiTags('AI Review Projects')
@ApiBearerAuth()
@Controller('ai-review/projects')
@UseGuards(PermissionGuard)
export class AiReviewProjectController {
  constructor(private readonly projectService: AiReviewProjectService) {}

  @Post()
  @RequirePermission('ai_review.projects.create')
  @ApiOperation({ summary: 'Bind a new GitLab project for AI code review' })
  @ApiResponse({ status: 201, description: 'Project configured successfully' })
  create(
    @Body() dto: CreateAiReviewProjectDto,
    @CurrentUser('merchant_id') merchantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.projectService.create(dto, merchantId, userId);
  }

  @Get()
  @RequirePermission('ai_review.projects.read')
  @ApiOperation({
    summary: 'List all review projects for the current merchant',
  })
  @ApiResponse({ status: 200, description: 'List of review projects' })
  findAll(@CurrentUser('merchant_id') merchantId: string) {
    return this.projectService.findAll(merchantId);
  }

  @Get(':id')
  @RequirePermission('ai_review.projects.read')
  @ApiOperation({ summary: 'Get details of a specific review project' })
  @ApiResponse({ status: 200, description: 'Review project details' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  findOne(
    @Param('id') id: string,
    @CurrentUser('merchant_id') merchantId: string,
  ) {
    return this.projectService.findOne(id, merchantId);
  }

  @Patch(':id')
  @RequirePermission('ai_review.projects.update')
  @ApiOperation({ summary: 'Update a specific review project configuration' })
  @ApiResponse({ status: 200, description: 'Project updated successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAiReviewProjectDto,
    @CurrentUser('merchant_id') merchantId: string,
  ) {
    return this.projectService.update(id, dto, merchantId);
  }

  @Delete(':id')
  @RequirePermission('ai_review.projects.delete')
  @ApiOperation({ summary: 'Unbind and delete a specific review project' })
  @ApiResponse({ status: 200, description: 'Project deleted successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  remove(
    @Param('id') id: string,
    @CurrentUser('merchant_id') merchantId: string,
  ) {
    return this.projectService.remove(id, merchantId);
  }
}
