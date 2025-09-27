import { Injectable } from "@nestjs/common";
import { GoogleSheetsRepository } from "../domain/repository/google-sheets.repository";
import { SHEETS_NAMES } from "src/constants";
import { TemporalStatusEnum } from "src/lib";

@Injectable()
export class TemporalDataUseCase {
    constructor(
        private readonly googleSheetsRepository: GoogleSheetsRepository
    ) { }

    async dataExists(): Promise<TemporalStatusEnum> {
        const dataExists = await this.googleSheetsRepository.getDates(`${SHEETS_NAMES[2]}!A:F`);
        if (dataExists[1] === undefined) {
            return TemporalStatusEnum.NO_DATA
        }
        return TemporalStatusEnum.IN_PROGRESS
    }
}
    