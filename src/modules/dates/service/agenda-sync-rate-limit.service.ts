import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class AgendaSyncRateLimitService {
  private readonly defaultWindowMs: number;
  private readonly defaultMaxRequests: number;
  private readonly manualWindowMs: number;
  private readonly manualMaxRequests: number;

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {
    this.defaultWindowMs = parseInt(process.env.AGENDA_SYNC_RATE_LIMIT_WINDOW_MS || '300000');
    this.defaultMaxRequests = parseInt(process.env.AGENDA_SYNC_RATE_LIMIT_MAX_REQUESTS || '6');
    this.manualWindowMs = parseInt(process.env.DATES_MANUAL_RATE_LIMIT_WINDOW_MS || '60000');
    this.manualMaxRequests = parseInt(process.env.DATES_MANUAL_RATE_LIMIT_MAX_REQUESTS || '1');
  }

  async isLimitExceeded(scope: string, now = Date.now()): Promise<boolean> {
    const { windowMs, maxRequests } = this.getPolicyByScope(scope);
    const cacheKey = this.buildRateLimitKey(scope);
    const requestHistory = (await this.cacheManager.get<number[]>(cacheKey)) ?? [];
    const prunedHistory = requestHistory.filter((timestamp) => now - timestamp <= windowMs);

    if (prunedHistory.length >= maxRequests) {
      await this.cacheManager.set(cacheKey, prunedHistory, windowMs);
      return true;
    }

    prunedHistory.push(now);
    await this.cacheManager.set(cacheKey, prunedHistory, windowMs);
    return false;
  }

  private buildRateLimitKey(scope: string): string {
    return `agenda-sync:rate-limit:${scope}`;
  }

  private getPolicyByScope(scope: string): { windowMs: number; maxRequests: number } {
    if (scope.startsWith('dates-manual:')) {
      return {
        windowMs: this.manualWindowMs,
        maxRequests: this.manualMaxRequests,
      };
    }

    return {
      windowMs: this.defaultWindowMs,
      maxRequests: this.defaultMaxRequests,
    };
  }
}
