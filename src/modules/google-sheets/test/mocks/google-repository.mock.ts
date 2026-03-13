import { GoogleSheetsRepository } from '../../domain/repository/google-sheets.repository';
import { GoogleTemporalSheetsRepository } from '../../domain/repository/google-temporal-sheet.repository';

export const createGoogleSheetsRepositoryMock = (): jest.Mocked<GoogleSheetsRepository> =>
  ({
    appendRow: jest.fn(),
    getLastRowValue: jest.fn(),
    getDates: jest.fn(),
    getRowValues: jest.fn(),
    createReservation: jest.fn(),
    getAvailability: jest.fn(),
    updateAvailabilitySheet: jest.fn(),
    insertRow: jest.fn(),
    deleteReservation: jest.fn(),
    deleteRow: jest.fn(),
    deleteOldRows: jest.fn(),
    getReservationsByDate: jest.fn(),
    createDate: jest.fn(),
    failure: jest.fn((error: unknown) => {
      throw error;
    }),
  }) as unknown as jest.Mocked<GoogleSheetsRepository>;

export const createGoogleTemporalRepositoryMock = (): jest.Mocked<GoogleTemporalSheetsRepository> =>
  ({
    findRowIndexByWaId: jest.fn(),
    appendSeedRow: jest.fn(),
    readRowByIndex: jest.fn(),
    updateFullRow: jest.fn(),
    failure: jest.fn((error: unknown) => {
      throw error;
    }),
  }) as unknown as jest.Mocked<GoogleTemporalSheetsRepository>;
