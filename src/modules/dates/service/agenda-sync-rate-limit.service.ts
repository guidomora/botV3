import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class AgendaSyncRateLimitService {
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {
    this.windowMs = parseInt(process.env.AGENDA_SYNC_RATE_LIMIT_WINDOW_MS || '300000');
    this.maxRequests = parseInt(process.env.AGENDA_SYNC_RATE_LIMIT_MAX_REQUESTS || '6');
  }

  async isLimitExceeded(scope: string, now = Date.now()): Promise<boolean> {
    const cacheKey = this.buildRateLimitKey(scope);
    const requestHistory = (await this.cacheManager.get<number[]>(cacheKey)) ?? [];
    const prunedHistory = requestHistory.filter((timestamp) => now - timestamp <= this.windowMs);

    if (prunedHistory.length >= this.maxRequests) {
      await this.cacheManager.set(cacheKey, prunedHistory, this.windowMs);
      return true;
    }

    prunedHistory.push(now);
    await this.cacheManager.set(cacheKey, prunedHistory, this.windowMs);
    return false;
  }

  private buildRateLimitKey(scope: string): string {
    return `agenda-sync:rate-limit:${scope}`;
  }
}
