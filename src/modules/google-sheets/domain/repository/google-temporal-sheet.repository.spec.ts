import { ProviderError } from 'src/lib';
import { temporalRowMock } from '../../test/mocks/google-sheets-data.mock';
import { GoogleTemporalSheetsRepository } from './google-temporal-sheet.repository';

const sheetsMock = {
  spreadsheets: {
    values: {
      get: jest.fn(),
      update: jest.fn(),
      append: jest.fn(),
    },
  },
};

jest.mock('googleapis', () => ({
  google: {
    sheets: jest.fn(() => sheetsMock),
  },
}));

describe('Given GoogleTemporalSheetsRepository', () => {
  let repository: GoogleTemporalSheetsRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new GoogleTemporalSheetsRepository({
      sheetId: 'sheet-id',
      clientEmail: 'client@example.com',
      privateKey: 'private',
    });
  });

  describe('When findRowIndexByWaId is called', () => {
    it('Should return row index when waId exists', async () => {
      sheetsMock.spreadsheets.values.get.mockResolvedValue({
        data: { values: [['waId', 'status', 'intent'], ['wa-100', 'x', 'x'], ['wa-123', 'x', 'x']] },
      });

      await expect(repository.findRowIndexByWaId('Temporal', 'wa-123')).resolves.toBe(3);
    });

    it('Should return -1 when waId is not present', async () => {
      sheetsMock.spreadsheets.values.get.mockResolvedValue({ data: { values: [['header']] } });

      await expect(repository.findRowIndexByWaId('Temporal', 'wa-missing')).resolves.toBe(-1);
    });
  });

  describe('When appendSeedRow is called', () => {
    it('Should append row and return -1 sentinel', async () => {
      await expect(repository.appendSeedRow('Temporal', temporalRowMock)).resolves.toBe(-1);
      expect(sheetsMock.spreadsheets.values.append).toHaveBeenCalledWith(
        expect.objectContaining({
          range: 'Temporal!G:I',
          requestBody: { values: [temporalRowMock] },
        }),
      );
    });

    it('Should throw ProviderError when append fails', async () => {
      sheetsMock.spreadsheets.values.append.mockRejectedValue(new Error('append-error'));

      await expect(repository.appendSeedRow('Temporal', temporalRowMock)).rejects.toBeInstanceOf(
        ProviderError,
      );
    });
  });

  describe('When readRowByIndex is called', () => {
    it('Should return first row casted to strings', async () => {
      sheetsMock.spreadsheets.values.get.mockResolvedValue({ data: { values: [[1, 2, 3]] } });

      await expect(repository.readRowByIndex('Temporal', 10)).resolves.toEqual(['1', '2', '3']);
    });

    it('Should return empty array when no rows are found', async () => {
      sheetsMock.spreadsheets.values.get.mockResolvedValue({ data: { values: [] } });

      await expect(repository.readRowByIndex('Temporal', 10)).resolves.toEqual([]);
    });
  });

  describe('When updateFullRow is called', () => {
    it('Should update full A:I range', async () => {
      await repository.updateFullRow('Temporal', 20, temporalRowMock);

      expect(sheetsMock.spreadsheets.values.update).toHaveBeenCalledWith(
        expect.objectContaining({
          range: 'Temporal!A20:I20',
          requestBody: { values: [temporalRowMock] },
        }),
      );
    });

    it('Should throw ProviderError when update fails', async () => {
      sheetsMock.spreadsheets.values.update.mockRejectedValue(new Error('update-error'));

      await expect(repository.updateFullRow('Temporal', 20, temporalRowMock)).rejects.toBeInstanceOf(
        ProviderError,
      );
    });
  });
});
