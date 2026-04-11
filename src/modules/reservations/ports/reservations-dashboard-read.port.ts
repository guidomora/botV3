import { DashboardReservation, DashboardReservationSlot } from 'src/lib';

export interface ReservationsDashboardReadPort {
  getReservationsByDate(date: string): Promise<DashboardReservation[]>;
  getAvailabilitySlotsByDate(date: string): Promise<DashboardReservationSlot[]>;
}
