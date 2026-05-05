import { Injectable } from '@nestjs/common';
import { DashboardClosureNotificationFailuresResult } from 'src/lib';
import { ClosureNotificationOperationService } from 'src/modules/reservation-jobs/service/closure-notification-operation.service';

@Injectable()
export class GetClosureNotificationFailuresUseCase {
  constructor(
    private readonly closureNotificationOperationService: ClosureNotificationOperationService,
  ) {}

  async execute(operationId: string): Promise<DashboardClosureNotificationFailuresResult> {
    return this.closureNotificationOperationService.getFailuresResult(operationId);
  }
}
