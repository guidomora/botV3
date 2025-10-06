import { Injectable } from "@nestjs/common";
import { GoogleTemporalSheetsRepository } from "../domain/repository/google-temporal-sheet.repository";
import { AddMissingFieldInput, TemporalDataType } from "src/lib";
import { SHEETS_NAMES } from "src/constants";
import { TemporalStatusEnum } from "src/lib";
import { computeStatus, objectToRowArray, buildEmptyRow } from "../helpers/temporal-data.helper";
import { GoogleSheetsRepository } from "../domain/repository/google-sheets.repository";
import { Logger } from "@nestjs/common";

@Injectable()
export class GoogleTemporalSheetsService {
    logger = new Logger(GoogleTemporalSheetsService.name);
    constructor(
        private readonly googleTemporalSheetsRepository: GoogleTemporalSheetsRepository,
        private readonly googleSheetsRepository: GoogleSheetsRepository,
    ) { }


    async addMissingField(input: AddMissingFieldInput) {

        const sheetName = SHEETS_NAMES[2];
        const { waId, values } = input;

        let rowIndex = await this.googleTemporalSheetsRepository.findRowIndexByWaId(
            sheetName,
            waId,
        );

        if (rowIndex === -1) {
            const seed = buildEmptyRow(waId);

            await this.googleTemporalSheetsRepository.appendSeedRow(sheetName, seed);
            rowIndex = await this.googleTemporalSheetsRepository.findRowIndexByWaId(
                sheetName,
                waId,
            );
            if (rowIndex === -1) {
                throw new Error('No se pudo localizar la fila recién creada para waId'); //TODO: check this err description
            }
        }

        const currentRow = await this.googleTemporalSheetsRepository.readRowByIndex(
            sheetName,
            rowIndex,
        );
        const current = this.rowArrayToObject(currentRow, waId);

        const changedFields: string[] = [];
        const next = { ...current };

        const apply = (key: keyof TemporalDataType, incoming?: string) => {
            if (incoming !== undefined && incoming !== null) {
                const val = String(incoming).trim();
                if (val && val !== next[key]) {
                    next[key] = val;
                    changedFields.push(key);
                }
            }
        };

        apply('date', values.date);
        apply('time', values.time);
        apply('name', values.name);
        apply('phone', values.phone);
        apply('quantity', values.quantity);

        const { status, missingFields } = computeStatus(next);
        next.status = status;

        const fullRow = objectToRowArray(next);
        await this.googleTemporalSheetsRepository.updateFullRow(
            sheetName,
            rowIndex,
            fullRow,
        );

        // new method or use case to handle this 
        // si el status === COMPLETED, pasar la data a la hoja de reservas y borrar la fila de la hoja temporal
        if (status === TemporalStatusEnum.COMPLETED) {
            const customerData = {date: next.date.toLowerCase(), time: next.time.toLowerCase(), name: next.name.toLowerCase(), phone: next.phone.toLowerCase(), quantity: Number(next.quantity)}
            console.log('status === COMPLETED');
            console.log(`${sheetName}!A${rowIndex}:F${rowIndex}`, fullRow);
            console.log(customerData);
            
            
            // await this.googleSheetsRepository.createReservation(`${sheetName}!A${rowIndex}:F${rowIndex}`, {customerData} );
            this.logger.log('Reserva trasladada a hoja de reservas');
            // await this.googleSheetsRepository.deleteRow(rowIndex, 2);
            this.logger.log('Fila eliminada de la hoja temporal');
            
        }

        return {
            status: next.status,
            missingFields,
            rowIndex,
            snapshot: next,
            changedFields,
        };
    }


    private rowArrayToObject(row: string[], waIdFallback: string) {
        const safe = [...row];
        while (safe.length < 9) safe.push(' ');

        const [
            date,
            time,
            name,
            phone,
            service,
            quantity,
            waId,
            status,
        ] = safe;

        return {
            date: date || ' ',
            time: time || ' ',
            name: name || ' ',
            phone: phone || ' ',
            service: service || 'Food',
            quantity: quantity || ' ',
            waId: waId || waIdFallback,
            status: (status as TemporalStatusEnum) || TemporalStatusEnum.NO_DATA,
        };
    }
}