export type ClosureNotificationStatus = 'sent' | 'context_saved';

export interface ClosureNotificationState {
  status: ClosureNotificationStatus;
  sentAt: number;
  contextSavedAt?: number;
}
