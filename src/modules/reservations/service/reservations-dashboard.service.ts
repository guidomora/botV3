import { Injectable } from '@nestjs/common';
import {
  DashboardCreateReservationResult,
  DashboardCreateReservationType,
  DashboardAvailableDates,
  DashboardCloseDayResult,
  DashboardClosureNotificationFailuresResult,
  DashboardCloseDayType,
  DashboardCloseSlotResult,
  DashboardCloseSlotType,
  DashboardDeleteReservationResult,
  DashboardDeleteReservationType,
  DailyReservationSlots,
  DashboardOpenDayResult,
  DashboardOpenSlotResult,
  DashboardOpenSlotType,
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
import { CloseDashboardSlotUseCase } from '../application/close-dashboard-slot.use-case';
import { OpenDashboardDayUseCase } from '../application/open-dashboard-day.use-case';
import { OpenDashboardSlotUseCase } from '../application/open-dashboard-slot.use-case';
import { GetClosureNotificationFailuresUseCase } from '../application/get-closure-notification-failures.use-case';

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
    private readonly closeDashboardSlotUseCase: CloseDashboardSlotUseCase,
    private readonly getClosureNotificationFailuresUseCase: GetClosureNotificationFailuresUseCase,
    private readonly openDashboardDayUseCase: OpenDashboardDayUseCase,
    private readonly openDashboardSlotUseCase: OpenDashboardSlotUseCase,
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

  async closeSlot(payload: DashboardCloseSlotType): Promise<DashboardCloseSlotResult> {
    return this.closeDashboardSlotUseCase.execute(payload);
  }

  async getClosureNotificationFailures(
    operationId: string,
  ): Promise<DashboardClosureNotificationFailuresResult> {
    return this.getClosureNotificationFailuresUseCase.execute(operationId);
  }

  async openDay(date: string): Promise<DashboardOpenDayResult> {
    return this.openDashboardDayUseCase.execute(date);
  }

  async openSlot(payload: DashboardOpenSlotType): Promise<DashboardOpenSlotResult> {
    return this.openDashboardSlotUseCase.execute(payload);
  }
}
