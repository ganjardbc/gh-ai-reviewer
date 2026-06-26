import { Controller, Post, Body, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { GitlabWebhookService } from './gitlab-webhook.service';

@ApiTags('Webhooks')
@Controller('webhooks/gitlab')
export class GitlabWebhookController {
  constructor(private readonly webhookService: GitlabWebhookService) {}

  @Public()
  @Post('merge-request')
  @ApiOperation({
    summary: 'GitLab Merge Request webhook receiver',
    description:
      'Processes GitLab merge request event webhooks, verifies the token, creates a job, and enqueues it if automatic review is enabled.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Webhook processed successfully, job created and optionally queued.',
  })
  @ApiResponse({
    status: 400,
    description: 'Malformed payload or missing project identity.',
  })
  @ApiResponse({
    status: 401,
    description: 'Webhook token mismatch/unauthorized.',
  })
  @ApiResponse({
    status: 404,
    description: 'AI Review project configuration not found.',
  })
  async handleMergeRequest(
    @Headers('x-gitlab-token') token: string,
    @Body() payload: any,
  ) {
    return this.webhookService.handleWebhook(token, payload);
  }
}
