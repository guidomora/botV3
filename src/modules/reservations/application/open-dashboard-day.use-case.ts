import { Inject, Injectable } from '@nestjs/common';
import { DashboardOpenDayResult } from 'src/lib';
import { ReservationsDashboardReadPort } from '../ports/reservations-dashboard-read.port';
import { RESERVATIONS_DASHBOARD_READ_PORT } from '../reservations.tokens';

@Injectable()
export class OpenDashboardDayUseCase {
  constructor(
    @Inject(RESERVATIONS_DASHBOARD_READ_PORT)
    private readonly reservationsDashboardReadPort: ReservationsDashboardReadPort,
  ) {}

  async execute(date: string): Promise<DashboardOpenDayResult> {
    const normalizedDate = date.trim();

    await this.reservationsDashboardReadPort.openDay(normalizedDate);

    return {
      date: normalizedDate,
      isClosed: false,
    };
  }
}
