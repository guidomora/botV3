import { Injectable } from "@nestjs/common";
import { GoogleTemporalSheetsRepository } from "../domain/repository/google-temporal-sheet.repository";
import { TemporalDataType } from "src/lib";
import { customDataSheetHelper } from "../helpers/temporal-data.helper";

@Injectable()
export class GoogleSheetsService {
    constructor(
        private readonly googleTemporalSheetsRepository: GoogleTemporalSheetsRepository
    ) { }


    async addMissingField(values: TemporalDataType) {
        const data = customDataSheetHelper(values);
        
    }

}