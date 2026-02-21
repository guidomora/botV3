import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);
  private readonly messageSidTtlMs: number;

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {
    this.messageSidTtlMs = parseInt(process.env.IDEMPOTENCY_MESSAGE_SID_TTL_MS || '86400000');
  }

  async isDuplicateMessage(accountSid: string, messageSid: string): Promise<boolean> {
    const key = this.messageSidKey(accountSid, messageSid);
    const existingEntry = await this.cacheManager.get<boolean>(key);

    if (existingEntry) {
      this.logger.log(
        `Mensaje duplicado detectado para accountSid=${accountSid} messageSid=${messageSid}`,
      );
      return true;
    }

    await this.cacheManager.set(key, true, this.messageSidTtlMs);
    return false;
  }

  private messageSidKey(accountSid: string, messageSid: string): string {
    return `idempotency:message-sid:${accountSid}:${messageSid}`;
  }
}
