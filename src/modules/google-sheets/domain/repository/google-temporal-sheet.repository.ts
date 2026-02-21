import { Injectable } from '@nestjs/common';
import { JWT } from 'google-auth-library';
import { sheets_v4, google } from 'googleapis';
import { GoogleSheetsOpts, ProviderError, ProviderName } from 'src/lib';
import { Logger } from '@nestjs/common';

@Injectable()
export class GoogleTemporalSheetsRepository {
  private readonly logger = new Logger(GoogleTemporalSheetsRepository.name);
  private readonly sheets: sheets_v4.Sheets;
  private readonly sheetId: string;

  constructor(opts: GoogleSheetsOpts) {
    this.sheetId = opts.sheetId;

    const auth = new JWT({
      email: opts.clientEmail,
      key: opts.privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.sheets = google.sheets({ version: 'v4', auth });
  }

  async findRowIndexByWaId(sheetName: string, waId: string): Promise<number> {
    try {
      const range = `${sheetName}!G:I`;
      const res = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.sheetId,
        range,
      });
      const values = res.data.values ?? [];
      for (let i = 1; i < values.length; i++) {
        const cell = (values[i] && values[i][0]) || '';
        if (cell === waId) {
          return i + 1;
        }
      }
      return -1;
    } catch (err) {
      this.failure(err, 'No se pudo buscar waId');
    }
  }

  async appendSeedRow(sheetName: string, rowArray: string[]): Promise<number> {
    try {
      const range = `${sheetName}!G:I`;
      const res = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.sheetId,
        range,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [rowArray] },
      });
      this.logger.log('Fila creada');
      return -1;
    } catch (err) {
      this.failure(err, 'No se pudo crear fila temporal');
    }
  }

  async readRowByIndex(sheetName: string, rowIndex: number): Promise<string[]> {
    try {
      const range = `${sheetName}!A${rowIndex}:I${rowIndex}`;
      const res = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.sheetId,
        range,
      });
      this.logger.log('Fila leida');
      return (res.data.values && res.data.values[0]) || [];
    } catch (err) {
      this.failure(err, 'No se pudo leer fila temporal');
    }
  }

  /** Actualiza una fila completa con un array con 9 columnas (A..I) */
  async updateFullRow(sheetName: string, rowIndex: number, rowArray: any[]): Promise<void> {
    try {
      const range = `${sheetName}!A${rowIndex}:I${rowIndex}`;
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.sheetId,
        range,
        valueInputOption: 'RAW',
        requestBody: { values: [rowArray] },
      });
      this.logger.log('Fila actualizada');
    } catch (err) {
      this.failure(err, 'No se pudo actualizar la fila completa');
    }
  }

  failure(error: unknown, msg = 'Google Sheets error'): never {
    console.error(error);
    throw new ProviderError(ProviderName.GOOGLE_SHEETS, msg, error);
  }
}
