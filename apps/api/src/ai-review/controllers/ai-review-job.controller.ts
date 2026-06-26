import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AiReviewJobService } from '../services/ai-review-job.service';
import { ListJobsDto } from '../dto/list-jobs.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../../common/guards/permission.guard';

@ApiTags('AI Review Jobs')
@ApiBearerAuth()
@Controller('ai-review/jobs')
@UseGuards(PermissionGuard)
export class AiReviewJobController {
  constructor(private readonly jobService: AiReviewJobService) {}

  @Get()
  @RequirePermission('ai_review.jobs.read')
  @ApiOperation({
    summary: 'List and filter review jobs for the current merchant',
  })
  @ApiResponse({ status: 200, description: 'Return paginated list of jobs' })
  findAll(
    @CurrentUser('merchant_id') merchantId: string,
    @Query() query: ListJobsDto,
  ) {
    return this.jobService.findAll(merchantId, query);
  }

  @Get(':id')
  @RequirePermission('ai_review.jobs.read')
  @ApiOperation({
    summary: 'Get details of a specific review job with its findings',
  })
  @ApiResponse({ status: 200, description: 'Return job detail' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  findOne(
    @Param('id') id: string,
    @CurrentUser('merchant_id') merchantId: string,
  ) {
    return this.jobService.findOne(id, merchantId);
  }
}
