import { Injectable } from '@nestjs/common';
import { SheetsName } from 'src/constants';
import { SHEETS_NAMES } from 'src/constants/sheets-name/sheets-name';
import { AddDataType } from 'src/lib/types/add-data.type';
import { DateTime } from 'src/lib/types/datetime/datetime.type';
import {
  Availability,
  DashboardAvailableDates,
  DashboardCloseDayType,
  DashboardCloseSlotType,
  DashboardOpenSlotType,
  DashboardReservation,
  DashboardReservationSlot,
  GetIndexParams,
  UpdateParams,
} from 'src/lib';
import { GoogleSheetsRepository } from '../domain/repository/google-sheets.repository';
import { GoogleSheetsAvailabilityService } from './google-sheets-availability.service';
import { GoogleSheetsClosedScheduleService } from './google-sheets-closed-schedule.service';
import { GoogleSheetsReservationsService } from './google-sheets-reservations.service';

@Injectable()
export class GoogleSheetsService {
  constructor(
    private readonly googleSheetsRepository: GoogleSheetsRepository,
    private readonly closedScheduleService: GoogleSheetsClosedScheduleService,
    private readonly reservationsService: GoogleSheetsReservationsService,
    private readonly availabilityService: GoogleSheetsAvailabilityService,
  ) {}

  async appendRow(range: string, values: DateTime) {
    try {
      await this.googleSheetsRepository.appendRow(range, values);
    } catch (error) {
      this.googleSheetsRepository.failure(error);
    }
  }

  async getLastRowValue(range: string): Promise<string> {
    try {
      const data = await this.googleSheetsRepository.getLastRowValue(range);
      return data;
    } catch (error) {
      this.googleSheetsRepository.failure(error);
    }
  }

  async getFirstRowValue(range: string): Promise<string> {
    try {
      const data = await this.googleSheetsRepository.getFirstRowValue(range);
      return data;
    } catch (error) {
      this.googleSheetsRepository.failure(error);
    }
  }

  async getDate(
    date: string,
    time: string,
    range: string = `${SHEETS_NAMES[0]}!A:C`,
  ): Promise<number> {
    return this.reservationsService.getDate(date, time, range);
  }

  async getDateData(
    date: string,
    time: string,
    range: string = `${SHEETS_NAMES[0]}!A:C`,
  ): Promise<string[] | null> {
    return this.reservationsService.getDateData(date, time, range);
  }

  async getDateIndexByData(getIndexParams: GetIndexParams): Promise<number> {
    return this.reservationsService.getDateIndexByData(getIndexParams);
  }

  async getDateIndexByDate(date: string, sheetIndex: number): Promise<number> {
    return this.reservationsService.getDateIndexByDate(date, sheetIndex);
  }

  async getAgendaDateLabel(date: string): Promise<string | null> {
    return this.availabilityService.getAgendaDateLabel(date);
  }

  async getDatetimeDates(date: string, time: string): Promise<DateTime> {
    return this.reservationsService.getDatetimeDates(date, time);
  }

  async hasReservationByDateAndPhone(
    date: string,
    phone: string,
    excludedRowIndex?: number,
  ): Promise<boolean> {
    return this.reservationsService.hasReservationByDateAndPhone(date, phone, excludedRowIndex);
  }

  async getRowValues(range: string): Promise<DateTime> {
    try {
      const data = await this.googleSheetsRepository.getRowValues(range);
      return data;
    } catch (error) {
      this.googleSheetsRepository.failure(error);
    }
  }

  async createReservation(range: string, values: AddDataType) {
    return this.reservationsService.createReservation(range, values);
  }

  async getAvailability(date: string, time: string): Promise<Availability> {
    return this.availabilityService.getAvailability(date, time);
  }

  async getAvailabilityFromReservations(
    date: string,
    time: string,
    requestedPeople: number = 1,
    excludedRowIndex?: number,
  ): Promise<Availability> {
    return this.availabilityService.getAvailabilityFromReservations(
      date,
      time,
      requestedPeople,
      excludedRowIndex,
    );
  }

  async isDayClosed(date: string): Promise<boolean> {
    return this.closedScheduleService.isDayClosed(date);
  }

  async closeDay(payload: DashboardCloseDayType): Promise<void> {
    return this.closedScheduleService.closeDay(payload);
  }

  async closeSlot(
    payload: DashboardCloseSlotType,
  ): Promise<{ fromTime: string; toTime: string; reason: string | null }> {
    return this.closedScheduleService.closeSlot(payload);
  }

  async openDay(date: string): Promise<void> {
    return this.closedScheduleService.openDay(date);
  }

  async openSlot(payload: DashboardOpenSlotType): Promise<number> {
    return this.closedScheduleService.openSlot(payload);
  }

  async deleteClosedDaysBefore(date: string): Promise<number> {
    return this.closedScheduleService.deleteClosedDaysBefore(date);
  }

  async deleteClosedSlotsBefore(date: string): Promise<number> {
    return this.closedScheduleService.deleteClosedSlotsBefore(date);
  }

  async getDayAvailability(date: string): Promise<string[][]> {
    return this.availabilityService.getDayAvailability(date);
  }

  async getAvailableReservationDates(): Promise<DashboardAvailableDates> {
    return this.availabilityService.getAvailableReservationDates();
  }

  async getReservationsByDate(date: string): Promise<DashboardReservation[]> {
    return this.reservationsService.getReservationsByDate(date);
  }

  async getReservationByDateTimeAndPhone(
    date: string,
    time: string,
    phone: string,
  ): Promise<DashboardReservation | null> {
    return this.reservationsService.getReservationByDateTimeAndPhone(date, time, phone);
  }

  async getAvailabilitySlotsByDate(date: string): Promise<DashboardReservationSlot[]> {
    return this.availabilityService.getAvailabilitySlotsByDate(date);
  }

  async updateAvailabilityFromReservations(updateParams: UpdateParams) {
    return this.availabilityService.updateAvailabilityFromReservations(updateParams);
  }

  async refreshAvailabilityForDate(date: string): Promise<void> {
    return this.availabilityService.refreshAvailabilityForDate(date);
  }

  async updateReservationByDate(
    oldDate: string,
    newDate: string,
    oldTime: string,
    newTime?: string,
  ) {
    try {
      const oldDateData = await this.getDateData(oldDate, oldTime, `${SHEETS_NAMES[0]}!A:F`);

      if (oldDateData === null) {
        return 'No se encontro la reserva';
      }

      const checkAvailability = await this.getAvailability(newDate, newTime!);

      if (!checkAvailability.isAvailable) {
        return 'La nueva fecha y hora no están disponibles';
      }
    } catch (error) {
      this.googleSheetsRepository.failure(error);
    }
  }

  async insertRow(range: string, rowIndex: number): Promise<number> {
    const sheetNumber = range.split('!')[0] as SheetsName;
    let sheetIndex = 0;
    if (sheetNumber === SheetsName.AVAILABLE_BOOKINGS) {
      sheetIndex = 1;
    }

    try {
      await this.googleSheetsRepository.insertRow(rowIndex, sheetIndex);
      return rowIndex + 1;
    } catch (error) {
      this.googleSheetsRepository.failure(error);
    }
  }

  async deleteReservation(range: string) {
    return this.reservationsService.deleteReservation(range);
  }

  async deleteRow(rowIndex: number, sheetNumber: number) {
    try {
      await this.googleSheetsRepository.deleteRow(rowIndex, sheetNumber);
    } catch (error) {
      this.googleSheetsRepository.failure(error);
    }
  }

  async deleteOldRows(rowStart: number, rowEnd: number, sheetIndex: number) {
    try {
      await this.googleSheetsRepository.deleteOldRows(rowStart, rowEnd, sheetIndex);
    } catch (error) {
      this.googleSheetsRepository.failure(error);
    }
  }
}
