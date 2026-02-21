import { GoogleSheetsRepository } from './google-sheets.repository';
import { SHEETS_NAMES, ServiceName } from 'src/constants';
import { AddDataType } from 'src/lib/types/add-data.type';
import { parseSpreadSheetId } from '../../helpers/parse-spreadsheet-id.helper';
import { dateTimeMock } from '../../test/datetime.mock';
import { sheets_v4 } from 'googleapis';

jest.mock('src/google-sheets/helpers/parse-spreadsheet-id.helper');

describe('GIVEN GoogleSheetsRepository', () => {
  let repository: GoogleSheetsRepository;
  let getMock: jest.Mock;
  let updateMock: jest.Mock;
  let appendMock: jest.Mock;
  let batchUpdateMock: jest.Mock;

  const sheetId = 'test-sheet-id';

  beforeEach(() => {
    getMock = jest.fn();
    updateMock = jest.fn();
    appendMock = jest.fn();
    batchUpdateMock = jest.fn();

    repository = new GoogleSheetsRepository({
      sheetId,
      clientEmail: 'client@example.com',
      privateKey: 'private-key',
    });

    (repository as unknown as { sheets: sheets_v4.Sheets }).sheets = {
      spreadsheets: {
        values: {
          get: getMock,
          update: updateMock,
          append: appendMock,
        },
        batchUpdate: batchUpdateMock,
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('WHEN getDates is called', () => {
    it('SHOULD return dates using the default range', async () => {
      getMock.mockResolvedValue({ data: { values: dateTimeMock } });

      const result = await repository.getDates();

      expect(getMock).toHaveBeenCalledWith({
        spreadsheetId: sheetId,
        range: `${SHEETS_NAMES[0]}!A:A`,
        majorDimension: 'ROWS',
      });
      expect(result).toEqual(dateTimeMock);
    });

    it('SHOULD return an empty array when no values are present', async () => {
      getMock.mockResolvedValue({ data: {} });

      const result = await repository.getDates('Custom!A:A');

      expect(getMock).toHaveBeenCalledWith({
        spreadsheetId: sheetId,
        range: 'Custom!A:A',
        majorDimension: 'ROWS',
      });
      expect(result).toEqual([]);
    });
  });

  describe('WHEN createReservation is called', () => {
    it('SHOULD update the sheet with the reservation data', async () => {
      const values: AddDataType = {
        customerData: {
          date: '2025-07-26',
          time: '20:00',
          name: 'John Doe',
          phone: '123456789',
          quantity: 2,
        },
      };

      await repository.createReservation('Sheet1!A1:F1', values);

      expect(updateMock).toHaveBeenCalledWith({
        spreadsheetId: sheetId,
        range: 'Sheet1!A1:F1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [
            [
              values.customerData.date,
              values.customerData.time,
              values.customerData.name,
              values.customerData.phone,
              ServiceName.DINNER,
              values.customerData.quantity,
            ],
          ],
        },
      });
    });
  });

  describe('WHEN getAvailability is called', () => {
    it('SHOULD return the availability values from the sheet', async () => {
      const availability = [['2025-07-26', '20:00', 5, 15]];
      getMock.mockResolvedValue({ data: { values: availability } });

      const result = await repository.getAvailability('Sheet1!A:D');

      expect(getMock).toHaveBeenCalledWith({
        spreadsheetId: sheetId,
        range: 'Sheet1!A:D',
        majorDimension: 'ROWS',
      });
      expect(result).toEqual(availability);
    });
  });

  describe('WHEN updateAvailabilitySheet is called', () => {
    it('SHOULD update reservations and availability cells', async () => {
      await repository.updateAvailabilitySheet('Sheet1!C2:D2', {
        reservations: 4,
        available: 8,
      });

      expect(updateMock).toHaveBeenCalledWith({
        spreadsheetId: sheetId,
        range: 'Sheet1!C2:D2',
        valueInputOption: 'RAW',
        requestBody: { values: [[4, 8]] },
      });
    });
  });

  describe('WHEN insertRow is called', () => {
    it('SHOULD insert a new row at the given index', async () => {
      const rowIndex = 5;
      (parseSpreadSheetId as jest.Mock).mockResolvedValue(321);

      await repository.insertRow(rowIndex, 0);

      expect(parseSpreadSheetId).toHaveBeenCalledWith(
        sheetId,
        (repository as unknown as { sheets: sheets_v4.Sheets }).sheets,
        0,
      );
      expect(batchUpdateMock).toHaveBeenCalledWith({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [
            {
              insertDimension: {
                range: {
                  sheetId: 321,
                  dimension: 'ROWS',
                  startIndex: rowIndex,
                  endIndex: rowIndex + 1,
                },
                inheritFromBefore: false,
              },
            },
          ],
        },
      });
    });
  });

  describe('WHEN getRowValues is called', () => {
    it('SHOULD retrieve the row values in column major order', async () => {
      getMock.mockResolvedValue({ data: { values: dateTimeMock } });

      const range = 'Sheet1!A:A';
      const result = await repository.getRowValues(range);

      expect(getMock).toHaveBeenCalledWith({
        spreadsheetId: sheetId,
        range,
        majorDimension: 'COLUMNS',
      });
      expect(result).toEqual(dateTimeMock);
    });
  });

  describe('WHEN getLastRowValue is called', () => {
    it('SHOULD return the last value in the column', async () => {
      const values = [['a', 'b', 'c']];
      getMock.mockResolvedValue({ data: { values } });

      const result = await repository.getLastRowValue('Sheet1!A:A');

      expect(getMock).toHaveBeenCalledWith({
        spreadsheetId: sheetId,
        range: 'Sheet1!A:A',
        majorDimension: 'COLUMNS',
      });
      expect(result).toBe('c');
    });

    it('SHOULD return a message when no values are present', async () => {
      getMock.mockResolvedValue({ data: {} });

      const result = await repository.getLastRowValue('Sheet1!A:A');

      expect(result).toBe('no hay valores');
    });
  });

  describe('WHEN createDate is called', () => {
    it('SHOULD append the date to the sheet', async () => {
      const appendRowSpy = jest.spyOn(repository, 'appendRow').mockResolvedValue();
      const date = '2025-07-26';

      await repository.createDate({ date });

      expect(appendRowSpy).toHaveBeenCalledWith('Sheet1!A:E', [[date]]);
    });
  });

  describe('WHEN deleteReservation is called', () => {
    it('SHOULD clear the reservation data in the specified range', async () => {
      const range = 'Sheet1!A2:D2';

      await repository.deleteReservation(range);

      expect(updateMock).toHaveBeenCalledWith({
        spreadsheetId: sheetId,
        range,
        valueInputOption: 'RAW',
        requestBody: { values: [['', '', '', '']] },
      });
    });
  });

  describe('WHEN deleteRow is called', () => {
    it('SHOULD remove the specified row from the sheet', async () => {
      const rowIndex = 3;
      const sheetIndex = 0;
      (parseSpreadSheetId as jest.Mock).mockResolvedValue(321);

      await repository.deleteRow(rowIndex, sheetIndex);

      expect(parseSpreadSheetId).toHaveBeenCalledWith(
        sheetId,
        (repository as unknown as { sheets: sheets_v4.Sheets }).sheets,
        sheetIndex,
      );
      expect(batchUpdateMock).toHaveBeenCalledWith({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: 321,
                  dimension: 'ROWS',
                  startIndex: rowIndex - 1,
                  endIndex: rowIndex,
                },
              },
            },
          ],
        },
      });
    });
  });
});
