import { UnauthorizedException } from '@nestjs/common';
import { GitlabWebhookVerifierService } from './gitlab-webhook-verifier.service';

describe('GitlabWebhookVerifierService', () => {
  let service: GitlabWebhookVerifierService;

  beforeEach(() => {
    service = new GitlabWebhookVerifierService();
  });

  it('should pass validation when tokens match', () => {
    expect(() => service.verify('correct-token', 'correct-token')).not.toThrow();
  });

  it('should throw UnauthorizedException when tokens mismatch', () => {
    expect(() => service.verify('wrong-token', 'correct-token')).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when incoming token is empty', () => {
    expect(() => service.verify('', 'correct-token')).toThrow(UnauthorizedException);
  });
});
