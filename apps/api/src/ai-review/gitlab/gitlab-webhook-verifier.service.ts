import { Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class GitlabWebhookVerifierService {
  verify(incomingToken: string, storedSecret: string): void {
    if (!incomingToken || incomingToken !== storedSecret) {
      throw new UnauthorizedException('Invalid webhook token');
    }
  }
}
