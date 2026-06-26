import { PaginationDto } from '../../common/dto/pagination.dto';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { AiReviewJobStatus } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListJobsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by AI Review Project ID' })
  @IsOptional()
  @IsString()
  project_id?: string;

  @ApiPropertyOptional({
    description: 'Filter by Job Status',
    enum: AiReviewJobStatus,
  })
  @IsOptional()
  @IsEnum(AiReviewJobStatus)
  status?: AiReviewJobStatus;
}
