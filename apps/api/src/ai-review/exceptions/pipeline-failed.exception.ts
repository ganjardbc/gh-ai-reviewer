import { InternalServerErrorException } from '@nestjs/common';

export class PipelineFailedException extends InternalServerErrorException {
  constructor(message: string, error?: any) {
    super({
      message: message || 'AI review pipeline execution failed',
      error: error?.message || error,
      stack: error?.stack,
    });
  }
}
