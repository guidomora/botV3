import { Inject, Injectable } from '@nestjs/common';
import { DASHBOARD_TOTAL_CAPACITY } from 'src/constants';
import { DailyReservationsSummary } from 'src/lib';
import { ReservationsDashboardReadPort } from '../ports/reservations-dashboard-read.port';
import { RESERVATIONS_DASHBOARD_READ_PORT } from '../reservations.tokens';

@Injectable()
export class GetDailyReservationsSummaryUseCase {
  constructor(
    @Inject(RESERVATIONS_DASHBOARD_READ_PORT)
    private readonly reservationsDashboardReadPort: ReservationsDashboardReadPort,
  ) {}

  async execute(date: string, sheetDate: string): Promise<DailyReservationsSummary> {
    const [reservations, slots] = await Promise.all([
      this.reservationsDashboardReadPort.getReservationsByDate(sheetDate),
      this.reservationsDashboardReadPort.getAvailabilitySlotsByDate(sheetDate),
    ]);

    const totalPeopleReserved = reservations.reduce(
      (accumulator, reservation) => accumulator + reservation.quantity,
      0,
    );

    return {
      date,
      sheetDate,
      reservationsCount: reservations.length,
      totalCapacity: DASHBOARD_TOTAL_CAPACITY,
      totalPeopleReserved,
      reservations,
      slots,
    };
  }
}
