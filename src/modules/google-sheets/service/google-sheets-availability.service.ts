import { Injectable, Logger } from '@nestjs/common';
import { SHEETS_NAMES } from 'src/constants/sheets-name/sheets-name';
import {
  Availability,
  computeOnlineMaxCapacity,
  DashboardAvailableDates,
  DashboardReservationSlot,
  UpdateParams,
  UpdateParamsRepository,
} from 'src/lib';
import { datesMatch } from '../helpers/names-match.helper';
import { calculateCapacityForRequestedWindow } from '../helpers/capacity-overlap.helper';
import { formatCalendarDateToIso } from '../helpers/google-sheets-date.helper';
import { getSlotEndTime, hasTimeOverlap } from '../helpers/google-sheets-time.helper';
import { GoogleSheetsRepository } from '../domain/repository/google-sheets.repository';
import { GoogleSheetsClosedScheduleService } from './google-sheets-closed-schedule.service';
import { GoogleSheetsReservationsService } from './google-sheets-reservations.service';

@Injectable()
export class GoogleSheetsAvailabilityService {
  private readonly logger = new Logger(GoogleSheetsAvailabilityService.name);

  constructor(
    private readonly googleSheetsRepository: GoogleSheetsRepository,
    private readonly reservationsService: GoogleSheetsReservationsService,
    private readonly closedScheduleService: GoogleSheetsClosedScheduleService,
  ) {}

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

  async getAgendaDateLabel(date: string): Promise<string | null> {
    try {
      const data = await this.googleSheetsRepository.getDates(`${SHEETS_NAMES[1]}!A:A`);
      const matchingRow = data.find((row) => datesMatch(row[0], date) && row[0] !== 'Fecha');

      return matchingRow?.[0] ? String(matchingRow[0]) : null;
    } catch (error) {
      this.googleSheetsRepository.failure(error);
    }
  }

  async getAvailability(date: string, time: string): Promise<Availability> {
    const availabilityBlockedByClosedSlot =
      await this.closedScheduleService.getAvailabilityBlockedByClosedSlot(
        date,
        time,
        this.getReservationDurationMinutes(),
      );

    if (availabilityBlockedByClosedSlot) {
      return availabilityBlockedByClosedSlot;
    }

    let isAvailable = false;

    const index = await this.reservationsService.getDate(date, time, `${SHEETS_NAMES[1]}!A:C`);

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
    const availabilityBlockedByClosedSlot =
      await this.closedScheduleService.getAvailabilityBlockedByClosedSlot(
        date,
        time,
        this.getReservationDurationMinutes(),
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

  async getDayAvailability(date: string): Promise<string[][]> {
    if (await this.closedScheduleService.isDayClosed(date)) {
      return [];
    }

    const range = `${SHEETS_NAMES[1]}!A:D`;

    try {
      const [data, closedSlots] = await Promise.all([
        this.googleSheetsRepository.getDates(range),
        this.closedScheduleService.getClosedSlotEntries(),
      ]);
      const allDaysRows = data.filter((row) => row[0] !== 'Fecha');
      const dayClosedSlots = this.closedScheduleService.getClosedSlotsByDate(closedSlots, date);

      const requestedDayRows = allDaysRows.filter(
        (r) =>
          datesMatch(r[0], date) &&
          r[3] != '0' &&
          !dayClosedSlots.some((closedSlot) =>
            hasTimeOverlap(
              String(r[1] ?? ''),
              getSlotEndTime(String(r[1] ?? ''), this.getReservationDurationMinutes()),
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
        this.closedScheduleService.getClosedDayEntries(),
      ]);
      const closedDaysSet = new Set(closedDays.map((closedDay) => closedDay.date));

      return [...new Set(data.map((row) => formatCalendarDateToIso(String(row[0] ?? ''))))]
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

  async getAvailabilitySlotsByDate(date: string): Promise<DashboardReservationSlot[]> {
    if (await this.closedScheduleService.isDayClosed(date)) {
      return [];
    }

    const [data, closedSlots] = await Promise.all([
      this.googleSheetsRepository.getDates(`${SHEETS_NAMES[1]}!A:D`),
      this.closedScheduleService.getClosedSlotEntries(),
    ]);
    const dayClosedSlots = this.closedScheduleService.getClosedSlotsByDate(closedSlots, date);
    const rows = data.filter(
      (row) => row[0] !== 'Fecha' && datesMatch(row[0], date) && row[1] && row[3] != '0',
    );

    return rows.map((row) => ({
      time: String(row[1] ?? ''),
      reserved: Number(row[2] ?? 0),
      available: Number(row[3] ?? 0),
      isClosed: dayClosedSlots.some((closedSlot) =>
        hasTimeOverlap(
          String(row[1] ?? ''),
          getSlotEndTime(String(row[1] ?? ''), this.getReservationDurationMinutes()),
          closedSlot.fromTime,
          closedSlot.toTime,
        ),
      ),
      reason:
        dayClosedSlots.find((closedSlot) =>
          hasTimeOverlap(
            String(row[1] ?? ''),
            getSlotEndTime(String(row[1] ?? ''), this.getReservationDurationMinutes()),
            closedSlot.fromTime,
            closedSlot.toTime,
          ),
        )?.reason ?? null,
    }));
  }

  async updateAvailabilityFromReservations(updateParams: UpdateParams) {
    const { reservations, available, date, time } = updateParams;

    const index = await this.reservationsService.getDate(date, time, `${SHEETS_NAMES[1]}!A:C`);

    try {
      const total = this.getOnlineMaxCapacity();
      if (available < 0 || reservations < 0 || reservations > total || available > total) {
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
}
