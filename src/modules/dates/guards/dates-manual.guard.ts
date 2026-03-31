import { Injectable } from '@nestjs/common';
import { AgendaSyncGuard } from './agenda-sync.guard';

@Injectable()
export class DatesManualGuard extends AgendaSyncGuard {
  protected override getEndpointLabel(): string {
    return 'manual de dates';
  }

  protected override buildRateLimitScope(requestPath: string): string {
    return `dates-manual:${requestPath}`;
  }

  protected override getRateLimitExceededMessage(): string {
    return 'Manual dates endpoint rate limit exceeded';
  }
}
