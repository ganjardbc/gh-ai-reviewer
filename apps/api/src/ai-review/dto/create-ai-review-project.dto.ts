import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { AiReviewReviewMode } from '@prisma/client';

export class CreateAiReviewProjectDto {
  @ApiProperty({
    example: 'My GitLab Repository',
    description: 'Name of the project review configuration',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({
    example: 'https://gitlab.com',
    description: 'GitLab base URL',
    default: 'https://gitlab.com',
  })
  @IsOptional()
  @IsString()
  gitlab_base_url?: string = 'https://gitlab.com';

  @ApiProperty({ example: '123456', description: 'GitLab project ID' })
  @IsNotEmpty()
  @IsString()
  gitlab_project_id: string;

  @ApiProperty({
    example: 'my-org/my-project',
    description: 'GitLab project namespace and name',
  })
  @IsNotEmpty()
  @IsString()
  gitlab_project_path: string;

  @ApiProperty({
    example: 'supersecretwebhooktoken',
    description: 'GitLab webhook token',
  })
  @IsNotEmpty()
  @IsString()
  webhook_secret: string;

  @ApiProperty({
    example: 'glpat-xxx',
    description: 'GitLab Personal/Project Access Token',
  })
  @IsNotEmpty()
  @IsString()
  access_token: string;

  @ApiPropertyOptional({
    example: 'main',
    description: 'Default branch to monitor',
    default: 'main',
  })
  @IsOptional()
  @IsString()
  default_branch?: string = 'main';

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the review mapping is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean = true;

  @ApiPropertyOptional({
    example: true,
    description: 'Enable automatic review triggering on MR hook',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  auto_review_enabled?: boolean = true;

  @ApiPropertyOptional({
    example: 'DIFF_ONLY',
    description: 'Mode of review',
    enum: AiReviewReviewMode,
    default: 'DIFF_ONLY',
  })
  @IsOptional()
  @IsEnum(AiReviewReviewMode)
  review_mode?: AiReviewReviewMode = 'DIFF_ONLY';

  @ApiPropertyOptional({
    example: 30,
    description: 'Maximum changed files cap',
    default: 30,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  max_changed_files?: number = 30;

  @ApiPropertyOptional({
    example: 120000,
    description: 'Maximum patch characters cap',
    default: 120000,
  })
  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(500000)
  max_patch_chars?: number = 120000;

  @ApiPropertyOptional({
    example: ['dist/**', '*.lock'],
    description: 'Glob patterns to ignore',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ignore_patterns?: string[];
}
