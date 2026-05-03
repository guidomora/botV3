export interface DashboardCloseDayType {
  date: string;
  reason?: string;
}

export interface DashboardCloseDayResult {
  date: string;
  isClosed: true;
  reason: string | null;
  existingReservationsCount: number;
  notificationsQueuedCount: number;
  warning: string | null;
}
