import { DashboardReservationSlot } from './dashboard-reservation-slot.type';

export type DailyReservationSlots = {
  date: string;
  sheetDate: string;
  slots: DashboardReservationSlot[];
};
