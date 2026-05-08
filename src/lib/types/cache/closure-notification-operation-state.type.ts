import { ClosureNotificationFailure } from '../reservation';
import { TwilioOutboundMessageStatus } from '../twilio';

export interface ClosureNotificationTrackedNotification extends ClosureNotificationFailure {
  messageSid: string;
  status: TwilioOutboundMessageStatus;
  errorCode?: string;
  errorMessage?: string;
}

export interface ClosureNotificationOperationState {
  operationId: string;
  isCompleted: boolean;
  totalNotifications: number;
  processedNotifications: number;
  failedNotifications: ClosureNotificationFailure[];
  trackedNotifications?: ClosureNotificationTrackedNotification[];
}
