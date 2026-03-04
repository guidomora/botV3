import { Injectable } from '@nestjs/common';
import { GoogleSheetsRepository } from '../domain/repository/google-sheets.repository';
import { DateTime } from 'src/lib/types/datetime/datetime.type';
import { SHEETS_NAMES } from 'src/constants/sheets-name/sheets-name';
import { AddDataType } from 'src/lib/types/add-data.type';
import {
  Availability,
  computeOnlineMaxCapacity,
  formatPhoneNumber,
  GetIndexParams,
  UpdateParams,
  UpdateParamsRepository,
} from 'src/lib';
import { SheetsName } from 'src/constants';
import { Logger } from '@nestjs/common';
import { datesMatch, namesMatch } from '../helpers/names-match.helper';
import { calculateCapacityForRequestedWindow } from '../helpers/capacity-overlap.helper';

@Injectable()
export class GoogleSheetsService {
  private readonly logger = new Logger(GoogleSheetsService.name);
  constructor(private readonly googleSheetsRepository: GoogleSheetsRepository) {}

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
    const formattedPhone = formatPhoneNumber(phone);

    try {
      const data = await this.googleSheetsRepository.getDates(`${SHEETS_NAMES[0]}!A:F`);

      console.log('data', date, time, name, formattedPhone);

      const index =
        data.findIndex(
          (row) =>
            datesMatch(row[0], date) &&
            row[1] &&
            row[1] === time &&
            namesMatch(name, row[2]) &&
            (row[3] === formattedPhone || row[3] === phone),
        ) + 1;

      console.log('index', index);

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
    const formattedPhone = formatPhoneNumber(phone) ?? phone;

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

        return datesMatch(rowDate, date) && (rowPhone === formattedPhone || rowPhone === phone);
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
    const allReservations = await this.googleSheetsRepository.getDates(`${SHEETS_NAMES[0]}!A:F`);

    const reservationDurationMinutes = this.getReservationDurationMinutes();
    const onlineMaxCapacity = this.getOnlineMaxCapacity();

    const capacity = calculateCapacityForRequestedWindow({
      date,
      time,
      requestedPeople,
      reservationDurationMinutes,
      onlineMaxCapacity,
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
    const range = `${SHEETS_NAMES[1]}!A:D`;

    try {
      const data = await this.googleSheetsRepository.getDates(range);
      const allDaysRows = data.filter((row) => row[0] !== 'Fecha');

      const requestedDayRows = allDaysRows.filter((r) => r[0] === date && r[3] != '0');

      return requestedDayRows;
    } catch (error) {
      this.googleSheetsRepository.failure(error);
    }
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
    const daySlots = slots.filter((row) => datesMatch(row[0], date) && row[1]);

    const reservationDurationMinutes = this.getReservationDurationMinutes();
    const onlineMaxCapacity = this.getOnlineMaxCapacity();
    const allReservations = await this.googleSheetsRepository.getDates(`${SHEETS_NAMES[0]}!A:F`);

    for (const slot of daySlots) {
      const slotTime = String(slot[1]);

      const capacity = calculateCapacityForRequestedWindow({
        date,
        time: slotTime,
        requestedPeople: 0,
        reservationDurationMinutes,
        onlineMaxCapacity,
        existingReservations: allReservations,
      });

      const slotRowIndex = await this.getDate(date, slotTime, `${SHEETS_NAMES[1]}!A:C`);

      if (slotRowIndex === -1) {
        continue;
      }

      const occupiedPeople = capacity.occupiedPeople;
      const availableCapacity = capacity.availableCapacity;

      await this.googleSheetsRepository.updateAvailabilitySheet(
        `${SHEETS_NAMES[1]}!C${slotRowIndex}:D${slotRowIndex}`,
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
      console.log(oldDateData);

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
