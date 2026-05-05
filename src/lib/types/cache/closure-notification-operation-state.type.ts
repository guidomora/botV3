import { ClosureNotificationFailure } from '../reservation';

export interface ClosureNotificationOperationState {
  operationId: string;
  isCompleted: boolean;
  totalNotifications: number;
  processedNotifications: number;
  failedNotifications: ClosureNotificationFailure[];
}
