import { DashboardReservation } from './dashboard-reservation.type';

export interface DashboardUpdateReservationType {
  phone: string;
  currentDate: string;
  currentTime: string;
  date?: string;
  time?: string;
  name?: string;
  quantity?: number;
}

export interface DashboardUpdateReservationResult {
  message: string;
  reservation: DashboardReservation;
}
