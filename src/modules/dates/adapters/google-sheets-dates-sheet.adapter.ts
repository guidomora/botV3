import { Injectable } from '@nestjs/common';
import { AddDataType } from 'src/lib/types/add-data.type';
import { Availability } from 'src/lib/types/availability/availability.type';
import { UpdateParams } from 'src/lib/types/availability/update-params.type';
import { DateTime } from 'src/lib/types/datetime/datetime.type';
import { GetIndexParams } from 'src/lib/types/datetime/get-index-params.type';
import { DashboardReservation } from 'src/lib/types/reservation/dashboard-reservation.type';
import { GoogleSheetsService } from 'src/modules/google-sheets/service/google-sheets.service';
import { DatesSheetPort } from '../ports';

@Injectable()
export class GoogleSheetsDatesSheetAdapter implements DatesSheetPort {
  constructor(private readonly googleSheetsService: GoogleSheetsService) {}

  appendRow(range: string, values: DateTime): Promise<void> {
    return this.googleSheetsService.appendRow(range, values);
  }

  getLastRowValue(range: string): Promise<string> {
    return this.googleSheetsService.getLastRowValue(range);
  }

  getFirstRowValue(range: string): Promise<string> {
    return this.googleSheetsService.getFirstRowValue(range);
  }

  getDate(date: string, time: string, range?: string): Promise<number> {
    return this.googleSheetsService.getDate(date, time, range);
  }

  getDateIndexByData(getIndexParams: GetIndexParams): Promise<number> {
    return this.googleSheetsService.getDateIndexByData(getIndexParams);
  }

  getDateIndexByDate(date: string, sheetIndex: number): Promise<number> {
    return this.googleSheetsService.getDateIndexByDate(date, sheetIndex);
  }

  getAgendaDateLabel(date: string): Promise<string | null> {
    return this.googleSheetsService.getAgendaDateLabel(date);
  }

  getDatetimeDates(date: string, time: string): Promise<DateTime> {
    return this.googleSheetsService.getDatetimeDates(date, time);
  }

  getReservationByDateTimeAndPhone(
    date: string,
    time: string,
    phone: string,
  ): Promise<DashboardReservation | null> {
    return this.googleSheetsService.getReservationByDateTimeAndPhone(date, time, phone);
  }

  hasReservationByDateAndPhone(
    date: string,
    phone: string,
    excludedRowIndex?: number,
  ): Promise<boolean> {
    return this.googleSheetsService.hasReservationByDateAndPhone(date, phone, excludedRowIndex);
  }

  getRowValues(range: string): Promise<DateTime> {
    return this.googleSheetsService.getRowValues(range);
  }

  createReservation(range: string, values: AddDataType): Promise<void> {
    return this.googleSheetsService.createReservation(range, values);
  }

  getAvailabilityFromReservations(
    date: string,
    time: string,
    requestedPeople?: number,
    excludedRowIndex?: number,
  ): Promise<Availability> {
    return this.googleSheetsService.getAvailabilityFromReservations(
      date,
      time,
      requestedPeople,
      excludedRowIndex,
    );
  }

  isDayClosed(date: string): Promise<boolean> {
    return this.googleSheetsService.isDayClosed(date);
  }

  getDayAvailability(date: string): Promise<string[][]> {
    return this.googleSheetsService.getDayAvailability(date);
  }

  updateAvailabilityFromReservations(updateParams: UpdateParams): Promise<void> {
    return this.googleSheetsService.updateAvailabilityFromReservations(updateParams).then(() => {});
  }

  refreshAvailabilityForDate(date: string): Promise<void> {
    return this.googleSheetsService.refreshAvailabilityForDate(date);
  }

  insertRow(range: string, rowIndex: number): Promise<number> {
    return this.googleSheetsService.insertRow(range, rowIndex);
  }

  deleteReservation(range: string): Promise<void> {
    return this.googleSheetsService.deleteReservation(range);
  }

  deleteRow(rowIndex: number, sheetNumber: number): Promise<void> {
    return this.googleSheetsService.deleteRow(rowIndex, sheetNumber);
  }

  deleteOldRows(rowStart: number, rowEnd: number, sheetIndex: number): Promise<void> {
    return this.googleSheetsService.deleteOldRows(rowStart, rowEnd, sheetIndex);
  }

  deleteClosedDaysBefore(date: string): Promise<number> {
    return this.googleSheetsService.deleteClosedDaysBefore(date);
  }
}
