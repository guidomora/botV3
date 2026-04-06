import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { CacheService } from './cache.service';

@Injectable()
export class CacheMonitorService implements OnModuleInit, OnModuleDestroy {
  private static readonly MONITOR_INTERVAL_MS = 300_000;
  private static readonly BYTES_IN_MB = 1024 * 1024;

  private readonly logger = new Logger(CacheMonitorService.name);
  private intervalRef: NodeJS.Timeout | null = null;

  constructor(private readonly cacheService: CacheService) {}

  onModuleInit(): void {
    this.intervalRef = setInterval(() => {
      this.logCacheStatus();
    }, CacheMonitorService.MONITOR_INTERVAL_MS);

    this.intervalRef.unref?.();
  }

  onModuleDestroy(): void {
    if (!this.intervalRef) {
      return;
    }

    clearInterval(this.intervalRef);
    this.intervalRef = null;
  }

  private logCacheStatus(): void {
    const snapshot = this.cacheService.getMonitoringSnapshot();
    const memoryUsage = process.memoryUsage();
    const rssMb = this.toMb(memoryUsage.rss);
    const heapUsedMb = this.toMb(memoryUsage.heapUsed);
    const estimatedAvailableMemoryMb = this.getEstimatedAvailableMemoryMb();
    const estimatedTotalMemoryMb = rssMb + estimatedAvailableMemoryMb;
    const memoryUsagePercent =
      estimatedTotalMemoryMb > 0 ? (rssMb / estimatedTotalMemoryMb) * 100 : 0;

    this.logger.log(
      `Cache monitor | activeConversations=${snapshot.activeConversations} totalMessagesInCache=${snapshot.totalMessagesInCache} rssMB=${rssMb.toFixed(2)} heapUsedMB=${heapUsedMb.toFixed(2)} estimatedAvailableMemoryMB=${estimatedAvailableMemoryMb.toFixed(2)} memoryUsagePercent=${memoryUsagePercent.toFixed(2)}`,
    );
  }

  private getEstimatedAvailableMemoryMb(): number {
    if (typeof process.availableMemory === 'function') {
      return this.toMb(process.availableMemory());
    }

    return 0;
  }

  private toMb(valueInBytes: number): number {
    return valueInBytes / CacheMonitorService.BYTES_IN_MB;
  }
}
