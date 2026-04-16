import { Inject, Injectable } from '@nestjs/common';
import { DailyReservationSlots } from 'src/lib';
import { ReservationsDashboardReadPort } from '../ports/reservations-dashboard-read.port';
import { RESERVATIONS_DASHBOARD_READ_PORT } from '../reservations.tokens';

@Injectable()
export class GetDailyReservationSlotsUseCase {
  constructor(
    @Inject(RESERVATIONS_DASHBOARD_READ_PORT)
    private readonly reservationsDashboardReadPort: ReservationsDashboardReadPort,
  ) {}

  async execute(date: string, sheetDate: string): Promise<DailyReservationSlots> {
    const slots = await this.reservationsDashboardReadPort.getAvailabilitySlotsByDate(sheetDate);

    return {
      date,
      sheetDate,
      slots,
    };
  }
}
