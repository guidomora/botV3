import { Injectable } from "@nestjs/common";
import { GoogleSheetsRepository } from "../domain/repository/google-sheets.repository";
import { DateTime } from "src/lib/types/datetime/datetime.type";
import { SHEETS_NAMES } from "src/constants/sheets-name/sheets-name";


@Injectable()
export class GoogleSheetsService {
  constructor(
    private readonly googleSheetsRepository: GoogleSheetsRepository
  ){}

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

  async getDate(date:string, time:string){
    try {
      const data = await this.googleSheetsRepository.getDates(`${SHEETS_NAMES[0]}!A:C`);
      
      const index = data.findIndex(row => row[0] === date && row[1] === time && (!row[2] || row[2].trim() === "")) + 1;
      return index;
    } catch (error) {
      this.googleSheetsRepository.failure(error);
    }
  }
}
