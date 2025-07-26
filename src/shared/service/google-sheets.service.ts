import { Injectable } from "@nestjs/common";
import { GoogleSheetsRepository } from "../domain/entities/google-sheets.repository";
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

  async getLasRowValue(range: string) {
    try {
      const data = await this.googleSheetsRepository.getLasRowValue(range);
      return data;
    } catch (error) {
      this.googleSheetsRepository.failure(error);
    }
  }
}
