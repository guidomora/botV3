import { DashboardReservation } from './dashboard-reservation.type';

export interface DashboardCreateReservationType {
  date: string;
  time: string;
  name: string;
  phone: string;
  quantity: number;
}

export interface DashboardCreateReservationResult {
  message: string;
  reservation: DashboardReservation;
}
