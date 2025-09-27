import { Injectable } from "@nestjs/common";
import { GoogleTemporalSheetsRepository } from "../domain/repository/google-temporal-sheet.repository";
import { TemporalDataType } from "src/lib";
import { customDataSheetHelper } from "../helpers/temporal-data.helper";
import { GoogleSheetsRepository } from "../domain/repository/google-sheets.repository";
import { SHEETS_NAMES } from "src/constants";
import { TemporalDataUseCase } from "../application/temporal-data.use-case";
import { TemporalStatusEnum } from "src/lib";

@Injectable()
export class GoogleTemporalSheetsService {
    constructor(
        private readonly googleTemporalSheetsRepository: GoogleTemporalSheetsRepository,
        private readonly googleSheetsRepository: GoogleSheetsRepository,
        private readonly temporalDataUseCase: TemporalDataUseCase
    ) { }


    async addMissingField(values: TemporalDataType) {
        const dataExists = await this.temporalDataUseCase.dataExists();
        const data = customDataSheetHelper(values);
        console.log(data);
        
        if (dataExists === TemporalStatusEnum.NO_DATA) {
            // make a dynamic range for each value
            await this.googleTemporalSheetsRepository.addMissingField(`${SHEETS_NAMES[2]}!B2`, data.name);
        }        
        
        
    }

}