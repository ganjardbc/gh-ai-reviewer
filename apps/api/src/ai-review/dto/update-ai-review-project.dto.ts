import { PartialType } from '@nestjs/swagger';
import { CreateAiReviewProjectDto } from './create-ai-review-project.dto';

export class UpdateAiReviewProjectDto extends PartialType(
  CreateAiReviewProjectDto,
) {}
