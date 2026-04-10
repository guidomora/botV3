import { DashboardReservation } from './dashboard-reservation.type';
import { DashboardReservationSlot } from './dashboard-reservation-slot.type';

export type DailyReservationsSummary = {
  date: string;
  sheetDate: string;
  reservationsCount: number;
  totalCapacity: number;
  totalPeopleReserved: number;
  reservations: DashboardReservation[];
  slots: DashboardReservationSlot[];
};
