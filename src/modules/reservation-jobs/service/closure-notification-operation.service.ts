import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ClosureNotificationFailure,
  ClosureNotificationOperationState,
  DashboardClosureNotificationFailuresResult,
} from 'src/lib';
import { CacheService } from 'src/modules/cache-context/cache.service';
import { randomUUID } from 'crypto';

@Injectable()
export class ClosureNotificationOperationService {
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
}
