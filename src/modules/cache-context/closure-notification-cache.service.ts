import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CacheTypeEnum,
  ClosureNotificationOperationState,
  ClosureNotificationState,
} from 'src/lib';

@Injectable()
export class ClosureNotificationCacheService {
  private readonly logger = new Logger(ClosureNotificationCacheService.name);
  private readonly HARD_LIMIT_TTL_MS = 6 * 60 * 60 * 1000;

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  private key(id: string, prefix: string): string {
    return `${prefix}${id}`;
  }

  async getClosureNotificationState(
    notificationKey: string,
  ): Promise<ClosureNotificationState | null> {
    const key = this.key(notificationKey, CacheTypeEnum.CLOSURE_NOTIFICATION);
    const data = await this.cacheManager.get<ClosureNotificationState>(key);
    this.logger.log(`Cache closure notification state for ${notificationKey}`);
    return data ?? null;
  }

  async setClosureNotificationState(
    notificationKey: string,
    state: ClosureNotificationState,
  ): Promise<void> {
    const key = this.key(notificationKey, CacheTypeEnum.CLOSURE_NOTIFICATION);
    await this.cacheManager.set(key, state, this.HARD_LIMIT_TTL_MS);
    this.logger.log(`Cache set closure notification state for ${notificationKey}`);
  }

  async getClosureNotificationOperationState(
    operationId: string,
  ): Promise<ClosureNotificationOperationState | null> {
    const key = this.key(operationId, CacheTypeEnum.CLOSURE_NOTIFICATION_OPERATION);
    const data = await this.cacheManager.get<ClosureNotificationOperationState>(key);
    this.logger.log(`Cache closure notification operation state for ${operationId}`);
    return data ?? null;
  }

  async setClosureNotificationOperationState(
    operationId: string,
    state: ClosureNotificationOperationState,
  ): Promise<void> {
    const key = this.key(operationId, CacheTypeEnum.CLOSURE_NOTIFICATION_OPERATION);
    await this.cacheManager.set(key, state, this.HARD_LIMIT_TTL_MS);
    this.logger.log(`Cache set closure notification operation state for ${operationId}`);
  }

  async getClosureNotificationMessageOperationId(messageSid: string): Promise<string | null> {
    const key = this.key(messageSid, CacheTypeEnum.CLOSURE_NOTIFICATION_MESSAGE);
    const data = await this.cacheManager.get<string>(key);
    this.logger.log(`Cache closure notification message operation for ${messageSid}`);
    return data ?? null;
  }

  async setClosureNotificationMessageOperationId(
    messageSid: string,
    operationId: string,
  ): Promise<void> {
    const key = this.key(messageSid, CacheTypeEnum.CLOSURE_NOTIFICATION_MESSAGE);
    await this.cacheManager.set(key, operationId, this.HARD_LIMIT_TTL_MS);
    this.logger.log(`Cache set closure notification message operation for ${messageSid}`);
  }
}
