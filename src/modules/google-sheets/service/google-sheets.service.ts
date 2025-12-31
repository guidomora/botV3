import { Injectable } from "@nestjs/common";
import { GoogleSheetsRepository } from "../domain/repository/google-sheets.repository";
import { DateTime } from "src/lib/types/datetime/datetime.type";
import { SHEETS_NAMES } from "src/constants/sheets-name/sheets-name";
import { AddDataType } from "src/lib/types/add-data.type";
import { TablesInfo } from "src/constants/tables-info/tables-info";
import { Availability, GetIndexParams, ReservationOperation, UpdateParams, UpdateParamsRepository } from "src/lib";
import { SheetsName } from "src/constants";



@Injectable()
export class GoogleSheetsService {
  constructor(
    private readonly googleSheetsRepository: GoogleSheetsRepository
  ) { }

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

  async checkDate(date: string): Promise<boolean> {
    try {
      const data = await this.googleSheetsRepository.getDates();

      const dateExists = data.some(row => row[0] === date);
      return dateExists;
    } catch (error) {
      this.googleSheetsRepository.failure(error);
    }
  }

  async getDate(date: string, time: string, range: string = `${SHEETS_NAMES[0]}!A:C`): Promise<number> {
    try {
      const data = await this.googleSheetsRepository.getDates(range);

      const index = data.findIndex(row => row[0] === date && row[1] === time) + 1;

      if (index === -1 || index === undefined || index === 0) {
        return -1
      }

      return index;
    } catch (error) {
      this.googleSheetsRepository.failure(error);
    }
  }

  async getDateData(date: string, time: string, range: string = `${SHEETS_NAMES[0]}!A:C`): Promise<string[] | null> {
    try {
      const data = await this.googleSheetsRepository.getDates(range);

      const index = data.findIndex(row => row[0] === date && row[1] === time) + 1;

      if (index === -1 || index === undefined || index === 0) {
        return null
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

      const index = data.findIndex(row => row[0] === date && row[1] === time && row[2] === name?.toLowerCase() && row[3] === phone) + 1;

      if (index === -1 || index === undefined || index === 0) {
        return -1
      }

      return index;
    } catch (error) {
      this.googleSheetsRepository.failure(error);
    }
  }

  async getDateIndexByDate(date: string, sheetIndex: number): Promise<number> {
    try {
      const data = await this.googleSheetsRepository.getDates(`${SHEETS_NAMES[sheetIndex]}!A:A`);

      const index = data.findIndex(row => row[0] === date) + 1;

      if (index === -1 || index === undefined || index === 0) {
        return -1
      }

      return index;
    } catch (error) {
      this.googleSheetsRepository.failure(error);
    }
  }

  async getDatetimeDates(date: string, time: string): Promise<DateTime> {
    try {
      const data = await this.googleSheetsRepository.getDates(`${SHEETS_NAMES[0]}!A:F`);

      const filteredData = data.filter(row => row[0] === date && row[1] === time);

      if (filteredData.length === 0) {
        return []
      }

      return filteredData;
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

    const index = await this.getDate(date, time, `${SHEETS_NAMES[1]}!A:C`)

    if (index === -1) {
      return {
        isAvailable: false,
        reservations: 0,
        available: 0
      };
    }

    try {
      const data = await this.googleSheetsRepository.getAvailability(`${SHEETS_NAMES[1]}!C${index}:D${index}`);

      const reservations = Number(data[0][0])

      const available = Number(data[0][1])

      const maxReservations = Number(TablesInfo.AVAILABLE)

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

  async getDayAvailability(date: string): Promise<string[][]> {
    const range = `${SHEETS_NAMES[1]}!A:D`

    try {
      const data = await this.googleSheetsRepository.getDates(range);
      const allDaysRows = data.filter(row => row[0] !== 'Fecha');

      const requestedDayRows = allDaysRows.filter(r => r[0] === date && r[3] != '0');

      return requestedDayRows
    } catch (error) {
      this.googleSheetsRepository.failure(error);
    }
  }

  async updateAvailability(operation: ReservationOperation, updateParams: UpdateParams) {

    let { reservations, available, date, time } = updateParams;

    const index = await this.getDate(date, time, `${SHEETS_NAMES[1]}!A:C`)

    try {

      if (available === 0 && operation === ReservationOperation.ADD) {
        throw new Error('No hay disponibilidad para esa fecha y horario. Error en la cantidad de reservas')
      }

      if (operation === ReservationOperation.ADD) {
        reservations += 1;
        available -= 1;
      } else {
        reservations -= 1;
        available += 1;
      }

      const updateParams: UpdateParamsRepository = {
        reservations,
        available,
      }

      await this.googleSheetsRepository.updateAvailabilitySheet(`${SHEETS_NAMES[1]}!C${index}:D${index}`, updateParams);
    } catch (error) {
      this.googleSheetsRepository.failure(error);
    }
  }

  async updateReservationByDate(oldDate: string, newDate: string, oldTime: string, newTime?: string) {
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
        return 'No se encontro la reserva'
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
    const sheetNumber = range.split('!')[0];
    let sheetIndex = 0
    if (sheetNumber === SheetsName.AVAILABLE_BOOKINGS) {
      sheetIndex = 1
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

  async getReservationsByDate(date: string): Promise<DateTime> {
    try {
      const data = await this.googleSheetsRepository.getReservationsByDate(date);
      return data;
    } catch (error) {
      this.googleSheetsRepository.failure(error);
    }
  }
}
