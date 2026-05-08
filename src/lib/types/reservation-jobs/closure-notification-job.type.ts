import { ClosureType, DashboardReservation } from '../reservation';

export type ClosureNotificationJobData = {
  operationId: string | null;
  closureType: ClosureType;
  date: string;
  sheetDate: string;
  fromTime?: string;
  toTime?: string;
  reason?: string | null;
  reservation: DashboardReservation;
};

export type ClosureNotificationRequest = Omit<
  ClosureNotificationJobData,
  'reservation' | 'operationId'
> & {
  reservations: DashboardReservation[];
};

export type ClosureNotificationQueueResult = {
  queuedCount: number;
  closureOperationId: string | null;
};
