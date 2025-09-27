import { Injectable } from "@nestjs/common";
import { GoogleTemporalSheetsRepository } from "../domain/repository/google-temporal-sheet.repository";
import { AddMissingFieldInput, TemporalDataType } from "src/lib";
import { SHEETS_NAMES } from "src/constants";
import { TemporalStatusEnum } from "src/lib";
import { ROW_ORDER, REQUIRED_SLOTS } from "src/constants/tables-info/temporal-data-rows";


@Injectable()
export class GoogleTemporalSheetsService {
    constructor(
        private readonly googleTemporalSheetsRepository: GoogleTemporalSheetsRepository,
    ) { }


    async addMissingField(input: AddMissingFieldInput) {
        console.log('input', input);
        
        const sheetName = SHEETS_NAMES[2];
        const { waId, values } = input;

        // 1) buscar fila existente por waId
        let rowIndex = await this.googleTemporalSheetsRepository.findRowIndexByWaId(
            sheetName,
            waId,
        );
        console.log('rowIndex', rowIndex);

        // 2) si no existe, crear "seed" con espacios y luego re-obtener rowIndex
        if (rowIndex === -1) {
            const seed = this.buildEmptyRow(waId);
            await this.googleTemporalSheetsRepository.appendSeedRow(sheetName, seed);
            // volvemos a buscar (forma robusta y simple)
            rowIndex = await this.googleTemporalSheetsRepository.findRowIndexByWaId(
                sheetName,
                waId,
            );
            if (rowIndex === -1) {
                throw new Error('No se pudo localizar la fila recién creada para waId');
            }
        }

        // 3) leer snapshot actual (para mergear)
        const currentRow = await this.googleTemporalSheetsRepository.readRowByIndex(
            sheetName,
            rowIndex,
        );
        const current = this.rowArrayToObject(currentRow, waId);

        // 5) merge no-destructivo con lo nuevo (solo campos presentes)
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

        // 6) status y faltantes
        const { status, missingFields } = this.computeStatus(next);
        next.status = status;

        // 7) escribir fila completa A..I en una sola llamada
        const fullRow = this.objectToRowArray(next);
        await this.googleTemporalSheetsRepository.updateFullRow(
            sheetName,
            rowIndex,
            fullRow,
        );

        return {
            status: next.status,
            missingFields,
            rowIndex,
            snapshot: next,
            changedFields,
        };
    }

    /** Construye una fila vacía con placeholders y metadata mínima */
    private buildEmptyRow(waId: string) {
        const obj = {
            date: ' ',
            time: ' ',
            name: ' ',
            phone: ' ',
            service: 'Food',
            quantity: ' ',
            waId,
            status: TemporalStatusEnum.NO_DATA,
        };
        console.log('obj', obj);
        return this.objectToRowArray(obj);
    }

    /** Pasa la row A..I a un objeto tipado (rellena faltantes con " ") */
    private rowArrayToObject(row: string[], waIdFallback: string) {
        // row puede venir más corta; completamos a 9 posiciones
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
            status: (status as TemporalStatusEnum) || TemporalStatusEnum.NO_DATA,        };
    }

    /** Convierte el objeto en array ordenado A..I según ROW_ORDER */
    private objectToRowArray(obj: any): any[] {
        return ROW_ORDER.map((k) => obj[k] ?? ' ');
    }

    /** Calcula status y slots faltantes */
    private computeStatus(obj: any) {
        const missing = REQUIRED_SLOTS.filter((k) => {
            const v = (obj[k] ?? '').toString().trim();
            return !v || v === ' ';
        });

        const status =
            missing.length === 0
                ? TemporalStatusEnum.COMPLETED
                : missing.length === REQUIRED_SLOTS.length
                    ? TemporalStatusEnum.NO_DATA
                    : TemporalStatusEnum.IN_PROGRESS;

        return { status, missingFields: missing };
    }
}