import { ClosureType, DashboardReservation } from '../reservation';

export type ClosureNotificationJobData = {
  closureType: ClosureType;
  date: string;
  sheetDate: string;
  fromTime?: string;
  toTime?: string;
  reason?: string | null;
  reservation: DashboardReservation;
};

export type ClosureNotificationRequest = Omit<ClosureNotificationJobData, 'reservation'> & {
  reservations: DashboardReservation[];
};

export type ClosureNotificationQueueResult = {
  queuedCount: number;
};
