import { Injectable } from '@nestjs/common';
import { DashboardAvailableDates, DailyReservationsSummary } from 'src/lib';
import { GetAvailableReservationDatesUseCase } from '../application/get-available-reservation-dates.use-case';
import { GetDailyReservationsSummaryUseCase } from '../application/get-daily-reservations-summary.use-case';

@Injectable()
export class ReservationsDashboardService {
  constructor(
    private readonly getAvailableReservationDatesUseCase: GetAvailableReservationDatesUseCase,
    private readonly getDailyReservationsSummaryUseCase: GetDailyReservationsSummaryUseCase,
  ) {}

  async getAvailableDates(): Promise<DashboardAvailableDates> {
    return this.getAvailableReservationDatesUseCase.execute();
  }

  async getDailySummary(date: string, sheetDate: string): Promise<DailyReservationsSummary> {
    return this.getDailyReservationsSummaryUseCase.execute(date, sheetDate);
  }
}
