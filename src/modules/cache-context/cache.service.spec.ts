import {
  CacheTypeEnum,
  FlowLifecycleStatus,
  Intention,
  RoleEnum,
  type AffectedReservationState,
  type ChatMessage,
  type ClosureNotificationOperationState,
  type ClosureNotificationState,
  type DeleteReservation,
  type UpdateReservationType,
} from 'src/lib';
import {
  createCacheManagerMock,
  createConversationExpirationNotifierMock,
  createDatesServiceMock,
} from './test/mocks/dependency-mocks';
import { CacheService } from './cache.service';
import { WhatsappAgentCacheService } from './whatsapp-agent-cache.service';
import { ClosureNotificationCacheService } from './closure-notification-cache.service';

describe('CacheService', () => {
  const waId = '5491112345678';
  const lifecycleKey = `lifecycle:${waId}`;
  const historyKey = `${CacheTypeEnum.DATA}${waId}`;
  const cancelKey = `${CacheTypeEnum.CANCEL}${waId}`;
  const updateKey = `${CacheTypeEnum.UPDATE}${waId}`;
  const affectedReservationKey = `${CacheTypeEnum.AFFECTED_RESERVATION}${waId}`;
  const closureNotificationKey = `${CacheTypeEnum.CLOSURE_NOTIFICATION}day:2026-04-16:day:day:jueves-16-de-abril-2026-16-04-2026:21-00:${waId}`;
  const closureNotificationOperationKey = `${CacheTypeEnum.CLOSURE_NOTIFICATION_OPERATION}op-123`;
  const now = 1_700_000_000_000;

  let service: CacheService;
  let cacheManager = createCacheManagerMock();
  let datesService = createDatesServiceMock();
  let expirationNotifier = createConversationExpirationNotifierMock();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
    jest.clearAllMocks();

    cacheManager = createCacheManagerMock();
    datesService = createDatesServiceMock();
    expirationNotifier = createConversationExpirationNotifierMock();

    const whatsappAgentCacheService = new WhatsappAgentCacheService(
      cacheManager,
      datesService,
      expirationNotifier,
    );
    const closureNotificationCacheService = new ClosureNotificationCacheService(cacheManager);
    service = new CacheService(whatsappAgentCacheService, closureNotificationCacheService);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should return empty history when cache does not contain an array', async () => {
    cacheManager.store.set(historyKey, { value: null });

    await expect(service.getHistory(waId)).resolves.toEqual([]);
  });

  it('should append messages, trim history to the last 30 entries and keep incomplete ttl', async () => {
    const existingHistory = Array.from({ length: 30 }, (_, index) => ({
      role: RoleEnum.USER,
      content: `message-${index}`,
    })) satisfies ChatMessage[];

    cacheManager.store.set(historyKey, { value: existingHistory });

    const result = await service.appendMessage(
      waId,
      { role: RoleEnum.ASSISTANT, content: 'last-message' },
      Intention.AVAILABILITY,
    );

    expect(result).toHaveLength(30);
    expect(result[0].content).toBe('message-1');
    expect(result[29]).toEqual({
      role: RoleEnum.ASSISTANT,
      content: 'last-message',
      intention: Intention.AVAILABILITY,
    });
    expect(cacheManager.store.get(lifecycleKey)?.ttl).toBe(6 * 60 * 60 * 1000);
    expect(cacheManager.store.get(historyKey)?.ttl).toBe(3 * 60 * 60 * 1000);
  });

  it('should set completed ttl after markFlowCompleted', async () => {
    await service.markFlowCompleted(waId);
    await service.setCancelState(waId, {
      phone: '11-5555-0000',
      date: 'domingo 16 de marzo 2026 16/03/2026',
      time: '20:00',
      name: 'guido',
    });

    expect(cacheManager.store.get(lifecycleKey)?.value).toMatchObject({
      waId,
      status: FlowLifecycleStatus.COMPLETED,
    });
    expect(cacheManager.store.get(cancelKey)?.ttl).toBe(2 * 60 * 60 * 1000);
  });

  it('should merge cancel state patches over the current state', async () => {
    cacheManager.store.set(cancelKey, {
      value: {
        phone: '11-5555-0000',
        date: 'domingo 16 de marzo 2026 16/03/2026',
        time: null,
        name: null,
      } satisfies DeleteReservation,
    });

    const next = await service.updateCancelState(waId, {
      time: '21:00',
      name: 'guido',
    });

    expect(next).toEqual({
      phone: '11-5555-0000',
      date: 'domingo 16 de marzo 2026 16/03/2026',
      time: '21:00',
      name: 'guido',
    });
    expect(cacheManager.store.get(cancelKey)?.value).toEqual(next);
  });

  it('should merge update state patches over the current state', async () => {
    cacheManager.store.set(updateKey, {
      value: {
        currentName: 'guido',
        phone: '11-5555-0000',
        currentDate: 'domingo 16 de marzo 2026 16/03/2026',
        currentTime: '20:00',
        currentQuantity: '2',
        newName: null,
        newQuantity: null,
        newDate: null,
        newTime: null,
        stage: 'identify',
      } satisfies UpdateReservationType,
    });

    const next = await service.updateUpdateState(waId, {
      newDate: 'lunes 17 de marzo 2026 17/03/2026',
      newTime: '21:00',
      stage: 'reschedule',
    });

    expect(next).toEqual({
      currentName: 'guido',
      phone: '11-5555-0000',
      currentDate: 'domingo 16 de marzo 2026 16/03/2026',
      currentTime: '20:00',
      currentQuantity: '2',
      newName: null,
      newQuantity: null,
      newDate: 'lunes 17 de marzo 2026 17/03/2026',
      newTime: '21:00',
      stage: 'reschedule',
    });
    await expect(service.getUpdateState(waId)).resolves.toEqual(next);
  });

  it('should store and clear affected reservation state using conversation ttl', async () => {
    const affectedReservation = {
      name: 'Juan Perez',
      phone: '5491122334455',
      date: 'jueves 16 de abril 2026 16/04/2026',
      time: '21:00',
      quantity: 4,
      closureType: 'day',
      closureReason: 'Cerrado por mantenimiento',
      notifiedAt: now,
    } satisfies AffectedReservationState;

    await service.setAffectedReservationState(waId, affectedReservation);

    await expect(service.getAffectedReservationState(waId)).resolves.toEqual(affectedReservation);
    expect(cacheManager.store.get(affectedReservationKey)?.ttl).toBe(3 * 60 * 60 * 1000);

    await service.clearAffectedReservationState(waId);

    expect(cacheManager.store.has(affectedReservationKey)).toBe(false);
  });

  it('should store closure notification state using hard limit ttl', async () => {
    const notificationKey = `day:2026-04-16:day:day:jueves-16-de-abril-2026-16-04-2026:21-00:${waId}`;
    const notificationState = {
      status: 'sent',
      sentAt: now,
    } satisfies ClosureNotificationState;

    await service.setClosureNotificationState(notificationKey, notificationState);

    await expect(service.getClosureNotificationState(notificationKey)).resolves.toEqual(
      notificationState,
    );
    expect(cacheManager.store.get(closureNotificationKey)?.ttl).toBe(6 * 60 * 60 * 1000);
  });

  it('should store closure notification operation state using hard limit ttl', async () => {
    const operationState = {
      operationId: 'op-123',
      isCompleted: false,
      totalNotifications: 2,
      processedNotifications: 1,
      failedNotifications: [],
    } satisfies ClosureNotificationOperationState;

    await service.setClosureNotificationOperationState('op-123', operationState);

    await expect(service.getClosureNotificationOperationState('op-123')).resolves.toEqual(
      operationState,
    );
    expect(cacheManager.store.get(closureNotificationOperationKey)?.ttl).toBe(6 * 60 * 60 * 1000);
  });

  it('should clear cached slices individually', async () => {
    cacheManager.store.set(historyKey, { value: [{ role: RoleEnum.USER, content: 'hi' }] });
    cacheManager.store.set(cancelKey, {
      value: { phone: '1', date: null, time: null, name: null } satisfies DeleteReservation,
    });
    cacheManager.store.set(updateKey, {
      value: {
        currentName: null,
        phone: null,
        currentDate: null,
        currentTime: null,
        currentQuantity: null,
        newName: null,
        newQuantity: null,
        newDate: null,
        newTime: null,
        stage: 'identify',
      } satisfies UpdateReservationType,
    });

    await service.clearHistory(waId, CacheTypeEnum.DATA);
    await service.clearCancelState(waId);
    await service.clearUpdateState(waId);
    await service.clearAffectedReservationState(waId);

    expect(cacheManager.store.has(historyKey)).toBe(false);
    expect(cacheManager.store.has(cancelKey)).toBe(false);
    expect(cacheManager.store.has(updateKey)).toBe(false);
    expect(cacheManager.store.has(affectedReservationKey)).toBe(false);
  });

  it('should expose monitoring snapshot with active conversations and total cached messages', async () => {
    const anotherWaId = '5491198765432';

    await service.appendEntityMessage(waId, 'hola', RoleEnum.USER);
    await service.appendEntityMessage(waId, 'como va', RoleEnum.ASSISTANT);
    await service.appendEntityMessage(anotherWaId, 'necesito reservar', RoleEnum.USER);

    expect(service.getMonitoringSnapshot()).toEqual({
      activeConversations: 2,
      totalMessagesInCache: 3,
    });

    await service.clearHistory(waId, CacheTypeEnum.DATA);

    expect(service.getMonitoringSnapshot()).toEqual({
      activeConversations: 2,
      totalMessagesInCache: 1,
    });
  });

  it('should expire an in-progress conversation, clear cache and delete temporal reservation', async () => {
    await service.appendEntityMessage(waId, 'hola', RoleEnum.USER);
    await service.setCancelState(waId, {
      phone: '11-5555-0000',
      date: null,
      time: null,
      name: null,
    });
    await service.setUpdateState(waId, {
      currentName: null,
      phone: null,
      currentDate: null,
      currentTime: null,
      currentQuantity: null,
      newName: null,
      newQuantity: null,
      newDate: null,
      newTime: null,
      stage: 'identify',
    });
    await service.setAffectedReservationState(waId, {
      name: 'guido',
      phone: '5491112345678',
      date: 'domingo 29 de marzo 2026 29/03/2026',
      time: '21:00',
      quantity: 2,
      closureType: 'slot',
      closureReason: null,
      notifiedAt: now,
    });

    await jest.advanceTimersByTimeAsync(3 * 60 * 60 * 1000);

    expect(cacheManager.store.has(lifecycleKey)).toBe(false);
    expect(cacheManager.store.has(historyKey)).toBe(false);
    expect(cacheManager.store.has(cancelKey)).toBe(false);
    expect(cacheManager.store.has(updateKey)).toBe(false);
    expect(cacheManager.store.has(affectedReservationKey)).toBe(false);
    expect(datesService.deleteIncompleteTemporalReservationByWaId.mock.calls).toEqual([[waId]]);
    expect(expirationNotifier.sendConversationExpiredMessage.mock.calls).toEqual([
      [waId, FlowLifecycleStatus.IN_PROGRESS],
    ]);
  });

  it('should expire a completed conversation without deleting temporal reservation', async () => {
    await service.markFlowCompleted(waId);

    await jest.advanceTimersByTimeAsync(2 * 60 * 60 * 1000);

    expect(datesService.deleteIncompleteTemporalReservationByWaId.mock.calls).toEqual([]);
    expect(expirationNotifier.sendConversationExpiredMessage.mock.calls).toEqual([
      [waId, FlowLifecycleStatus.COMPLETED],
    ]);
    expect(cacheManager.store.has(lifecycleKey)).toBe(false);
  });
});
