import { PipelineFailedException } from './pipeline-failed.exception';

describe('PipelineFailedException', () => {
  it('should be defined', () => {
    expect(new PipelineFailedException('Failed')).toBeDefined();
  });

  it('should have standard response format', () => {
    const errorMsg = 'LLM timeout';
    const innerError = new Error('Connection refused');
    const exception = new PipelineFailedException(errorMsg, innerError);

    expect(exception.getStatus()).toBe(500);
    const response: any = exception.getResponse();
    expect(response.message).toBe(errorMsg);
    expect(response.error).toBe(innerError.message);
    expect(response.stack).toBe(innerError.stack);
  });
});
