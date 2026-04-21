import { AddDataType } from 'src/lib/types/add-data.type';
import { Availability } from 'src/lib/types/availability/availability.type';
import { UpdateParams } from 'src/lib/types/availability/update-params.type';
import { DateTime } from 'src/lib/types/datetime/datetime.type';
import { GetIndexParams } from 'src/lib/types/datetime/get-index-params.type';
import { DashboardReservation } from 'src/lib/types/reservation/dashboard-reservation.type';

export interface DatesSheetPort {
  appendRow(range: string, values: DateTime): Promise<void>;
  getLastRowValue(range: string): Promise<string>;
  getFirstRowValue(range: string): Promise<string>;
  getDate(date: string, time: string, range?: string): Promise<number>;
  getDateIndexByData(getIndexParams: GetIndexParams): Promise<number>;
  getDateIndexByDate(date: string, sheetIndex: number): Promise<number>;
  getAgendaDateLabel(date: string): Promise<string | null>;
  getDatetimeDates(date: string, time: string): Promise<DateTime>;
  getReservationByDateTimeAndPhone(
    date: string,
    time: string,
    phone: string,
  ): Promise<DashboardReservation | null>;
  hasReservationByDateAndPhone(
    date: string,
    phone: string,
    excludedRowIndex?: number,
  ): Promise<boolean>;
  getRowValues(range: string): Promise<DateTime>;
  createReservation(range: string, values: AddDataType): Promise<void>;
  getAvailabilityFromReservations(
    date: string,
    time: string,
    requestedPeople?: number,
    excludedRowIndex?: number,
  ): Promise<Availability>;
  isDayClosed(date: string): Promise<boolean>;
  getDayAvailability(date: string): Promise<string[][]>;
  updateAvailabilityFromReservations(updateParams: UpdateParams): Promise<void>;
  refreshAvailabilityForDate(date: string): Promise<void>;
  insertRow(range: string, rowIndex: number): Promise<number>;
  deleteReservation(range: string): Promise<void>;
  deleteRow(rowIndex: number, sheetNumber: number): Promise<void>;
  deleteOldRows(rowStart: number, rowEnd: number, sheetIndex: number): Promise<void>;
}
