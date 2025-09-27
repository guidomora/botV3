import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { JWT } from "google-auth-library";
import { sheets_v4, google } from "googleapis";
import { GoogleSheetsOpts, TemporalDataType } from "src/lib";

@Injectable()
export class GoogleTemporalSheetsRepository {
    private readonly sheets: sheets_v4.Sheets;
    private readonly sheetId: string;

    constructor(opts: GoogleSheetsOpts,) {
        this.sheetId = opts.sheetId;

        const auth = new JWT({
            email: opts.clientEmail,
            key: opts.privateKey,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        this.sheets = google.sheets({ version: 'v4', auth });
    }

    async addMissingField(range: string, values: any) {
        try {
            await this.sheets.spreadsheets.values.update({
                spreadsheetId: this.sheetId,
                range,
                valueInputOption: 'RAW',
                requestBody: { values: [[values]] },
            });
        } catch (error) {
            this.failure(error);
        }
    }

    async findRowIndexByWaId(sheetName: string, waId: string): Promise<number> {
        try {
            // Traemos la columna A completa (waId)
            const range = `${sheetName}!G:G`;
            const res = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.sheetId,
                range,
            });
            const values = res.data.values ?? []; // [[header],[waId1],[waId2],...]
            // Empezamos en index 1 (fila 2) porque fila 1 son headers
            for (let i = 1; i < values.length; i++) {
                const cell = (values[i] && values[i][0]) || '';
                if (cell === waId) {
                    // fila real en la sheet = i + 1 (porque i está 0-based), y +1 extra por header
                    return i + 1;
                }
            }
            return -1;
        } catch (err) {
            this.failure(err, 'No se pudo buscar waId');
        }
    }

    async appendSeedRow(sheetName: string, rowArray: any[]): Promise<number> {
        try {
            const range = `${sheetName}!G:G`; // el rango "ancla" no importa mucho en append
            const res = await this.sheets.spreadsheets.values.append({
                spreadsheetId: this.sheetId,
                range,
                valueInputOption: 'RAW',
                insertDataOption: 'INSERT_ROWS',
                requestBody: { values: [rowArray] },
            });

            // Calcular el índice de fila insertada:
            // La API no devuelve el row index directamente; una forma simple:
            // volver a buscar waId o pedir el total de filas y asumir append al final.
            // Para robustez, retornamos -1 y dejamos que el service haga un findRowIndexByWaId.
            return -1;
        } catch (err) {
            this.failure(err, 'No se pudo crear fila temporal');
        }
    }

    /** Lee una fila completa A:I en el row indicado (1-based) */
    async readRowByIndex(sheetName: string, rowIndex: number): Promise<string[]> {
        try {
            const range = `${sheetName}!A${rowIndex}:H${rowIndex}`;
            const res = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.sheetId,
                range,
            });
            return (res.data.values && res.data.values[0]) || [];
        } catch (err) {
            this.failure(err, 'No se pudo leer fila temporal');
        }
    }

    /** Escribe múltiples rangos en una sola llamada (batch) */
    async batchUpdateRanges(
        data: { range: string; values: any[][] }[],
    ): Promise<void> {
        try {
            await this.sheets.spreadsheets.values.batchUpdate({
                spreadsheetId: this.sheetId,
                requestBody: {
                    valueInputOption: 'RAW',
                    data,
                },
            });
        } catch (err) {
            this.failure(err, 'No se pudo actualizar rangos (batch)');
        }
    }

    /** Actualiza una fila completa con un array con 9 columnas (A..I) */
    async updateFullRow(
        sheetName: string,
        rowIndex: number,
        rowArray: any[],
    ): Promise<void> {
        try {
            const range = `${sheetName}!A${rowIndex}:H${rowIndex}`;
            await this.sheets.spreadsheets.values.update({
                spreadsheetId: this.sheetId,
                range,
                valueInputOption: 'RAW',
                requestBody: { values: [rowArray] },
            });
        } catch (err) {
            this.failure(err, 'No se pudo actualizar la fila completa');
        }
    }

    failure(error: unknown, msg = 'Google Sheets error'): never {
        console.error(error);
        throw new InternalServerErrorException(msg);
    }
}