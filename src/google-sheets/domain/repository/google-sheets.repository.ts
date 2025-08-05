
import { JWT } from 'google-auth-library';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { google, sheets_v4 } from 'googleapis';
import { AddValue } from 'src/lib/types/add-value.type';

import { DateTime } from 'src/lib/types/datetime/datetime.type';
import { AddDataType } from 'src/lib/types/add-data.type';
import { ServiceName, SHEETS_NAMES } from 'src/constants';

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

  
  async getDates(range?: string): Promise<DateTime> {
    const { data } = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.sheetId,
      range: range || `${SHEETS_NAMES[0]}!A:A`,
      majorDimension: 'ROWS',
    });
    return data.values ?? [];
  }

  async updateRange(range: string, values:AddDataType) {
    const {customerData} = values;
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.sheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: { values:[[customerData.name, customerData.phone, ServiceName.DINNER, customerData.quantity]] },
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

  async getLastRowValue(range: string): Promise<string> {
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
