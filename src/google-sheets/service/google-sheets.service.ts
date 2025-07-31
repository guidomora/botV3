import { Injectable } from "@nestjs/common";
import { GoogleSheetsRepository } from "../domain/repository/google-sheets.repository";
import { AddValue } from "src/lib/add-value.type";


@Injectable()
export class GoogleSheetsService {
  constructor(
    private readonly googleSheetsRepository: GoogleSheetsRepository
  ){}

  async appendRow(range: string, values: AddValue) {
    try {
      await this.googleSheetsRepository.appendRow(range, values);
    } catch (error) {
      this.googleSheetsRepository.failure(error);
    }
  }

  async getLasRowValue(range: string): Promise<string> {
    try {
      const data = await this.googleSheetsRepository.getLasRowValue(range);
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
}
