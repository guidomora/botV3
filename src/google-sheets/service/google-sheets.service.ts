import { Injectable } from "@nestjs/common";
import { GoogleSheetsRepository } from "../domain/repository/google-sheets.repository";
import { DateTime } from "src/lib/types/datetime/datetime.type";
import { SHEETS_NAMES } from "src/constants/sheets-name/sheets-name";
import { AddDataType } from "src/lib/types/add-data.type";
import { TablesInfo } from "src/constants/tables-info/tables-info";
import { Availability, ReservationOperation, UpdateParams } from "src/lib";
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

  async getDate(date: string, time: string): Promise<number> {
    try {
      const data = await this.googleSheetsRepository.getDates(`${SHEETS_NAMES[0]}!A:C`);

      const index = data.findIndex(row => row[0] === date && row[1] === time) + 1;

      if (index === -1 || index === undefined || index === 0) {
        return -1
      }

      return index;
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
    console.log('values', values);
    
    try {
      await this.googleSheetsRepository.createReservation(range, values);
    } catch (error) {
      this.googleSheetsRepository.failure(error);
    }
  }

  async getAvailability(range: string): Promise<Availability> {
    let isAvailable = false;

    try {
      const data = await this.googleSheetsRepository.getAvailability(range);
      
      const reservations = Number(data[0][2])

      const available = Number(data[0][3])

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

  async updateAvailability(range: string, operation: ReservationOperation, updateParams: UpdateParams) {

    let { reservations, available } = updateParams;

    try {

      if (available === 0 && operation === ReservationOperation.ADD) {
        throw new Error('No hay disponibilidad para esa fecha y horario. Error en la cantidad de reservas')
      }

      if (operation === ReservationOperation.ADD) {
        reservations += 1;
        available -= 1;
      }

      await this.googleSheetsRepository.updateAvailabilitySheet(range, reservations, available);
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
}
