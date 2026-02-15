import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RateLimitDecision } from 'src/lib';

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);

  private readonly shortWindowMs: number;
  private readonly shortWindowLimit: number;
  private readonly longWindowMs: number;
  private readonly longWindowLimit: number;
  private readonly blockedWindowMs: number;
  private readonly notifyCooldownMs: number;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {
    this.shortWindowMs = parseInt(process.env.RATE_LIMIT_SHORT_WINDOW_MS || '30000');
    this.shortWindowLimit = parseInt(process.env.RATE_LIMIT_SHORT_WINDOW_LIMIT || '10');
    this.longWindowMs = parseInt(process.env.RATE_LIMIT_LONG_WINDOW_MS || '600000');
    this.longWindowLimit = parseInt(process.env.RATE_LIMIT_LONG_WINDOW_LIMIT || '30');
    this.blockedWindowMs = parseInt(process.env.RATE_LIMIT_BLOCK_WINDOW_MS || '180000');
    this.notifyCooldownMs = parseInt(process.env.RATE_LIMIT_NOTIFY_COOLDOWN_MS || '60000');
  }

  async evaluateInboundMessage(waId: string): Promise<RateLimitDecision> {
    const now = Date.now();
    const blockState = await this.cacheManager.get<{ blockedUntil: number }>(
      this.blockedKey(waId),
    );

    if (blockState && blockState.blockedUntil > now) {
      const retryAfterSeconds = Math.ceil(
        (blockState.blockedUntil - now) / 1000,
      );
      return {
        allowed: false,
        retryAfterSeconds,
        shouldNotify: await this.shouldNotify(waId, now),
      };
    }

    const history =
      (await this.cacheManager.get<number[]>(this.historyKey(waId))) ?? [];
    const prunedHistory = history.filter(
      (timestamp) => now - timestamp <= this.longWindowMs,
    );

    const shortWindowCount = prunedHistory.filter(
      (timestamp) => now - timestamp <= this.shortWindowMs,
    ).length;

    const longWindowCount = prunedHistory.length;

    if (
      shortWindowCount >= this.shortWindowLimit ||
      longWindowCount >= this.longWindowLimit
    ) {
      const blockedUntil = now + this.blockedWindowMs;

      await this.cacheManager.set(
        this.blockedKey(waId),
        { blockedUntil },
        this.blockedWindowMs,
      );
      await this.cacheManager.set(
        this.historyKey(waId),
        prunedHistory,
        this.longWindowMs,
      );

      this.logger.warn(
        `Rate limit activado para ${waId}. short=${shortWindowCount}/${this.shortWindowLimit} long=${longWindowCount}/${this.longWindowLimit}`,
      );

      return {
        allowed: false,
        retryAfterSeconds: Math.ceil(this.blockedWindowMs / 1000),
        shouldNotify: await this.shouldNotify(waId, now),
      };
    }

    prunedHistory.push(now);
    await this.cacheManager.set(
      this.historyKey(waId),
      prunedHistory,
      this.longWindowMs,
    );

    return {
      allowed: true,
      retryAfterSeconds: 0,
      shouldNotify: false,
    };
  }

  private async shouldNotify(waId: string, now: number): Promise<boolean> {
    const lastNotifiedAt = await this.cacheManager.get<number>(
      this.notifyKey(waId),
    );

    if (lastNotifiedAt && now - lastNotifiedAt < this.notifyCooldownMs) {
      return false;
    }

    await this.cacheManager.set(
      this.notifyKey(waId),
      now,
      this.notifyCooldownMs,
    );
    return true;
  }

  private historyKey(waId: string): string {
    return `rate-limit:history:${waId}`;
  }

  private blockedKey(waId: string): string {
    return `rate-limit:blocked:${waId}`;
  }

  private notifyKey(waId: string): string {
    return `rate-limit:notify:${waId}`;
  }
}
