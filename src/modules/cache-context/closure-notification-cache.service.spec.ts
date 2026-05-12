import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import {
  CacheTypeEnum,
  type ClosureNotificationOperationState,
  type ClosureNotificationState,
} from 'src/lib';
import { createCacheManagerMock } from './test/mocks/dependency-mocks';
import { ClosureNotificationCacheService } from './closure-notification-cache.service';

describe('ClosureNotificationCacheService', () => {
  const now = 1_700_000_000_000;
  const notificationId = 'day:2026-04-16:21-00:5491112345678';
  const operationId = 'op-123';
  const messageSid = 'SM123';
  const hardLimitTtlMs = 6 * 60 * 60 * 1000;

  let module: TestingModule;
  let service: ClosureNotificationCacheService;
  let cacheManager = createCacheManagerMock();

  beforeEach(async () => {
    jest.clearAllMocks();
    cacheManager = createCacheManagerMock();

    module = await Test.createTestingModule({
      providers: [
        ClosureNotificationCacheService,
        {
          provide: CACHE_MANAGER,
          useValue: cacheManager,
        },
      ],
    }).compile();

    service = module.get(ClosureNotificationCacheService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('stores closure notification state with hard limit ttl', async () => {
    const state = {
      status: 'sent',
      sentAt: now,
    } satisfies ClosureNotificationState;

    await service.setClosureNotificationState(notificationId, state);

    await expect(service.getClosureNotificationState(notificationId)).resolves.toEqual(state);
    expect(
      cacheManager.store.get(`${CacheTypeEnum.CLOSURE_NOTIFICATION}${notificationId}`),
    ).toEqual({
      value: state,
      ttl: hardLimitTtlMs,
    });
  });

  it('stores operation state and message to operation mapping with hard limit ttl', async () => {
    const operation = {
      operationId,
      isCompleted: false,
      totalNotifications: 2,
      processedNotifications: 1,
      failedNotifications: [],
    } satisfies ClosureNotificationOperationState;

    await service.setClosureNotificationOperationState(operationId, operation);
    await service.setClosureNotificationMessageOperationId(messageSid, operationId);

    await expect(service.getClosureNotificationOperationState(operationId)).resolves.toEqual(
      operation,
    );
    await expect(service.getClosureNotificationMessageOperationId(messageSid)).resolves.toBe(
      operationId,
    );
    expect(
      cacheManager.store.get(`${CacheTypeEnum.CLOSURE_NOTIFICATION_OPERATION}${operationId}`)?.ttl,
    ).toBe(hardLimitTtlMs);
    expect(
      cacheManager.store.get(`${CacheTypeEnum.CLOSURE_NOTIFICATION_MESSAGE}${messageSid}`)?.ttl,
    ).toBe(hardLimitTtlMs);
  });
});
