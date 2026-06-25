import { Controller, Post, Body, Headers } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { GitlabWebhookService } from './gitlab-webhook.service';

@ApiTags('Webhooks')
@Controller('webhooks/gitlab')
export class GitlabWebhookController {
  constructor(private readonly webhookService: GitlabWebhookService) {}

  @Public()
  @Post('merge-request')
  async handleMergeRequest(
    @Headers('x-gitlab-token') token: string,
    @Body() payload: any,
  ) {
    return this.webhookService.handleWebhook(token, payload);
  }
}
