import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  ClosureNotificationFailure,
  ClosureNotificationOperationState,
  ClosureNotificationTrackedNotification,
  DashboardClosureNotificationFailuresResult,
  TwilioMessageStatusCallbackPayload,
} from 'src/lib';
import { CacheService } from 'src/modules/cache-context/cache.service';
import { randomUUID } from 'crypto';

@Injectable()
export class ClosureNotificationOperationService {
  private readonly logger = new Logger(ClosureNotificationOperationService.name);

  constructor(private readonly cacheService: CacheService) {}

  async createOperation(totalNotifications: number): Promise<ClosureNotificationOperationState> {
    const operation = {
      operationId: randomUUID(),
      isCompleted: totalNotifications === 0,
      totalNotifications,
      processedNotifications: 0,
      failedNotifications: [],
    } satisfies ClosureNotificationOperationState;

    await this.cacheService.setClosureNotificationOperationState(operation.operationId, operation);

    return operation;
  }

  async getOperationState(operationId: string): Promise<ClosureNotificationOperationState | null> {
    return this.cacheService.getClosureNotificationOperationState(operationId);
  }

  async getFailuresResult(
    operationId: string,
  ): Promise<DashboardClosureNotificationFailuresResult> {
    const operation = await this.cacheService.getClosureNotificationOperationState(operationId);

    if (!operation) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'No se encontro la operacion de cierre solicitada.',
        error: 'Not Found',
      });
    }

    if (!operation.isCompleted) {
      return { isCompleted: false };
    }

    return {
      isCompleted: true,
      hasFailures: operation.failedNotifications.length > 0,
      failedNotifications: operation.failedNotifications,
    };
  }

  async markNotificationSent(
    operationId: string | null,
  ): Promise<ClosureNotificationOperationState | null> {
    if (!operationId) {
      return null;
    }

    return this.advanceProcessedNotifications(operationId, null);
  }

  async markNotificationFailed(
    operationId: string | null,
    failedNotification: ClosureNotificationFailure,
  ): Promise<ClosureNotificationOperationState | null> {
    if (!operationId) {
      return null;
    }

    return this.advanceProcessedNotifications(operationId, failedNotification);
  }

  async registerNotificationMessage(
    operationId: string | null,
    messageSid: string | undefined,
    notification: ClosureNotificationFailure,
  ): Promise<ClosureNotificationOperationState | null> {
    if (!operationId || !messageSid) {
      return null;
    }

    const current = await this.cacheService.getClosureNotificationOperationState(operationId);

    if (!current) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'No se encontro la operacion de cierre solicitada.',
        error: 'Not Found',
      });
    }

    const alreadyTracked = current.trackedNotifications?.some(
      (trackedNotification) => trackedNotification.messageSid === messageSid,
    );
    const trackedNotification = {
      messageSid,
      status: 'accepted',
      ...notification,
    } satisfies ClosureNotificationTrackedNotification;
    const next: ClosureNotificationOperationState = alreadyTracked
      ? current
      : {
          ...current,
          trackedNotifications: [...(current.trackedNotifications ?? []), trackedNotification],
        };

    await this.cacheService.setClosureNotificationMessageOperationId(messageSid, operationId);
    await this.cacheService.setClosureNotificationOperationState(operationId, next);

    return next;
  }

  async handleMessageStatusCallback(payload: TwilioMessageStatusCallbackPayload): Promise<void> {
    const operationId = await this.cacheService.getClosureNotificationMessageOperationId(
      payload.MessageSid,
    );

    if (!operationId) {
      this.logger.warn(
        `Callback de Twilio sin operacion asociada messageSid=${payload.MessageSid} status=${payload.MessageStatus}`,
      );
      return;
    }

    const current = await this.cacheService.getClosureNotificationOperationState(operationId);

    if (!current) {
      this.logger.warn(
        `Callback de Twilio para operacion inexistente operationId=${operationId} messageSid=${payload.MessageSid}`,
      );
      return;
    }

    const trackedNotifications = current.trackedNotifications ?? [];
    const trackedNotification = trackedNotifications.find(
      (notification) => notification.messageSid === payload.MessageSid,
    );

    if (!trackedNotification) {
      this.logger.warn(
        `Callback de Twilio sin notificacion asociada operationId=${operationId} messageSid=${payload.MessageSid}`,
      );
      return;
    }

    const updatedTrackedNotifications = trackedNotifications.map((notification) =>
      notification.messageSid === payload.MessageSid
        ? {
            ...notification,
            status: payload.MessageStatus,
            errorCode: payload.ErrorCode,
            errorMessage: payload.ErrorMessage,
          }
        : notification,
    );
    const failedNotifications = this.isFailureStatus(payload.MessageStatus)
      ? this.addFailedNotificationIfMissing(current.failedNotifications, trackedNotification)
      : current.failedNotifications;

    if (this.isFailureStatus(payload.MessageStatus)) {
      this.logger.warn(
        `Twilio reporto fallo de notificacion de cierre operationId=${operationId} messageSid=${payload.MessageSid} status=${payload.MessageStatus} errorCode=${payload.ErrorCode ?? 'none'}`,
      );
    }

    await this.cacheService.setClosureNotificationOperationState(operationId, {
      ...current,
      failedNotifications,
      trackedNotifications: updatedTrackedNotifications,
    });
  }

  private async advanceProcessedNotifications(
    operationId: string,
    failedNotification: ClosureNotificationFailure | null,
  ): Promise<ClosureNotificationOperationState> {
    const current = await this.cacheService.getClosureNotificationOperationState(operationId);

    if (!current) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'No se encontro la operacion de cierre solicitada.',
        error: 'Not Found',
      });
    }

    const failedNotifications =
      failedNotification === null
        ? current.failedNotifications
        : [...current.failedNotifications, failedNotification];
    const processedNotifications = Math.min(
      current.totalNotifications,
      current.processedNotifications + 1,
    );
    const next = {
      ...current,
      processedNotifications,
      failedNotifications,
      isCompleted: processedNotifications >= current.totalNotifications,
    } satisfies ClosureNotificationOperationState;

    await this.cacheService.setClosureNotificationOperationState(operationId, next);

    return next;
  }

  private isFailureStatus(status: TwilioMessageStatusCallbackPayload['MessageStatus']): boolean {
    return status === 'failed' || status === 'undelivered';
  }

  private addFailedNotificationIfMissing(
    currentFailures: ClosureNotificationFailure[],
    failedNotification: ClosureNotificationFailure,
  ): ClosureNotificationFailure[] {
    const alreadyFailed = currentFailures.some(
      (failure) =>
        failure.phone === failedNotification.phone &&
        failure.date === failedNotification.date &&
        failure.time === failedNotification.time,
    );

    if (alreadyFailed) {
      return currentFailures;
    }

    return [
      ...currentFailures,
      {
        name: failedNotification.name,
        phone: failedNotification.phone,
        date: failedNotification.date,
        time: failedNotification.time,
      },
    ];
  }
}
