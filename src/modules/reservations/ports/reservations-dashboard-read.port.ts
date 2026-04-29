import {
  DashboardAvailableDates,
  DashboardCloseDayType,
  DashboardCloseSlotType,
  DashboardOpenSlotType,
  DashboardReservation,
  DashboardReservationSlot,
} from 'src/lib';

export interface ReservationsDashboardReadPort {
  getAvailableDates(): Promise<DashboardAvailableDates>;
  getReservationsByDate(date: string): Promise<DashboardReservation[]>;
  getAvailabilitySlotsByDate(date: string): Promise<DashboardReservationSlot[]>;
  closeDay(payload: DashboardCloseDayType): Promise<void>;
  closeSlot(
    payload: DashboardCloseSlotType,
  ): Promise<{ fromTime: string; toTime: string; reason: string | null }>;
  openDay(date: string): Promise<void>;
  openSlot(payload: DashboardOpenSlotType): Promise<number>;
  isDayClosed(date: string): Promise<boolean>;
}
