import { Injectable } from '@nestjs/common';
import {
  DashboardAvailableDates,
  DailyReservationSlots,
  DashboardUpdateReservationResult,
  DashboardUpdateReservationType,
  DailyReservationsSummary,
} from 'src/lib';
import { GetAvailableReservationDatesUseCase } from '../application/get-available-reservation-dates.use-case';
import { GetDailyReservationSlotsUseCase } from '../application/get-daily-reservation-slots.use-case';
import { GetDailyReservationsSummaryUseCase } from '../application/get-daily-reservations-summary.use-case';
import { UpdateDashboardReservationUseCase } from '../application/update-dashboard-reservation.use-case';

@Injectable()
export class ReservationsDashboardService {
  constructor(
    private readonly getAvailableReservationDatesUseCase: GetAvailableReservationDatesUseCase,
    private readonly getDailyReservationSlotsUseCase: GetDailyReservationSlotsUseCase,
    private readonly getDailyReservationsSummaryUseCase: GetDailyReservationsSummaryUseCase,
    private readonly updateDashboardReservationUseCase: UpdateDashboardReservationUseCase,
  ) {}

  async getAvailableDates(): Promise<DashboardAvailableDates> {
    return this.getAvailableReservationDatesUseCase.execute();
  }

  async getDailySummary(date: string, sheetDate: string): Promise<DailyReservationsSummary> {
    return this.getDailyReservationsSummaryUseCase.execute(date, sheetDate);
  }

  async getDailySlots(date: string, sheetDate: string): Promise<DailyReservationSlots> {
    return this.getDailyReservationSlotsUseCase.execute(date, sheetDate);
  }

  async updateReservation(
    payload: DashboardUpdateReservationType,
  ): Promise<DashboardUpdateReservationResult> {
    return this.updateDashboardReservationUseCase.execute(payload);
  }
}
