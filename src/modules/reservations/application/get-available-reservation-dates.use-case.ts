import { Inject, Injectable } from '@nestjs/common';
import { DashboardAvailableDates } from 'src/lib';
import { ReservationsDashboardReadPort } from '../ports/reservations-dashboard-read.port';
import { RESERVATIONS_DASHBOARD_READ_PORT } from '../reservations.tokens';

@Injectable()
export class GetAvailableReservationDatesUseCase {
  constructor(
    @Inject(RESERVATIONS_DASHBOARD_READ_PORT)
    private readonly reservationsDashboardReadPort: ReservationsDashboardReadPort,
  ) {}

  async execute(): Promise<DashboardAvailableDates> {
    return this.reservationsDashboardReadPort.getAvailableDates();
  }
}
