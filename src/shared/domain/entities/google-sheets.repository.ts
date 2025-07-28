
import { JWT } from 'google-auth-library';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { google, sheets_v4 } from 'googleapis';
import { AddValue } from 'src/lib/add-value.type';

interface GoogleSheetsOpts {
  sheetId: string;
  clientEmail: string;
  privateKey: string;
}

@Injectable()
export class GoogleSheetsRepository {
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

  
  async getRange(range = 'Sheet1!A:E') {
    const { data } = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.sheetId,
      range,
      majorDimension: 'ROWS',
      valueRenderOption: 'FORMATTED_VALUE',
    });
    return data.values ?? [];
  }

  async updateRange(range: string, values: any[][]) {
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.sheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: { values },
    });
  }

  async appendRow(range: string, values: AddValue) {
    try {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.sheetId,
        range,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values },
      });
    } catch (error) {
      this.failure(error);
    }
  }

  async getLasRowValue(range: string): Promise<string> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.sheetId,
        range,
        majorDimension: 'COLUMNS'
      });

      const rows = response.data.values ?? [];

      if (rows.length === 0 || rows[0].length === 0) {
        return 'no hay valores';
      }

      const lastRowValue = rows[0][rows[0].length - 1];
      
      return lastRowValue;
    } catch (error) {
      this.failure(error);
    }
  }

  async createDate(createDateType: any) {
    const { date } = createDateType;
    await this.appendRow('Sheet1!A:E', [[date]]);
  }

  failure(error: unknown, msg = 'Google Sheets error'): never {
    console.error(error);
    throw new InternalServerErrorException(msg);
  }
}
