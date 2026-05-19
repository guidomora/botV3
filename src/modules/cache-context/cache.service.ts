import { Injectable } from '@nestjs/common';
import {
  AffectedReservationState,
  CacheMonitorSnapshot,
  CacheTypeEnum,
  ChatMessage,
  ClosureNotificationOperationState,
  ClosureNotificationState,
  DeleteReservation,
  Intention,
  RoleEnum,
  UpdateReservationType,
} from 'src/lib';
import { ClosureNotificationCacheService } from './closure-notification-cache.service';
import { WhatsappAgentCacheService } from './whatsapp-agent-cache.service';

@Injectable()
export class CacheService {
  constructor(
    private readonly whatsappAgentCacheService: WhatsappAgentCacheService,
    private readonly closureNotificationCacheService: ClosureNotificationCacheService,
  ) {}

  async markFlowCompleted(waId: string): Promise<void> {
    return this.whatsappAgentCacheService.markFlowCompleted(waId);
  }

  async getHistory(waId: string): Promise<ChatMessage[]> {
    return this.whatsappAgentCacheService.getHistory(waId);
  }

  getMonitoringSnapshot(): CacheMonitorSnapshot {
    return this.whatsappAgentCacheService.getMonitoringSnapshot();
  }

  async getUpdateState(waId: string): Promise<UpdateReservationType> {
    return this.whatsappAgentCacheService.getUpdateState(waId);
  }

  async clearUpdateState(waId: string): Promise<void> {
    return this.whatsappAgentCacheService.clearUpdateState(waId);
  }

  async getAffectedReservationState(waId: string): Promise<AffectedReservationState | null> {
    return this.whatsappAgentCacheService.getAffectedReservationState(waId);
  }

  async setAffectedReservationState(waId: string, state: AffectedReservationState): Promise<void> {
    return this.whatsappAgentCacheService.setAffectedReservationState(waId, state);
  }

  async clearAffectedReservationState(waId: string): Promise<void> {
    return this.whatsappAgentCacheService.clearAffectedReservationState(waId);
  }

  async getClosureNotificationState(
    notificationKey: string,
  ): Promise<ClosureNotificationState | null> {
    return this.closureNotificationCacheService.getClosureNotificationState(notificationKey);
  }

  async setClosureNotificationState(
    notificationKey: string,
    state: ClosureNotificationState,
  ): Promise<void> {
    return this.closureNotificationCacheService.setClosureNotificationState(notificationKey, state);
  }

  async getClosureNotificationOperationState(
    operationId: string,
  ): Promise<ClosureNotificationOperationState | null> {
    return this.closureNotificationCacheService.getClosureNotificationOperationState(operationId);
  }

  async setClosureNotificationOperationState(
    operationId: string,
    state: ClosureNotificationOperationState,
  ): Promise<void> {
    return this.closureNotificationCacheService.setClosureNotificationOperationState(
      operationId,
      state,
    );
  }

  async getClosureNotificationMessageOperationId(messageSid: string): Promise<string | null> {
    return this.closureNotificationCacheService.getClosureNotificationMessageOperationId(
      messageSid,
    );
  }

  async setClosureNotificationMessageOperationId(
    messageSid: string,
    operationId: string,
  ): Promise<void> {
    return this.closureNotificationCacheService.setClosureNotificationMessageOperationId(
      messageSid,
      operationId,
    );
  }

  async setUpdateState(waId: string, state: UpdateReservationType): Promise<void> {
    return this.whatsappAgentCacheService.setUpdateState(waId, state);
  }

  async updateUpdateState(
    waId: string,
    patch: Partial<UpdateReservationType>,
  ): Promise<UpdateReservationType> {
    return this.whatsappAgentCacheService.updateUpdateState(waId, patch);
  }

  async appendMessage(
    waId: string,
    msg: ChatMessage,
    intention?: Intention,
  ): Promise<ChatMessage[]> {
    return this.whatsappAgentCacheService.appendMessage(waId, msg, intention);
  }

  async clearHistory(waId: string, type: CacheTypeEnum): Promise<void> {
    return this.whatsappAgentCacheService.clearHistory(waId, type);
  }

  async clearCancelState(waId: string): Promise<void> {
    return this.whatsappAgentCacheService.clearCancelState(waId);
  }

  async setCancelState(waId: string, state: DeleteReservation): Promise<void> {
    return this.whatsappAgentCacheService.setCancelState(waId, state);
  }

  async updateCancelState(
    waId: string,
    patch: Partial<DeleteReservation>,
  ): Promise<DeleteReservation> {
    return this.whatsappAgentCacheService.updateCancelState(waId, patch);
  }

  async appendEntityMessage(
    waId: string,
    content: string,
    role: RoleEnum,
    intention?: Intention,
  ): Promise<ChatMessage[]> {
    return this.whatsappAgentCacheService.appendEntityMessage(waId, content, role, intention);
  }
}
