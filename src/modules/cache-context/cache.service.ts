import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  Intention,
  ChatMessage,
  RoleEnum,
  DeleteReservation,
  CacheTypeEnum,
  UpdateReservationType,
  ConversationLifecycleState,
  FlowLifecycleStatus,
} from 'src/lib';
import { DatesService } from 'src/modules/dates/service/dates.service';
import { ConversationExpirationNotifierService } from './conversation-expiration-notifier.service';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly datesService: DatesService,
    private readonly expirationNotifier: ConversationExpirationNotifierService,
  ) {}

  private readonly MAX = 30;
  private readonly INCOMPLETE_FLOW_TTL_MS = 3 * 60 * 60 * 1000;
  private readonly COMPLETED_FLOW_TTL_MS = 2 * 60 * 60 * 1000;
  private readonly HARD_LIMIT_TTL_MS = 6 * 60 * 60 * 1000;
  private readonly lifecyclePrefix = 'lifecycle:';
  private readonly expirationTimers = new Map<string, NodeJS.Timeout>();

  private key(waId: string, prefix: string) {
    return `${prefix}${waId}`;
  }

  private lifecycleKey(waId: string): string {
    return this.key(waId, this.lifecyclePrefix);
  }

  private getTtlByStatus(status: FlowLifecycleStatus): number {
    return status === FlowLifecycleStatus.COMPLETED
      ? this.COMPLETED_FLOW_TTL_MS
      : this.INCOMPLETE_FLOW_TTL_MS;
  }

  private async getLifecycleState(waId: string): Promise<ConversationLifecycleState | null> {
    const state = await this.cacheManager.get<ConversationLifecycleState>(this.lifecycleKey(waId));
    return state ?? null;
  }

  private async persistLifecycleState(state: ConversationLifecycleState): Promise<void> {
    await this.cacheManager.set(this.lifecycleKey(state.waId), state, this.HARD_LIMIT_TTL_MS);
  }

  private clearExpirationTimer(waId: string): void {
    const activeTimer = this.expirationTimers.get(waId);
    if (activeTimer) {
      clearTimeout(activeTimer);
      this.expirationTimers.delete(waId);
    }
  }

  private scheduleExpiration(state: ConversationLifecycleState): void {
    this.clearExpirationTimer(state.waId);

    const remainingMs = Math.max(0, state.expiresAt - Date.now());
    const timeout = setTimeout(() => {
      void this.handleConversationExpiration(state.waId);
    }, remainingMs);

    this.expirationTimers.set(state.waId, timeout);
  }

  private async touchLifecycle(
    waId: string,
    nextStatus?: FlowLifecycleStatus,
  ): Promise<ConversationLifecycleState> {
    const now = Date.now();
    const current = await this.getLifecycleState(waId);

    const baseState: ConversationLifecycleState = current ?? {
      waId,
      status: FlowLifecycleStatus.IN_PROGRESS,
      flowStartedAt: now,
      hardExpireAt: now + this.HARD_LIMIT_TTL_MS,
      expiresAt: now + this.INCOMPLETE_FLOW_TTL_MS,
    };

    const status = nextStatus ?? baseState.status;
    const targetExpiration = now + this.getTtlByStatus(status);
    const expiresAt = Math.min(targetExpiration, baseState.hardExpireAt);

    const nextState: ConversationLifecycleState = {
      ...baseState,
      status,
      expiresAt,
    };

    await this.persistLifecycleState(nextState);
    this.scheduleExpiration(nextState);

    return nextState;
  }

  private async getHistoryTtlMs(waId: string): Promise<number> {
    const lifecycleState = await this.getLifecycleState(waId);
    if (!lifecycleState) {
      return this.INCOMPLETE_FLOW_TTL_MS;
    }

    return Math.max(1_000, lifecycleState.expiresAt - Date.now());
  }

  private async clearAllConversationState(waId: string): Promise<void> {
    await Promise.all([
      this.cacheManager.del(this.key(waId, CacheTypeEnum.DATA)),
      this.cacheManager.del(this.key(waId, CacheTypeEnum.CANCEL)),
      this.cacheManager.del(this.key(waId, CacheTypeEnum.UPDATE)),
      this.cacheManager.del(this.lifecycleKey(waId)),
    ]);

    this.clearExpirationTimer(waId);
  }

  private async handleConversationExpiration(waId: string): Promise<void> {
    const lifecycleState = await this.getLifecycleState(waId);

    if (!lifecycleState) {
      this.clearExpirationTimer(waId);
      return;
    }

    if (Date.now() < lifecycleState.expiresAt) {
      this.scheduleExpiration(lifecycleState);
      return;
    }

    this.logger.log(`Conversation cache expired for ${waId} with status ${lifecycleState.status}`);

    await this.clearAllConversationState(waId);

    if (lifecycleState.status === FlowLifecycleStatus.IN_PROGRESS) {
      await this.datesService.deleteIncompleteTemporalReservationByWaId(waId);
      await this.expirationNotifier.sendConversationExpiredMessage(
        waId,
        FlowLifecycleStatus.IN_PROGRESS,
      );
      return;
    }

    await this.expirationNotifier.sendConversationExpiredMessage(
      waId,
      FlowLifecycleStatus.COMPLETED,
    );
  }

  async markFlowCompleted(waId: string): Promise<void> {
    await this.touchLifecycle(waId, FlowLifecycleStatus.COMPLETED);
  }

  async getHistory(waId: string): Promise<ChatMessage[]> {
    const key = this.key(waId, CacheTypeEnum.DATA);
    const data = await this.cacheManager.get<ChatMessage[] | null>(key);
    this.logger.log(`Cache history for ${waId}`, CacheService.name);
    return Array.isArray(data) ? data : [];
  }

  private async getCancelData(waId: string): Promise<DeleteReservation> {
    const key = this.key(waId, CacheTypeEnum.CANCEL);
    const data = await this.cacheManager.get<DeleteReservation>(key);
    this.logger.log(`Cache cancel data for ${waId}`, CacheService.name);
    return data ?? { phone: null, date: null, time: null, name: null };
  }

  private async setHistory(waId: string, history: ChatMessage[]) {
    const key = this.key(waId, CacheTypeEnum.DATA);
    const trimmed = history.slice(-this.MAX);
    const ttl = await this.getHistoryTtlMs(waId);

    await this.cacheManager.set(key, trimmed, ttl);

    return trimmed;
  }

  private async getUpdateData(waId: string): Promise<UpdateReservationType> {
    const key = this.key(waId, CacheTypeEnum.UPDATE);
    const data = await this.cacheManager.get<UpdateReservationType>(key);
    this.logger.log(`Cache update data for ${waId}`, CacheService.name);
    return (
      data ?? {
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
      }
    );
  }

  async getUpdateState(waId: string) {
    return this.getUpdateData(waId);
  }

  async clearUpdateState(waId: string) {
    await this.cacheManager.del(this.key(waId, CacheTypeEnum.UPDATE));
  }

  async setUpdateState(waId: string, state: UpdateReservationType) {
    const key = this.key(waId, CacheTypeEnum.UPDATE);
    const ttl = await this.getHistoryTtlMs(waId);
    await this.cacheManager.set(key, state, ttl);
  }

  async updateUpdateState(waId: string, patch: Partial<UpdateReservationType>) {
    const current = await this.getUpdateData(waId);
    const next: UpdateReservationType = {
      currentName: patch.currentName ?? current.currentName,
      phone: patch.phone ?? current.phone,
      currentDate: patch.currentDate ?? current.currentDate,
      currentTime: patch.currentTime ?? current.currentTime,
      currentQuantity: patch.currentQuantity ?? current.currentQuantity,
      newName: patch.newName ?? current.newName,
      newQuantity: patch.newQuantity ?? current.newQuantity,
      newDate: patch.newDate ?? current.newDate,
      newTime: patch.newTime ?? current.newTime,
      stage: patch.stage ?? current.stage ?? 'identify',
    };
    this.logger.log(`Cache update update state for ${waId}`, CacheService.name);
    await this.setUpdateState(waId, next);
    return next;
  }

  async appendMessage(waId: string, msg: ChatMessage, intention?: Intention) {
    if (msg.role === RoleEnum.USER) {
      await this.touchLifecycle(waId, FlowLifecycleStatus.IN_PROGRESS);
    } else {
      await this.touchLifecycle(waId);
    }

    const history = await this.getHistory(waId);
    const entry = intention ? { ...msg, intention } : msg;
    history.push(entry);
    this.logger.log(`Cache append message for ${waId}`, CacheService.name);
    return this.setHistory(waId, history);
  }

  async clearHistory(waId: string, type: CacheTypeEnum) {
    await this.cacheManager.del(this.key(waId, type));
    this.logger.log(`Cache clear history for ${waId}`, CacheService.name);
  }

  async clearCancelState(waId: string) {
    await this.cacheManager.del(this.key(waId, CacheTypeEnum.CANCEL));
    this.logger.log(`Cache clear cancel state for ${waId}`, CacheService.name);
  }

  async setCancelState(waId: string, state: DeleteReservation) {
    const key = this.key(waId, CacheTypeEnum.CANCEL);
    const ttl = await this.getHistoryTtlMs(waId);
    await this.cacheManager.set(key, state, ttl);
    this.logger.log(`Cache set cancel state for ${waId}`, CacheService.name);
  }

  async updateCancelState(waId: string, patch: Partial<DeleteReservation>) {
    const current = await this.getCancelData(waId);
    const next: DeleteReservation = {
      phone: patch.phone ?? current.phone,
      date: patch.date ?? current.date,
      time: patch.time ?? current.time,
      name: patch.name ?? current.name,
    };
    await this.setCancelState(waId, next);
    this.logger.log(`Cache update cancel state for ${waId}`, CacheService.name);
    return next;
  }

  async appendEntityMessage(waId: string, content: string, role: RoleEnum, intention?: Intention) {
    return this.appendMessage(waId, { role, content }, intention);
  }
}
