import { Injectable } from "@nestjs/common";
import { SHEETS_NAMES } from "src/constants";
import { GoogleSheetsService } from "src/google-sheets/service/google-sheets.service";
import { CreateReservationType } from "src/lib";

@Injectable()
export class CreateReservationRowUseCase {
    constructor(
        private readonly googleSheetsService: GoogleSheetsService,
    ) { }

    async createReservationAndRow(index: number, newRowData:CreateReservationType):Promise<void> {
        const newRowIndex = await this.googleSheetsService.insertRow(`${SHEETS_NAMES[0]}!A${index}:F${index}`, index)

        await this.googleSheetsService.createReservation(`${SHEETS_NAMES[0]}!A${newRowIndex}:F${newRowIndex}`, { customerData: newRowData })
    }
}