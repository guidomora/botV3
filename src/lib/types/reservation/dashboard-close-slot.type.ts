export interface DashboardCloseSlotType {
  date: string;
  fromTime: string;
  toTime: string;
  reason?: string;
}

export interface DashboardCloseSlotResult {
  date: string;
  fromTime: string;
  toTime: string;
  isClosed: true;
  reason: string | null;
  existingReservationsCount: number;
  notificationsQueuedCount: number;
  closureOperationId: string | null;
  warning: string | null;
}
