import { Injectable } from '@nestjs/common';
import { DailyReservationsSummary } from 'src/lib';
import { GetDailyReservationsSummaryUseCase } from '../application/get-daily-reservations-summary.use-case';

@Injectable()
export class ReservationsDashboardService {
  constructor(
    private readonly getDailyReservationsSummaryUseCase: GetDailyReservationsSummaryUseCase,
  ) {}

  async getDailySummary(date: string, sheetDate: string): Promise<DailyReservationsSummary> {
    return this.getDailyReservationsSummaryUseCase.execute(date, sheetDate);
  }
}
