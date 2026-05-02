import { Injectable } from '@nestjs/common';
import { SHEETS_NAMES } from 'src/constants/sheets-name/sheets-name';
import { AddDataType } from 'src/lib/types/add-data.type';
import { DateTime } from 'src/lib/types/datetime/datetime.type';
import { DashboardReservation, formatPhoneNumber, GetIndexParams } from 'src/lib';
import { datesMatch, namesMatch } from '../helpers/names-match.helper';
import { GoogleSheetsRepository } from '../domain/repository/google-sheets.repository';

@Injectable()
export class GoogleSheetsReservationsService {
  constructor(private readonly googleSheetsRepository: GoogleSheetsRepository) {}

  phonesMatch(leftPhone?: string | null, rightPhone?: string | null): boolean {
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

  async createReservation(range: string, values: AddDataType) {
    try {
      await this.googleSheetsRepository.createReservation(range, values);
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

  async deleteReservation(range: string) {
    try {
      await this.googleSheetsRepository.deleteReservation(range);
    } catch (error) {
      this.googleSheetsRepository.failure(error);
    }
  }
}
