import { DashboardReservation } from './dashboard-reservation.type';

export interface DashboardDeleteReservationType {
  phone: string;
  currentDate: string;
  currentTime: string;
}

export interface DashboardDeleteReservationResult {
  message: string;
  reservation: DashboardReservation;
}
