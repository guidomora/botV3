import { AddDataType } from '../../add-data.type';
import { DateTime } from '../../datetime';
import { Availability, UpdateParams } from '../../availability';
import { GetIndexParams } from '../../datetime';

export interface DatesSheetPort {
  appendRow(range: string, values: DateTime): Promise<void>;
  getLastRowValue(range: string): Promise<string>;
  getFirstRowValue(range: string): Promise<string>;
  getDate(date: string, time: string, range?: string): Promise<number>;
  getDateIndexByData(getIndexParams: GetIndexParams): Promise<number>;
  getDateIndexByDate(date: string, sheetIndex: number): Promise<number>;
  getDatetimeDates(date: string, time: string): Promise<DateTime>;
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
  getDayAvailability(date: string): Promise<string[][]>;
  updateAvailabilityFromReservations(updateParams: UpdateParams): Promise<void>;
  refreshAvailabilityForDate(date: string): Promise<void>;
  insertRow(range: string, rowIndex: number): Promise<number>;
  deleteReservation(range: string): Promise<void>;
  deleteRow(rowIndex: number, sheetNumber: number): Promise<void>;
  deleteOldRows(rowStart: number, rowEnd: number, sheetIndex: number): Promise<void>;
}
