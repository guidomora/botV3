import { Injectable } from '@nestjs/common';
import {
  DashboardCreateReservationResult,
  DashboardCreateReservationType,
  DashboardAvailableDates,
  DashboardCloseDayResult,
  DashboardCloseDayType,
  DashboardDeleteReservationResult,
  DashboardDeleteReservationType,
  DailyReservationSlots,
  DashboardOpenDayResult,
  DashboardUpdateReservationResult,
  DashboardUpdateReservationType,
  DailyReservationsSummary,
} from 'src/lib';
import { GetAvailableReservationDatesUseCase } from '../application/get-available-reservation-dates.use-case';
import { GetDailyReservationSlotsUseCase } from '../application/get-daily-reservation-slots.use-case';
import { GetDailyReservationsSummaryUseCase } from '../application/get-daily-reservations-summary.use-case';
import { DeleteDashboardReservationUseCase } from '../application/delete-dashboard-reservation.use-case';
import { UpdateDashboardReservationUseCase } from '../application/update-dashboard-reservation.use-case';
import { CreateDashboardReservationUseCase } from '../application/create-dashboard-reservation.use-case';
import { CloseDashboardDayUseCase } from '../application/close-dashboard-day.use-case';
import { OpenDashboardDayUseCase } from '../application/open-dashboard-day.use-case';

@Injectable()
export class ReservationsDashboardService {
  constructor(
    private readonly createDashboardReservationUseCase: CreateDashboardReservationUseCase,
    private readonly getAvailableReservationDatesUseCase: GetAvailableReservationDatesUseCase,
    private readonly getDailyReservationSlotsUseCase: GetDailyReservationSlotsUseCase,
    private readonly getDailyReservationsSummaryUseCase: GetDailyReservationsSummaryUseCase,
    private readonly deleteDashboardReservationUseCase: DeleteDashboardReservationUseCase,
    private readonly updateDashboardReservationUseCase: UpdateDashboardReservationUseCase,
    private readonly closeDashboardDayUseCase: CloseDashboardDayUseCase,
    private readonly openDashboardDayUseCase: OpenDashboardDayUseCase,
  ) {}

  async getAvailableDates(): Promise<DashboardAvailableDates> {
    return this.getAvailableReservationDatesUseCase.execute();
  }

  async createReservation(
    payload: DashboardCreateReservationType,
  ): Promise<DashboardCreateReservationResult> {
    return this.createDashboardReservationUseCase.execute(payload);
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

  async deleteReservation(
    payload: DashboardDeleteReservationType,
  ): Promise<DashboardDeleteReservationResult> {
    return this.deleteDashboardReservationUseCase.execute(payload);
  }

  async closeDay(payload: DashboardCloseDayType): Promise<DashboardCloseDayResult> {
    return this.closeDashboardDayUseCase.execute(payload);
  }

  async openDay(date: string): Promise<DashboardOpenDayResult> {
    return this.openDashboardDayUseCase.execute(date);
  }
}
