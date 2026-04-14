import { DashboardAvailableDates, DashboardReservation, DashboardReservationSlot } from 'src/lib';

export interface ReservationsDashboardReadPort {
  getAvailableDates(): Promise<DashboardAvailableDates>;
  getReservationsByDate(date: string): Promise<DashboardReservation[]>;
  getAvailabilitySlotsByDate(date: string): Promise<DashboardReservationSlot[]>;
}
