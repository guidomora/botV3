import { Injectable } from "@nestjs/common";
import { SHEETS_NAMES } from "src/constants";
import { GoogleSheetsService } from "src/google-sheets/service/google-sheets.service";

@Injectable()
export class CreateReservationRowUseCase {
    constructor(
        private readonly googleSheetsService: GoogleSheetsService,
    ) { }

    async createReservationRow(index: number) {
        await this.googleSheetsService.getRowValues(`${SHEETS_NAMES[0]}!A${index}:F${index}`)
    }
}