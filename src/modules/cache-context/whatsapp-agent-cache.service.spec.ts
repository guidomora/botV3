import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { CacheTypeEnum, FlowLifecycleStatus, Intention, RoleEnum } from 'src/lib';
import { DatesService } from '../dates/service/dates.service';
import { ConversationExpirationNotifierService } from './conversation-expiration-notifier.service';
import {
  createCacheManagerMock,
  createConversationExpirationNotifierMock,
  createDatesServiceMock,
} from './test/mocks/dependency-mocks';
import { WhatsappAgentCacheService } from './whatsapp-agent-cache.service';

describe('WhatsappAgentCacheService', () => {
  const waId = '5491112345678';
  const lifecycleKey = `lifecycle:${waId}`;
  const historyKey = `${CacheTypeEnum.DATA}${waId}`;
  const now = 1_700_000_000_000;

  let module: TestingModule;
  let service: WhatsappAgentCacheService;
  let cacheManager = createCacheManagerMock();
  let datesService = createDatesServiceMock();
  let expirationNotifier = createConversationExpirationNotifierMock();

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
    jest.clearAllMocks();

    cacheManager = createCacheManagerMock();
    datesService = createDatesServiceMock();
    expirationNotifier = createConversationExpirationNotifierMock();

    module = await Test.createTestingModule({
      providers: [
        WhatsappAgentCacheService,
        {
          provide: CACHE_MANAGER,
          useValue: cacheManager,
        },
        {
          provide: DatesService,
          useValue: datesService,
        },
        {
          provide: ConversationExpirationNotifierService,
          useValue: expirationNotifier,
        },
      ],
    }).compile();

    service = module.get(WhatsappAgentCacheService);
  });

  afterEach(async () => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    await module.close();
  });

  it('stores WhatsApp history with lifecycle ttl and monitoring counters', async () => {
    await service.appendEntityMessage(waId, 'hola', RoleEnum.USER, Intention.CREATE);
    await service.appendEntityMessage(waId, 'necesito reservar', RoleEnum.ASSISTANT);

    await expect(service.getHistory(waId)).resolves.toEqual([
      { role: RoleEnum.USER, content: 'hola', intention: Intention.CREATE },
      { role: RoleEnum.ASSISTANT, content: 'necesito reservar' },
    ]);
    expect(cacheManager.store.get(lifecycleKey)?.ttl).toBe(6 * 60 * 60 * 1000);
    expect(cacheManager.store.get(historyKey)?.ttl).toBe(3 * 60 * 60 * 1000);
    expect(service.getMonitoringSnapshot()).toEqual({
      activeConversations: 1,
      totalMessagesInCache: 2,
    });
  });

  it('expires in-progress WhatsApp conversations and cleans temporal reservation state', async () => {
    await service.appendEntityMessage(waId, 'hola', RoleEnum.USER);

    await jest.advanceTimersByTimeAsync(3 * 60 * 60 * 1000);

    expect(cacheManager.store.has(lifecycleKey)).toBe(false);
    expect(cacheManager.store.has(historyKey)).toBe(false);
    expect(datesService.deleteIncompleteTemporalReservationByWaId.mock.calls).toEqual([[waId]]);
    expect(expirationNotifier.sendConversationExpiredMessage.mock.calls).toEqual([
      [waId, FlowLifecycleStatus.IN_PROGRESS],
    ]);
  });
});
