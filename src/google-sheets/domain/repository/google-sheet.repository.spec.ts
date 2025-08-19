import { GoogleSheetsRepository } from './google-sheets.repository';
import { SHEETS_NAMES, ServiceName } from 'src/constants';
import { dateTimeMock } from 'src/google-sheets/test/datetime.mock';
import { AddDataType } from 'src/lib/types/add-data.type';

describe('GIVEN GoogleSheetsRepository', () => {
  let repository: GoogleSheetsRepository;
  let getMock: jest.Mock;
  let updateMock: jest.Mock;

  const sheetId = 'test-sheet-id';

  beforeEach(() => {
    getMock = jest.fn();
    updateMock = jest.fn();

    repository = new GoogleSheetsRepository({
      sheetId,
      clientEmail: 'client@example.com',
      privateKey: 'private-key',
    });

    (repository as any).sheets = {
      spreadsheets: {
        values: {
          get: getMock,
          update: updateMock,
        },
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
          values: [[
            values.customerData.date,
            values.customerData.time,
            values.customerData.name,
            values.customerData.phone,
            ServiceName.DINNER,
            values.customerData.quantity,
          ]],
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
      await repository.updateAvailabilitySheet('Sheet1!C2:D2', 4, 8);

      expect(updateMock).toHaveBeenCalledWith({
        spreadsheetId: sheetId,
        range: 'Sheet1!C2:D2',
        valueInputOption: 'RAW',
        requestBody: { values: [[4, 8]] },
      });
    });
  });
});
