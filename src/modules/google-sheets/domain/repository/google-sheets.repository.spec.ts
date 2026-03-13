import { sheets_v4 } from 'googleapis';
import { ServiceName, SHEETS_NAMES } from 'src/constants';
import { ProviderError } from 'src/lib';
import { parseSpreadSheetId } from 'src/modules/google-sheets/helpers/parse-spreadsheet-id.helper';
import { reservationPayloadMock, reservationRowsMock } from '../../test/mocks/google-sheets-data.mock';
import { GoogleSheetsRepository } from './google-sheets.repository';

const sheetsMock = {
  spreadsheets: {
    values: {
      get: jest.fn(),
      update: jest.fn(),
      append: jest.fn(),
    },
    batchUpdate: jest.fn(),
  },
};

jest.mock('googleapis', () => ({
  google: {
    sheets: jest.fn(() => sheetsMock),
  },
}));

jest.mock('src/modules/google-sheets/helpers/parse-spreadsheet-id.helper', () => ({
  parseSpreadSheetId: jest.fn(),
}));

describe('Given GoogleSheetsRepository', () => {
  let repository: GoogleSheetsRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new GoogleSheetsRepository({
      sheetId: 'sheet-id',
      clientEmail: 'client@example.com',
      privateKey: 'private',
    });
  });

  describe('When getDates is called', () => {
    it('Should use default range and return rows', async () => {
      sheetsMock.spreadsheets.values.get.mockResolvedValue({ data: { values: reservationRowsMock } });

      const result = await repository.getDates();

      expect(sheetsMock.spreadsheets.values.get).toHaveBeenCalledWith({
        spreadsheetId: 'sheet-id',
        range: `${SHEETS_NAMES[0]}!A:A`,
        majorDimension: 'ROWS',
      });
      expect(result).toEqual(reservationRowsMock);
    });

    it('Should return an empty array when values are undefined', async () => {
      sheetsMock.spreadsheets.values.get.mockResolvedValue({ data: {} });

      await expect(repository.getDates('Reservas!A:F')).resolves.toEqual([]);
    });
  });

  describe('When createReservation is called', () => {
    it('Should write a complete reservation row when date and time are provided', async () => {
      await repository.createReservation('Reservas!A2:F2', reservationPayloadMock);

      expect(sheetsMock.spreadsheets.values.update).toHaveBeenCalledWith({
        spreadsheetId: 'sheet-id',
        range: 'Reservas!A2:F2',
        valueInputOption: 'RAW',
        requestBody: {
          values: [
            [
              reservationPayloadMock.customerData.date?.toLowerCase(),
              reservationPayloadMock.customerData.time,
              reservationPayloadMock.customerData.name.toLowerCase(),
              reservationPayloadMock.customerData.phone,
              ServiceName.DINNER,
              reservationPayloadMock.customerData.quantity,
            ],
          ],
        },
      });
    });

    it('Should write a partial reservation row when date and time are missing', async () => {
      await repository.createReservation('Reservas!C2:F2', {
        customerData: {
          name: 'Ana Lopez',
          phone: '5491122233344',
          quantity: 6,
        },
      });

      expect(sheetsMock.spreadsheets.values.update).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: {
            values: [['ana lopez', '5491122233344', ServiceName.DINNER, 6]],
          },
        }),
      );
    });
  });

  describe('When getLastRowValue is called', () => {
    it('Should return the last value in first column', async () => {
      sheetsMock.spreadsheets.values.get.mockResolvedValue({ data: { values: [['A1', 'A2']] } });

      await expect(repository.getLastRowValue('Reservas!A:A')).resolves.toBe('A2');
    });

    it('Should return no hay valores when column is empty', async () => {
      sheetsMock.spreadsheets.values.get.mockResolvedValue({ data: { values: [] } });

      await expect(repository.getLastRowValue('Reservas!A:A')).resolves.toBe('no hay valores');
    });

    it('Should throw ProviderError when Google API fails', async () => {
      sheetsMock.spreadsheets.values.get.mockRejectedValue(new Error('boom'));

      await expect(repository.getLastRowValue('Reservas!A:A')).rejects.toBeInstanceOf(ProviderError);
    });
  });

  describe('When insertRow and deleteRow are called', () => {
    it('Should insert row using parsed sheet id', async () => {
      (parseSpreadSheetId as jest.Mock).mockResolvedValue(321);

      await repository.insertRow(5, 1);

      expect(parseSpreadSheetId).toHaveBeenCalledWith('sheet-id', sheetsMock as unknown as sheets_v4.Sheets, 1);
      expect(sheetsMock.spreadsheets.batchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: {
            requests: [
              {
                insertDimension: {
                  range: { sheetId: 321, dimension: 'ROWS', startIndex: 5, endIndex: 6 },
                  inheritFromBefore: false,
                },
              },
            ],
          },
        }),
      );
    });

    it('Should delete a row using parsed sheet id', async () => {
      (parseSpreadSheetId as jest.Mock).mockResolvedValue(999);

      await repository.deleteRow(7, 0);

      expect(sheetsMock.spreadsheets.batchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: {
            requests: [
              {
                deleteDimension: {
                  range: { sheetId: 999, dimension: 'ROWS', startIndex: 6, endIndex: 7 },
                },
              },
            ],
          },
        }),
      );
    });
  });

  describe('When deleteOldRows is called', () => {
    it('Should skip update when rowEnd is lower or equal rowStart', async () => {
      await repository.deleteOldRows(10, 10, 0);

      expect(parseSpreadSheetId).not.toHaveBeenCalled();
      expect(sheetsMock.spreadsheets.batchUpdate).not.toHaveBeenCalled();
    });
  });

  describe('When getReservationsByDate is called', () => {
    it('Should filter rows by exact first column date', async () => {
      sheetsMock.spreadsheets.values.get.mockResolvedValue({ data: { values: reservationRowsMock } });

      const result = await repository.getReservationsByDate('martes 03 de marzo 2026 03/03/2026');

      expect(result).toHaveLength(3);
      expect(result.every((row) => row[0] === 'martes 03 de marzo 2026 03/03/2026')).toBe(true);
    });

    it('Should return empty array when values are undefined', async () => {
      sheetsMock.spreadsheets.values.get.mockResolvedValue({ data: {} });

      await expect(repository.getReservationsByDate('xx')).resolves.toEqual([]);
    });
  });
});
