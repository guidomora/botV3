import { ClosureNotificationFailure } from './closure-notification-failure.type';

export interface DashboardClosureNotificationFailuresResult {
  isCompleted: boolean;
  hasFailures?: boolean;
  failedNotifications?: ClosureNotificationFailure[];
}
