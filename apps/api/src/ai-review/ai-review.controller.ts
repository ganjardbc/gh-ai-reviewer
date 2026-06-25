import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AiReviewService } from './ai-review.service';

@ApiTags('AI Review')
@Controller('ai-review')
export class AiReviewController {
  constructor(private readonly aiReviewService: AiReviewService) {}
}
