
import { JWT } from 'google-auth-library';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { google, sheets_v4 } from 'googleapis';
import { AddValue } from 'src/lib/types/add-value.type';

import { DateTime } from 'src/lib/types/datetime/datetime.type';
import { AddDataType } from 'src/lib/types/add-data.type';
import { ServiceName, SHEETS_NAMES } from 'src/constants';
import { parseSpreadSheetId } from 'src/modules/google-sheets/helpers/parse-spreadsheet-id.helper';
import { UpdateParamsRepository } from 'src/lib';

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

  async createReservation(range: string, values: AddDataType) {
    const { customerData } = values;

    let dataToAdd: (string | number)[]

    if (customerData.date && customerData.time) {
      dataToAdd = [customerData.date, customerData.time, customerData.name, customerData.phone, ServiceName.DINNER, customerData.quantity]
    } else {
      dataToAdd = [customerData.name, customerData.phone, ServiceName.DINNER, customerData.quantity]
    }

    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.sheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: { values: [dataToAdd] },
    });
  }

  async getAvailability(range: string): Promise<string[][]> {
    const { data } = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.sheetId,
      range,
      majorDimension: 'ROWS',
    });
    return data.values ?? [];
  }

  async updateAvailabilitySheet(range: string, updateParams: UpdateParamsRepository) {

    const { reservations, available } = updateParams;

    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.sheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: { values: [[reservations, available]] },
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

  async insertRow(rowIndex: number, sheetIndex: number) {
    try {
      const sheetId = await parseSpreadSheetId(this.sheetId, this.sheets, sheetIndex);
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.sheetId,
        requestBody: {
          requests: [
            {
              insertDimension: {
                range: {
                  sheetId,
                  dimension: 'ROWS',
                  startIndex: rowIndex,
                  endIndex: rowIndex + 1,
                },
                inheritFromBefore: false,
              },
            }
          ]
        },
      });
    } catch (error) {
      this.failure(error);
    }
  }

  async getRowValues(range: string): Promise<DateTime> {
    const { data } = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.sheetId,
      range,
      majorDimension: 'COLUMNS',
    });
    return data.values ?? [];
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

  async getReservationsByDate(date: string): Promise<DateTime> {
    const { data } = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.sheetId,
      range: `${SHEETS_NAMES[0]}!A:F`,
      majorDimension: 'ROWS',
    });

    const reservations = data.values?.filter(row => row[0] === date);

    return reservations ?? [];
  }

  async createDate(createDateType: any) {
    const { date } = createDateType;
    await this.appendRow('Sheet1!A:E', [[date]]);
  }

  async deleteReservation(range: string) {
    try {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.sheetId,
        range,
        valueInputOption: 'RAW',
        requestBody: { values: [['', '', '', '']] },
      });
    } catch (error) {
      this.failure(error);
    }
  }

  async deleteRow(rowIndex: number, sheetIndex: number) {

    try {
      const sheetId = await parseSpreadSheetId(this.sheetId, this.sheets, sheetIndex);
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.sheetId,
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId,
                  dimension: 'ROWS',
                  startIndex: rowIndex - 1,
                  endIndex: rowIndex,
                },
              },
            }
          ]
        },
      });
    } catch (error) {
      this.failure(error);
    }
  }

  async deleteOldRows(rowStart: number, rowEnd: number, sheetIndex: number) {

    try {
      if (rowEnd <= rowStart) return;
      const sheetId = await parseSpreadSheetId(this.sheetId, this.sheets, sheetIndex);
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.sheetId,
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId,
                  dimension: 'ROWS',
                  startIndex: rowStart - 1,
                  endIndex: rowEnd - 1,
                },
              },
            }
          ]
        },
      });
    } catch (error) {
      this.failure(error);
    }
  }

  failure(error: unknown, msg = 'Google Sheets error'): never {
    console.error(error);
    throw new InternalServerErrorException(msg);
  }
}
