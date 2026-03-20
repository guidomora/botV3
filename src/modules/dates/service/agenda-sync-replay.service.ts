import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AgendaSyncReplayService {
  private readonly logger = new Logger(AgendaSyncReplayService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async isReplayRequest(signature: string, ttlMs: number): Promise<boolean> {
    const cacheKey = this.buildReplayKey(signature);
    const alreadyProcessed = await this.cacheManager.get<boolean>(cacheKey);

    if (alreadyProcessed) {
      this.logger.warn('Replay detectado para endpoint de sincronizacion de agenda');
      return true;
    }

    await this.cacheManager.set(cacheKey, true, ttlMs);
    return false;
  }

  private buildReplayKey(signature: string): string {
    return `agenda-sync:replay:${signature}`;
  }
}
