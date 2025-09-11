import { Injectable } from "@nestjs/common";
import { GoogleTemporalSheetsRepository } from "../domain/repository/google-temporal-sheet.repository";
import { TemporalDataType } from "src/lib";
import { customDataSheetHelper } from "../helpers/temporal-data.helper";
import { GoogleSheetsRepository } from "../domain/repository/google-sheets.repository";
import { SHEETS_NAMES } from "src/constants";

@Injectable()
export class GoogleTemporalSheetsService {
    constructor(
        private readonly googleTemporalSheetsRepository: GoogleTemporalSheetsRepository,
        private readonly googleSheetsRepository: GoogleSheetsRepository
    ) { }


    async addMissingField(values: TemporalDataType) {
        const dateExists = await this.googleSheetsRepository.getDates(`${SHEETS_NAMES[2]}!A:F`);
        const data = customDataSheetHelper(values);
        
    }

}