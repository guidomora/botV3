import { Logger } from '@nestjs/common';
import { type CacheMonitorSnapshot } from 'src/lib';
import { CacheMonitorService } from './cache-monitor.service';
import { CacheService } from './cache.service';

describe('CacheMonitorService', () => {
  const rssBytes = 256 * 1024 * 1024;
  const heapUsedBytes = 128 * 1024 * 1024;
  const availableBytes = 512 * 1024 * 1024;

  let service: CacheMonitorService;
  let cacheService: jest.Mocked<Pick<CacheService, 'getMonitoringSnapshot'>>;
  let loggerLogSpy: jest.SpyInstance;
  let memoryUsageSpy: jest.SpyInstance;
  let availableMemorySpy: jest.SpyInstance | null;
  let originalAvailableMemoryDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    originalAvailableMemoryDescriptor = Object.getOwnPropertyDescriptor(process, 'availableMemory');

    cacheService = {
      getMonitoringSnapshot: jest.fn<CacheMonitorSnapshot, []>(() => ({
        activeConversations: 3,
        totalMessagesInCache: 12,
      })),
    };

    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    memoryUsageSpy = jest.spyOn(process, 'memoryUsage').mockReturnValue({
      rss: rssBytes,
      heapTotal: rssBytes,
      heapUsed: heapUsedBytes,
      external: 0,
      arrayBuffers: 0,
    });
    if (typeof process.availableMemory !== 'function') {
      Object.defineProperty(process, 'availableMemory', {
        configurable: true,
        value: jest.fn(() => availableBytes),
      });
      availableMemorySpy = null;
    } else {
      availableMemorySpy = jest.spyOn(process, 'availableMemory').mockReturnValue(availableBytes);
    }

    service = new CacheMonitorService(cacheService as unknown as CacheService);
  });

  afterEach(() => {
    service.onModuleDestroy();
    availableMemorySpy?.mockRestore();
    if (originalAvailableMemoryDescriptor) {
      Object.defineProperty(process, 'availableMemory', originalAvailableMemoryDescriptor);
    } else {
      Reflect.deleteProperty(process, 'availableMemory');
    }
    memoryUsageSpy.mockRestore();
    loggerLogSpy.mockRestore();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should log cache usage every 300 seconds', async () => {
    service.onModuleInit();

    await jest.advanceTimersByTimeAsync(300_000);

    expect(cacheService.getMonitoringSnapshot).toHaveBeenCalledTimes(1);
    expect(memoryUsageSpy).toHaveBeenCalledTimes(1);
    expect(loggerLogSpy).toHaveBeenCalledWith(
      'Cache monitor | activeConversations=3 totalMessagesInCache=12 rssMB=256.00 heapUsedMB=128.00 estimatedAvailableMemoryMB=512.00 memoryUsagePercent=33.33',
    );
  });

  it('should stop logging when module is destroyed', async () => {
    service.onModuleInit();
    service.onModuleDestroy();

    await jest.advanceTimersByTimeAsync(300_000);

    expect(cacheService.getMonitoringSnapshot).not.toHaveBeenCalled();
    expect(loggerLogSpy).not.toHaveBeenCalled();
  });
});
