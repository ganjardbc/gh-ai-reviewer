import { plainToInstance } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

export class EnvironmentVariables {
  @IsNotEmpty({ message: 'NINE_ROUTER_API_KEY must not be empty' })
  @IsString()
  NINE_ROUTER_API_KEY: string;

  @IsOptional()
  @IsString()
  NINE_ROUTER_BASE_URL: string = 'https://api.9router.com';

  @IsOptional()
  @IsString()
  AI_REVIEW_LLM_MODEL: string = 'gpt-4o';
}

export function validateConfig(config: Record<string, any>) {
  const rawConfig = {
    ...config,
    NINE_ROUTER_BASE_URL:
      config.NINE_ROUTER_BASE_URL || 'https://api.9router.com',
    AI_REVIEW_LLM_MODEL: config.AI_REVIEW_LLM_MODEL || 'gpt-4o',
  };

  const validatedConfig = plainToInstance(EnvironmentVariables, rawConfig, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Config validation error: ${errors
        .map((e) => Object.values(e.constraints || {}).join(', '))
        .join('; ')}`,
    );
  }
  return validatedConfig;
}
