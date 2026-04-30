import { Injectable } from '@nestjs/common';
import { SheetsName } from 'src/constants';
import {
  Availability,
  ClosedDayEntry,
  ClosedSlotEntry,
  ClosedSlotSummary,
  DashboardCloseDayType,
  DashboardCloseSlotType,
  DashboardOpenSlotType,
} from 'src/lib';
import {
  consolidateClosedSlotEntries,
  getClosedSlotsByDate,
  subtractOpenRangeFromClosedSlotEntries,
} from '../helpers/closed-slot-entry.helper';
import { getNormalizedIsoDate } from '../helpers/google-sheets-date.helper';
import { getSlotEndTime, hasTimeOverlap, toMinutes } from '../helpers/google-sheets-time.helper';
import { GoogleSheetsRepository } from '../domain/repository/google-sheets.repository';

@Injectable()
export class GoogleSheetsClosedScheduleService {
  private static readonly CLOSED_DAYS_RANGE = `${SheetsName.CLOSED_DAYS}!A:C`;
  private static readonly CLOSED_DAYS_SHEET_INDEX = 3;
  private static readonly CLOSED_SLOTS_RANGE = `${SheetsName.CLOSED_SLOTS}!A:E`;
  private static readonly CLOSED_SLOTS_SHEET_INDEX = 4;

  constructor(private readonly googleSheetsRepository: GoogleSheetsRepository) {}

  async getClosedDayEntries(): Promise<ClosedDayEntry[]> {
    const rows = await this.googleSheetsRepository.getDates(
      GoogleSheetsClosedScheduleService.CLOSED_DAYS_RANGE,
    );

    return rows
      .map<ClosedDayEntry | null>((row, index) => {
        const normalizedDate = getNormalizedIsoDate(String(row[0] ?? ''));

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
      .filter((entry): entry is ClosedDayEntry => entry !== null);
  }

  async getClosedSlotEntries(): Promise<ClosedSlotEntry[]> {
    const rows = await this.googleSheetsRepository.getDates(
      GoogleSheetsClosedScheduleService.CLOSED_SLOTS_RANGE,
    );

    return rows
      .map<ClosedSlotEntry | null>((row, index) => {
        const normalizedDate = getNormalizedIsoDate(String(row[0] ?? ''));
        const fromTime = String(row[1] ?? '').trim();
        const toTime = String(row[2] ?? '').trim();
        const fromMinutes = toMinutes(fromTime);
        const toMinutesValue = toMinutes(toTime);

        if (
          !normalizedDate ||
          fromMinutes === null ||
          toMinutesValue === null ||
          fromMinutes >= toMinutesValue
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
      .filter((entry): entry is ClosedSlotEntry => entry !== null);
  }

  getClosedSlotsByDate(closedSlots: ClosedSlotEntry[], date: string): ClosedSlotSummary[] {
    const normalizedDate = getNormalizedIsoDate(date);

    if (!normalizedDate) {
      return [];
    }

    return getClosedSlotsByDate(closedSlots, normalizedDate);
  }

  async getAvailabilityBlockedByClosedSlot(
    date: string,
    time: string,
    reservationDurationMinutes: number,
  ): Promise<Availability | null> {
    const closedSlots = await this.getClosedSlotEntries();
    const dayClosedSlots = this.getClosedSlotsByDate(closedSlots, date);
    const slotEndTime = getSlotEndTime(time, reservationDurationMinutes);

    const isClosed = dayClosedSlots.some((closedSlot) =>
      hasTimeOverlap(time, slotEndTime, closedSlot.fromTime, closedSlot.toTime),
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

  async isDayClosed(date: string): Promise<boolean> {
    const normalizedDate = getNormalizedIsoDate(date);

    if (!normalizedDate) {
      return false;
    }

    const closedDays = await this.getClosedDayEntries();
    return closedDays.some((closedDay) => closedDay.date === normalizedDate);
  }

  async closeDay(payload: DashboardCloseDayType): Promise<void> {
    const normalizedDate = getNormalizedIsoDate(payload.date);

    if (!normalizedDate) {
      throw new Error(`Formato de fecha invalido para ClosedDays: ${payload.date}`);
    }

    const closedDays = await this.getClosedDayEntries();
    const alreadyClosed = closedDays.some((closedDay) => closedDay.date === normalizedDate);

    if (alreadyClosed) {
      return;
    }

    const createdAt = new Date().toISOString();

    await this.googleSheetsRepository.appendRow(
      GoogleSheetsClosedScheduleService.CLOSED_DAYS_RANGE,
      [[normalizedDate, payload.reason?.trim() || '', createdAt]],
    );
  }

  async closeSlot(
    payload: DashboardCloseSlotType,
  ): Promise<{ fromTime: string; toTime: string; reason: string | null }> {
    const normalizedDate = getNormalizedIsoDate(payload.date);
    const fromTime = payload.fromTime.trim();
    const toTime = payload.toTime.trim();
    const normalizedReason = payload.reason?.trim() || null;
    const fromMinutes = toMinutes(fromTime);
    const toMinutesValue = toMinutes(toTime);

    if (
      !normalizedDate ||
      fromMinutes === null ||
      toMinutesValue === null ||
      fromMinutes >= toMinutesValue
    ) {
      throw new Error(`Formato invalido para ClosedSlots: ${payload.date} ${fromTime}-${toTime}`);
    }

    const existingClosedSlots = await this.getClosedSlotEntries();
    const sameDateEntries = existingClosedSlots.filter((entry) => entry.date === normalizedDate);
    const consolidatedEntries = consolidateClosedSlotEntries([
      ...sameDateEntries,
      {
        date: normalizedDate,
        fromTime,
        toTime,
        reason: normalizedReason,
        createdAt: new Date().toISOString(),
      },
    ]);

    for (const entry of sameDateEntries.sort(
      (left, right) => (right.rowIndex ?? 0) - (left.rowIndex ?? 0),
    )) {
      await this.googleSheetsRepository.deleteRow(
        entry.rowIndex ?? 0,
        GoogleSheetsClosedScheduleService.CLOSED_SLOTS_SHEET_INDEX,
      );
    }

    await this.googleSheetsRepository.appendRow(
      GoogleSheetsClosedScheduleService.CLOSED_SLOTS_RANGE,
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
        hasTimeOverlap(entry.fromTime, entry.toTime, fromTime, toTime),
      ) ?? consolidatedEntries[consolidatedEntries.length - 1];

    return {
      fromTime: consolidatedEntry.fromTime,
      toTime: consolidatedEntry.toTime,
      reason: consolidatedEntry.reason,
    };
  }

  async openDay(date: string): Promise<void> {
    const normalizedDate = getNormalizedIsoDate(date);

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
      GoogleSheetsClosedScheduleService.CLOSED_DAYS_SHEET_INDEX,
    );
  }

  async openSlot(payload: DashboardOpenSlotType): Promise<number> {
    const normalizedDate = getNormalizedIsoDate(payload.date);
    const fromTime = payload.fromTime.trim();
    const toTime = payload.toTime.trim();
    const fromMinutes = toMinutes(fromTime);
    const toMinutesValue = toMinutes(toTime);

    if (
      !normalizedDate ||
      fromMinutes === null ||
      toMinutesValue === null ||
      fromMinutes >= toMinutesValue
    ) {
      throw new Error(
        `Formato invalido para reabrir ClosedSlots: ${payload.date} ${fromTime}-${toTime}`,
      );
    }

    const existingClosedSlots = await this.getClosedSlotEntries();
    const sameDateEntries = existingClosedSlots.filter((entry) => entry.date === normalizedDate);
    const reopenedSlotsCount = sameDateEntries.filter((entry) =>
      hasTimeOverlap(entry.fromTime, entry.toTime, fromTime, toTime),
    ).length;

    if (sameDateEntries.length === 0) {
      return 0;
    }

    const remainingEntries = subtractOpenRangeFromClosedSlotEntries(
      sameDateEntries,
      fromTime,
      toTime,
    );

    for (const entry of sameDateEntries.sort(
      (left, right) => (right.rowIndex ?? 0) - (left.rowIndex ?? 0),
    )) {
      await this.googleSheetsRepository.deleteRow(
        entry.rowIndex ?? 0,
        GoogleSheetsClosedScheduleService.CLOSED_SLOTS_SHEET_INDEX,
      );
    }

    if (remainingEntries.length > 0) {
      await this.googleSheetsRepository.appendRow(
        GoogleSheetsClosedScheduleService.CLOSED_SLOTS_RANGE,
        remainingEntries.map((entry) => [
          entry.date,
          entry.fromTime,
          entry.toTime,
          entry.reason ?? '',
          entry.createdAt,
        ]),
      );
    }

    return reopenedSlotsCount;
  }

  async deleteClosedDaysBefore(date: string): Promise<number> {
    const normalizedCutoffDate = getNormalizedIsoDate(date);

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
        GoogleSheetsClosedScheduleService.CLOSED_DAYS_SHEET_INDEX,
      );
    }

    return rowsToDelete.length;
  }
}
