import { Injectable } from '@nestjs/common';
import { GoogleSheetsRepository } from '../domain/repository/google-sheets.repository';
import { DateTime } from 'src/lib/types/datetime/datetime.type';
import { SHEETS_NAMES } from 'src/constants/sheets-name/sheets-name';
import { AddDataType } from 'src/lib/types/add-data.type';
import {
  Availability,
  DashboardAvailableDates,
  DashboardCloseDayType,
  DashboardCloseSlotType,
  computeOnlineMaxCapacity,
  DashboardReservation,
  DashboardReservationSlot,
  formatPhoneNumber,
  GetIndexParams,
  UpdateParams,
  UpdateParamsRepository,
} from 'src/lib';
import { SheetsName } from 'src/constants';
import { Logger } from '@nestjs/common';
import { datesMatch, extractCalendarDate, namesMatch } from '../helpers/names-match.helper';
import { calculateCapacityForRequestedWindow } from '../helpers/capacity-overlap.helper';

@Injectable()
export class GoogleSheetsService {
  private readonly logger = new Logger(GoogleSheetsService.name);
  constructor(private readonly googleSheetsRepository: GoogleSheetsRepository) {}

  private static readonly CLOSED_DAYS_RANGE = `${SheetsName.CLOSED_DAYS}!A:C`;
  private static readonly CLOSED_DAYS_SHEET_INDEX = 3;
  private static readonly CLOSED_SLOTS_RANGE = `${SheetsName.CLOSED_SLOTS}!A:E`;
  private static readonly CLOSED_SLOTS_SHEET_INDEX = 4;

  private formatCalendarDateToIso(date: string): string | null {
    const calendarDate = extractCalendarDate(date);

    if (!calendarDate) {
      return null;
    }

    const [day, month, year] = calendarDate.split('/');

    return `${year}-${month}-${day}`;
  }

  private getNormalizedIsoDate(date: string): string | null {
    const trimmedDate = date.trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
      return trimmedDate;
    }

    return this.formatCalendarDateToIso(trimmedDate);
  }

  private async getClosedDayEntries(): Promise<
    { rowIndex: number; date: string; reason: string | null; createdAt: string | null }[]
  > {
    const rows = await this.googleSheetsRepository.getDates(GoogleSheetsService.CLOSED_DAYS_RANGE);

    return rows
      .map((row, index) => {
        const normalizedDate = this.getNormalizedIsoDate(String(row[0] ?? ''));

        if (!normalizedDate) {
          return null;
        }

        return {
          rowIndex: index + 1,
          date: normalizedDate,
          reason: row[1] ? String(row[1]) : null,
          createdAt: row[2] ? String(row[2]) : null,
        };
      })
      .filter(
        (
          entry,
        ): entry is {
          rowIndex: number;
          date: string;
          reason: string | null;
          createdAt: string | null;
        } => entry !== null,
      );
  }

  private toMinutes(time: string): number | null {
    const match = /^(\d{2}):(\d{2})$/.exec(time.trim());

    if (!match) {
      return null;
    }

    const hours = Number(match[1]);
    const minutes = Number(match[2]);

    if (hours > 23 || minutes > 59) {
      return null;
    }

    return hours * 60 + minutes;
  }

  private getSlotEndTime(time: string): string {
    const startMinutes = this.toMinutes(time);

    if (startMinutes === null) {
      return time;
    }

    const endMinutes = startMinutes + this.getReservationDurationMinutes();
    const normalizedEndMinutes = endMinutes % (24 * 60);
    const hours = Math.floor(normalizedEndMinutes / 60)
      .toString()
      .padStart(2, '0');
    const minutes = (normalizedEndMinutes % 60).toString().padStart(2, '0');

    return `${hours}:${minutes}`;
  }

  private hasTimeOverlap(
    leftStartTime: string,
    leftEndTime: string,
    rightStartTime: string,
    rightEndTime: string,
  ): boolean {
    const leftStart = this.toMinutes(leftStartTime);
    const leftEnd = this.toMinutes(leftEndTime);
    const rightStart = this.toMinutes(rightStartTime);
    const rightEnd = this.toMinutes(rightEndTime);

    if (leftStart === null || leftEnd === null || rightStart === null || rightEnd === null) {
      return false;
    }

    return leftStart < rightEnd && rightStart < leftEnd;
  }

  private async getClosedSlotEntries(): Promise<
    {
      rowIndex: number;
      date: string;
      fromTime: string;
      toTime: string;
      reason: string | null;
      createdAt: string | null;
    }[]
  > {
    const rows = await this.googleSheetsRepository.getDates(GoogleSheetsService.CLOSED_SLOTS_RANGE);

    return rows
      .map((row, index) => {
        const normalizedDate = this.getNormalizedIsoDate(String(row[0] ?? ''));
        const fromTime = String(row[1] ?? '').trim();
        const toTime = String(row[2] ?? '').trim();
        const fromMinutes = this.toMinutes(fromTime);
        const toMinutes = this.toMinutes(toTime);

        if (
          !normalizedDate ||
          fromMinutes === null ||
          toMinutes === null ||
          fromMinutes >= toMinutes
        ) {
          return null;
        }

        return {
          rowIndex: index + 1,
          date: normalizedDate,
          fromTime,
          toTime,
          reason: row[3] ? String(row[3]) : null,
          createdAt: row[4] ? String(row[4]) : null,
        };
      })
      .filter(
        (
          entry,
        ): entry is {
          rowIndex: number;
          date: string;
          fromTime: string;
          toTime: string;
          reason: string | null;
          createdAt: string | null;
        } => entry !== null,
      );
  }

  private consolidateClosedSlotEntries(
    entries: {
      date: string;
      fromTime: string;
      toTime: string;
      reason: string | null;
      createdAt: string | null;
      rowIndex?: number;
    }[],
  ): {
    date: string;
    fromTime: string;
    toTime: string;
    reason: string | null;
    createdAt: string;
  }[] {
    return [...entries]
      .sort((left, right) => {
        const leftStart = this.toMinutes(left.fromTime) ?? 0;
        const rightStart = this.toMinutes(right.fromTime) ?? 0;

        if (leftStart !== rightStart) {
          return leftStart - rightStart;
        }

        const leftCreatedAt = left.createdAt ?? '';
        const rightCreatedAt = right.createdAt ?? '';

        if (leftCreatedAt !== rightCreatedAt) {
          return leftCreatedAt.localeCompare(rightCreatedAt);
        }

        return (left.rowIndex ?? 0) - (right.rowIndex ?? 0);
      })
      .reduce<
        {
          date: string;
          fromTime: string;
          toTime: string;
          reason: string | null;
          createdAt: string;
        }[]
      >((accumulator, currentEntry) => {
        const lastEntry = accumulator[accumulator.length - 1];
        const currentCreatedAt = currentEntry.createdAt ?? new Date().toISOString();

        if (
          !lastEntry ||
          lastEntry.date !== currentEntry.date ||
          (this.toMinutes(currentEntry.fromTime) ?? 0) > (this.toMinutes(lastEntry.toTime) ?? 0)
        ) {
          accumulator.push({
            date: currentEntry.date,
            fromTime: currentEntry.fromTime,
            toTime: currentEntry.toTime,
            reason: currentEntry.reason,
            createdAt: currentCreatedAt,
          });

          return accumulator;
        }

        if ((this.toMinutes(currentEntry.toTime) ?? 0) > (this.toMinutes(lastEntry.toTime) ?? 0)) {
          lastEntry.toTime = currentEntry.toTime;
        }

        if (currentCreatedAt >= lastEntry.createdAt) {
          lastEntry.reason = currentEntry.reason;
          lastEntry.createdAt = currentCreatedAt;
        }

        return accumulator;
      }, []);
  }

  private getClosedSlotsByDate(
    closedSlots: {
      date: string;
      fromTime: string;
      toTime: string;
      reason: string | null;
      createdAt: string | null;
    }[],
    date: string,
  ): { fromTime: string; toTime: string; reason: string | null }[] {
    const normalizedDate = this.getNormalizedIsoDate(date);

    if (!normalizedDate) {
      return [];
    }

    return closedSlots
      .filter((entry) => entry.date === normalizedDate)
      .map(({ fromTime, toTime, reason }) => ({
        fromTime,
        toTime,
        reason,
      }));
  }

  private async getAvailabilityBlockedByClosedSlot(
    date: string,
    time: string,
  ): Promise<Availability | null> {
    const closedSlots = await this.getClosedSlotEntries();
    const dayClosedSlots = this.getClosedSlotsByDate(closedSlots, date);
    const slotEndTime = this.getSlotEndTime(time);

    const isClosed = dayClosedSlots.some((closedSlot) =>
      this.hasTimeOverlap(time, slotEndTime, closedSlot.fromTime, closedSlot.toTime),
    );

    if (!isClosed) {
      return null;
    }

    return {
      isAvailable: false,
      reservations: 0,
      available: 0,
    };
  }

  private phonesMatch(leftPhone?: string | null, rightPhone?: string | null): boolean {
    if (!leftPhone || !rightPhone) {
      return false;
    }

    const normalizedLeftPhone = formatPhoneNumber(leftPhone) ?? leftPhone;
    const normalizedRightPhone = formatPhoneNumber(rightPhone) ?? rightPhone;

    return (
      leftPhone === rightPhone ||
      leftPhone === normalizedRightPhone ||
      normalizedLeftPhone === rightPhone ||
      normalizedLeftPhone === normalizedRightPhone
    );
  }

  private getOnlineMaxCapacity(): number {
    return computeOnlineMaxCapacity(
      process.env.MAX_CAPACITY_TOTAL,
      process.env.ONLINE_BUFFER_PERCENT,
    );
  }

  private getReservationDurationMinutes(): number {
    const duration = Number(process.env.RESERVATION_DURATION_MINUTES ?? 120);
    if (Number.isNaN(duration) || duration <= 0) {
      return 120;
    }

    return duration;
  }

  private getSlotIntervalMinutes(): number {
    const interval = Number(process.env.SLOT_INTERVAL_MINUTES ?? 60);
    if (Number.isNaN(interval) || interval <= 0) {
      return 60;
    }

    return interval;
  }

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
    try {
      const data = await this.googleSheetsRepository.getDates(range);

      const index =
        data.findIndex((row) => datesMatch(row[0], date) && row[1] && row[1] === time) + 1;

      if (index === -1 || index === undefined || index === 0) {
        return -1;
      }

      return index;
    } catch (error) {
      this.googleSheetsRepository.failure(error);
    }
  }

  async getDateData(
    date: string,
    time: string,
    range: string = `${SHEETS_NAMES[0]}!A:C`,
  ): Promise<string[] | null> {
    try {
      const data = await this.googleSheetsRepository.getDates(range);

      const index =
        data.findIndex((row) => datesMatch(row[0], date) && row[1] && row[1] === time) + 1;

      if (index === -1 || index === undefined || index === 0) {
        return null;
      }

      const dateData = data[index - 1];

      return dateData;
    } catch (error) {
      this.googleSheetsRepository.failure(error);
    }
  }

  async getDateIndexByData(getIndexParams: GetIndexParams): Promise<number> {
    const { date, time, name, phone } = getIndexParams;

    try {
      const data = await this.googleSheetsRepository.getDates(`${SHEETS_NAMES[0]}!A:F`);

      const index =
        data.findIndex(
          (row) =>
            datesMatch(row[0], date) &&
            row[1] &&
            row[1] === time &&
            namesMatch(name, row[2]) &&
            this.phonesMatch(row[3], phone),
        ) + 1;

      if (index === -1 || index === undefined || index === 0) {
        return -1;
      }

      return index;
    } catch (error) {
      this.googleSheetsRepository.failure(error);
    }
  }

  async getDateIndexByDate(date: string, sheetIndex: number): Promise<number> {
    try {
      const data = await this.googleSheetsRepository.getDates(`${SHEETS_NAMES[sheetIndex]}!A:A`);

      const index = data.findIndex((row) => row[0] === date) + 1;

      if (index === -1 || index === undefined || index === 0) {
        return -1;
      }

      return index;
    } catch (error) {
      this.googleSheetsRepository.failure(error);
    }
  }

  async getAgendaDateLabel(date: string): Promise<string | null> {
    try {
      const data = await this.googleSheetsRepository.getDates(`${SHEETS_NAMES[1]}!A:A`);
      const matchingRow = data.find((row) => datesMatch(row[0], date) && row[0] !== 'Fecha');

      return matchingRow?.[0] ? String(matchingRow[0]) : null;
    } catch (error) {
      this.googleSheetsRepository.failure(error);
    }
  }

  async getDatetimeDates(date: string, time: string): Promise<DateTime> {
    try {
      const data = await this.googleSheetsRepository.getDates(`${SHEETS_NAMES[0]}!A:F`);

      const filteredData = data.filter(
        (row) => datesMatch(row[0], date) && row[1] && row[1] === time,
      );

      if (filteredData.length === 0) {
        return [];
      }

      return filteredData;
    } catch (error) {
      this.googleSheetsRepository.failure(error);
    }
  }

  async hasReservationByDateAndPhone(
    date: string,
    phone: string,
    excludedRowIndex?: number,
  ): Promise<boolean> {
    try {
      const data = await this.googleSheetsRepository.getDates(`${SHEETS_NAMES[0]}!A:F`);

      return data.some((row, index) => {
        const rowNumber = index + 1;
        if (excludedRowIndex && rowNumber === excludedRowIndex) {
          return false;
        }

        const rowDate = row[0];
        const rowPhone = row[3];
        const rowName = row[2];

        if (!rowDate || !rowPhone || !rowName) {
          return false;
        }

        return datesMatch(rowDate, date) && this.phonesMatch(rowPhone, phone);
      });
    } catch (error) {
      this.googleSheetsRepository.failure(error);
    }
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
    try {
      await this.googleSheetsRepository.createReservation(range, values);
    } catch (error) {
      this.googleSheetsRepository.failure(error);
    }
  }

  async getAvailability(date: string, time: string): Promise<Availability> {
    const availabilityBlockedByClosedSlot = await this.getAvailabilityBlockedByClosedSlot(
      date,
      time,
    );

    if (availabilityBlockedByClosedSlot) {
      return availabilityBlockedByClosedSlot;
    }

    let isAvailable = false;

    const index = await this.getDate(date, time, `${SHEETS_NAMES[1]}!A:C`);

    if (index === -1) {
      return {
        isAvailable: false,
        reservations: 0,
        available: 0,
      };
    }

    try {
      const data = await this.googleSheetsRepository.getAvailability(
        `${SHEETS_NAMES[1]}!C${index}:D${index}`,
      );

      const reservations = Number(data[0][0]);

      const available = Number(data[0][1]);

      const maxReservations = this.getOnlineMaxCapacity();

      if (available != null && available > 0 && reservations <= maxReservations) {
        isAvailable = true;
      }

      return {
        isAvailable,
        reservations,
        available,
      };
    } catch (error) {
      this.googleSheetsRepository.failure(error);
    }
  }

  async getAvailabilityFromReservations(
    date: string,
    time: string,
    requestedPeople: number = 1,
    excludedRowIndex?: number,
  ): Promise<Availability> {
    const availabilityBlockedByClosedSlot = await this.getAvailabilityBlockedByClosedSlot(
      date,
      time,
    );

    if (availabilityBlockedByClosedSlot) {
      return availabilityBlockedByClosedSlot;
    }

    const availabilityRows = await this.googleSheetsRepository.getDates(`${SHEETS_NAMES[1]}!A:D`);
    const allReservations = await this.googleSheetsRepository.getDates(`${SHEETS_NAMES[0]}!A:F`);

    const reservationDurationMinutes = this.getReservationDurationMinutes();
    const slotIntervalMinutes = this.getSlotIntervalMinutes();
    const onlineMaxCapacity = this.getOnlineMaxCapacity();
    const availableSlotTimes = availabilityRows
      .filter((row) => datesMatch(row[0], date) && row[1])
      .map((row) => String(row[1]));

    const capacity = calculateCapacityForRequestedWindow({
      date,
      time,
      requestedPeople,
      reservationDurationMinutes,
      slotIntervalMinutes,
      onlineMaxCapacity,
      availableSlotTimes,
      existingReservations: allReservations,
      excludedRowIndex,
    });

    return {
      isAvailable: capacity.canReserve,
      reservations: capacity.occupiedPeople,
      available: capacity.availableCapacity,
    };
  }

  async isDayClosed(date: string): Promise<boolean> {
    const normalizedDate = this.getNormalizedIsoDate(date);

    if (!normalizedDate) {
      return false;
    }

    const closedDays = await this.getClosedDayEntries();
    return closedDays.some((closedDay) => closedDay.date === normalizedDate);
  }

  async closeDay(payload: DashboardCloseDayType): Promise<void> {
    const normalizedDate = this.getNormalizedIsoDate(payload.date);

    if (!normalizedDate) {
      throw new Error(`Formato de fecha invalido para ClosedDays: ${payload.date}`);
    }

    const closedDays = await this.getClosedDayEntries();
    const alreadyClosed = closedDays.some((closedDay) => closedDay.date === normalizedDate);

    if (alreadyClosed) {
      return;
    }

    const createdAt = new Date().toISOString();

    await this.googleSheetsRepository.appendRow(GoogleSheetsService.CLOSED_DAYS_RANGE, [
      [normalizedDate, payload.reason?.trim() || '', createdAt],
    ]);
  }

  async closeSlot(
    payload: DashboardCloseSlotType,
  ): Promise<{ fromTime: string; toTime: string; reason: string | null }> {
    const normalizedDate = this.getNormalizedIsoDate(payload.date);
    const fromTime = payload.fromTime.trim();
    const toTime = payload.toTime.trim();
    const normalizedReason = payload.reason?.trim() || null;
    const fromMinutes = this.toMinutes(fromTime);
    const toMinutes = this.toMinutes(toTime);

    if (!normalizedDate || fromMinutes === null || toMinutes === null || fromMinutes >= toMinutes) {
      throw new Error(`Formato invalido para ClosedSlots: ${payload.date} ${fromTime}-${toTime}`);
    }

    const existingClosedSlots = await this.getClosedSlotEntries();
    const sameDateEntries = existingClosedSlots.filter((entry) => entry.date === normalizedDate);
    const consolidatedEntries = this.consolidateClosedSlotEntries([
      ...sameDateEntries,
      {
        date: normalizedDate,
        fromTime,
        toTime,
        reason: normalizedReason,
        createdAt: new Date().toISOString(),
      },
    ]);

    for (const entry of sameDateEntries.sort((left, right) => right.rowIndex - left.rowIndex)) {
      await this.googleSheetsRepository.deleteRow(
        entry.rowIndex,
        GoogleSheetsService.CLOSED_SLOTS_SHEET_INDEX,
      );
    }

    await this.googleSheetsRepository.appendRow(
      GoogleSheetsService.CLOSED_SLOTS_RANGE,
      consolidatedEntries.map((entry) => [
        entry.date,
        entry.fromTime,
        entry.toTime,
        entry.reason ?? '',
        entry.createdAt,
      ]),
    );

    const consolidatedEntry =
      consolidatedEntries.find((entry) =>
        this.hasTimeOverlap(entry.fromTime, entry.toTime, fromTime, toTime),
      ) ?? consolidatedEntries[consolidatedEntries.length - 1];

    return {
      fromTime: consolidatedEntry.fromTime,
      toTime: consolidatedEntry.toTime,
      reason: consolidatedEntry.reason,
    };
  }

  async openDay(date: string): Promise<void> {
    const normalizedDate = this.getNormalizedIsoDate(date);

    if (!normalizedDate) {
      return;
    }

    const closedDays = await this.getClosedDayEntries();
    const closedDay = closedDays.find((entry) => entry.date === normalizedDate);

    if (!closedDay) {
      return;
    }

    await this.googleSheetsRepository.deleteRow(
      closedDay.rowIndex,
      GoogleSheetsService.CLOSED_DAYS_SHEET_INDEX,
    );
  }

  async deleteClosedDaysBefore(date: string): Promise<number> {
    const normalizedCutoffDate = this.getNormalizedIsoDate(date);

    if (!normalizedCutoffDate) {
      throw new Error(`Formato de fecha invalido para limpiar ClosedDays: ${date}`);
    }

    const closedDays = await this.getClosedDayEntries();
    const rowsToDelete = closedDays.filter((closedDay) => closedDay.date < normalizedCutoffDate);

    if (rowsToDelete.length === 0) {
      return 0;
    }

    for (const closedDay of rowsToDelete.sort((left, right) => right.rowIndex - left.rowIndex)) {
      await this.googleSheetsRepository.deleteRow(
        closedDay.rowIndex,
        GoogleSheetsService.CLOSED_DAYS_SHEET_INDEX,
      );
    }

    return rowsToDelete.length;
  }

  async getDayAvailability(date: string): Promise<string[][]> {
    if (await this.isDayClosed(date)) {
      return [];
    }

    const range = `${SHEETS_NAMES[1]}!A:D`;

    try {
      const [data, closedSlots] = await Promise.all([
        this.googleSheetsRepository.getDates(range),
        this.getClosedSlotEntries(),
      ]);
      const allDaysRows = data.filter((row) => row[0] !== 'Fecha');
      const dayClosedSlots = this.getClosedSlotsByDate(closedSlots, date);

      const requestedDayRows = allDaysRows.filter(
        (r) =>
          datesMatch(r[0], date) &&
          r[3] != '0' &&
          !dayClosedSlots.some((closedSlot) =>
            this.hasTimeOverlap(
              String(r[1] ?? ''),
              this.getSlotEndTime(String(r[1] ?? '')),
              closedSlot.fromTime,
              closedSlot.toTime,
            ),
          ),
      );

      return requestedDayRows;
    } catch (error) {
      this.googleSheetsRepository.failure(error);
    }
  }

  async getAvailableReservationDates(): Promise<DashboardAvailableDates> {
    const range = `${SHEETS_NAMES[1]}!A:A`;

    try {
      const [data, closedDays] = await Promise.all([
        this.googleSheetsRepository.getDates(range),
        this.getClosedDayEntries(),
      ]);
      const closedDaysSet = new Set(closedDays.map((closedDay) => closedDay.date));

      return [...new Set(data.map((row) => this.formatCalendarDateToIso(String(row[0] ?? ''))))]
        .filter((date): date is string => Boolean(date))
        .sort((leftDate, rightDate) => leftDate.localeCompare(rightDate))
        .map((date) => ({
          date,
          isClosed: closedDaysSet.has(date),
        }));
    } catch (error) {
      this.googleSheetsRepository.failure(error);
    }
  }

  async getReservationsByDate(date: string): Promise<DashboardReservation[]> {
    try {
      const reservations = await this.googleSheetsRepository.getReservationsByDate(date);

      return reservations
        .filter((row) => row[0] !== 'Fecha')
        .map((row) => ({
          date: String(row[0] ?? ''),
          time: String(row[1] ?? ''),
          name: String(row[2] ?? ''),
          phone: String(row[3] ?? ''),
          service: String(row[4] ?? ''),
          quantity: Number(row[5] ?? 0),
        }))
        .filter(
          (reservation) =>
            reservation.date &&
            reservation.time &&
            reservation.name &&
            reservation.phone &&
            reservation.service &&
            !Number.isNaN(reservation.quantity) &&
            reservation.quantity > 0,
        );
    } catch (error) {
      this.googleSheetsRepository.failure(error);
    }
  }

  async getReservationByDateTimeAndPhone(
    date: string,
    time: string,
    phone: string,
  ): Promise<DashboardReservation | null> {
    const reservations = await this.getReservationsByDate(date);

    return (
      reservations.find(
        (reservation) => reservation.time === time && this.phonesMatch(reservation.phone, phone),
      ) ?? null
    );
  }

  async getAvailabilitySlotsByDate(date: string): Promise<DashboardReservationSlot[]> {
    if (await this.isDayClosed(date)) {
      return [];
    }

    const [data, closedSlots] = await Promise.all([
      this.googleSheetsRepository.getDates(`${SHEETS_NAMES[1]}!A:D`),
      this.getClosedSlotEntries(),
    ]);
    const dayClosedSlots = this.getClosedSlotsByDate(closedSlots, date);
    const rows = data.filter(
      (row) => row[0] !== 'Fecha' && datesMatch(row[0], date) && row[1] && row[3] != '0',
    );

    return rows.map((row) => ({
      time: String(row[1] ?? ''),
      reserved: Number(row[2] ?? 0),
      available: Number(row[3] ?? 0),
      isClosed: dayClosedSlots.some((closedSlot) =>
        this.hasTimeOverlap(
          String(row[1] ?? ''),
          this.getSlotEndTime(String(row[1] ?? '')),
          closedSlot.fromTime,
          closedSlot.toTime,
        ),
      ),
      reason:
        dayClosedSlots.find((closedSlot) =>
          this.hasTimeOverlap(
            String(row[1] ?? ''),
            this.getSlotEndTime(String(row[1] ?? '')),
            closedSlot.fromTime,
            closedSlot.toTime,
          ),
        )?.reason ?? null,
    }));
  }

  async updateAvailabilityFromReservations(updateParams: UpdateParams) {
    const { reservations, available, date, time } = updateParams;

    const index = await this.getDate(date, time, `${SHEETS_NAMES[1]}!A:C`);

    try {
      const TOTAL = this.getOnlineMaxCapacity();
      if (available < 0 || reservations < 0 || reservations > TOTAL || available > TOTAL) {
        this.logger.warn(`Estado inválido: reservations=${reservations}, available=${available}`);
        return 'Estado inválido de disponibilidad.';
      }

      const updateParams: UpdateParamsRepository = {
        reservations,
        available,
      };

      await this.googleSheetsRepository.updateAvailabilitySheet(
        `${SHEETS_NAMES[1]}!C${index}:D${index}`,
        updateParams,
      );
    } catch (error) {
      this.googleSheetsRepository.failure(error);
    }
  }

  async refreshAvailabilityForDate(date: string): Promise<void> {
    const slots = await this.googleSheetsRepository.getDates(`${SHEETS_NAMES[1]}!A:D`);
    const daySlots = slots
      .map((row, index) => ({
        row,
        rowIndex: index + 1,
      }))
      .filter(({ row }) => datesMatch(row[0], date) && row[1]);

    const reservationDurationMinutes = this.getReservationDurationMinutes();
    const slotIntervalMinutes = this.getSlotIntervalMinutes();
    const onlineMaxCapacity = this.getOnlineMaxCapacity();
    const allReservations = await this.googleSheetsRepository.getDates(`${SHEETS_NAMES[0]}!A:F`);
    const availableSlotTimes = daySlots.map(({ row }) => String(row[1]));

    for (const { row, rowIndex } of daySlots) {
      const slotTime = String(row[1]);

      const capacity = calculateCapacityForRequestedWindow({
        date,
        time: slotTime,
        requestedPeople: 0,
        reservationDurationMinutes,
        slotIntervalMinutes,
        onlineMaxCapacity,
        availableSlotTimes,
        existingReservations: allReservations,
      });

      const occupiedPeople = capacity.occupiedPeople;
      const availableCapacity = capacity.availableCapacity;

      await this.googleSheetsRepository.updateAvailabilitySheet(
        `${SHEETS_NAMES[1]}!C${rowIndex}:D${rowIndex}`,
        {
          reservations: occupiedPeople,
          available: availableCapacity,
        },
      );
    }
  }

  async updateReservationByDate(
    oldDate: string,
    newDate: string,
    oldTime: string,
    newTime?: string,
  ) {
    // Get the data of the old reservation
    // check if the new date is available <- (here)
    // create use-cases for date change and date-time change
    // update the reservation
    // delete the old reservation
    // maybe create some kind of response for errors? (reservation not found, etc)
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
    try {
      await this.googleSheetsRepository.deleteReservation(range);
    } catch (error) {
      this.googleSheetsRepository.failure(error);
    }
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
