import { TemporalStatusEnum } from 'src/lib';
import { createGoogleTemporalRepositoryMock } from '../test/mocks/google-repository.mock';
import { temporalRowMock } from '../test/mocks/google-sheets-data.mock';
import { GoogleTemporalSheetsService } from './google-temporal-sheet.service';

describe('Given GoogleTemporalSheetsService', () => {
  let repository = createGoogleTemporalRepositoryMock();
  let service: GoogleTemporalSheetsService;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = createGoogleTemporalRepositoryMock();
    service = new GoogleTemporalSheetsService(repository);
  });

  describe('When addMissingField is called', () => {
    it('Should create seed row when waId does not exist and then update row', async () => {
      repository.findRowIndexByWaId.mockResolvedValueOnce(-1).mockResolvedValueOnce(12);
      repository.readRowByIndex.mockResolvedValue([
        ' ',
        ' ',
        ' ',
        ' ',
        'Food',
        ' ',
        'wa-123',
        'NO_DATA',
        'create',
      ]);

      const result = await service.addMissingField({
        waId: 'wa-123',
        values: { date: 'Martes 03/03/2026', time: '20:00', quantity: '2' },
      });

      expect(repository.appendSeedRow).toHaveBeenCalledTimes(1);
      expect(repository.updateFullRow).toHaveBeenCalledTimes(1);
      expect(result.status).toBe(TemporalStatusEnum.IN_PROGRESS);
      expect(result.changedFields).toEqual(expect.arrayContaining(['date', 'time', 'quantity']));
    });

    it('Should throw when seeded row cannot be found again', async () => {
      repository.findRowIndexByWaId.mockResolvedValueOnce(-1).mockResolvedValueOnce(-1);

      await expect(service.addMissingField({ waId: 'wa-missing', values: {} })).rejects.toThrow(
        'No se pudo localizar la fila recién creada para wa-missing',
      );
    });

    it('Should mark row as completed when all required fields are present', async () => {
      repository.findRowIndexByWaId.mockResolvedValue(5);
      repository.readRowByIndex.mockResolvedValue(temporalRowMock);

      const result = await service.addMissingField({
        waId: 'wa-123',
        values: { intent: 'create' },
      });

      expect(result.status).toBe(TemporalStatusEnum.COMPLETED);
      expect(result.missingFields).toEqual([]);
    });
  });

  describe('When findTemporalRowIndexByWaId is called', () => {
    it('Should delegate lookup to repository', async () => {
      repository.findRowIndexByWaId.mockResolvedValue(10);

      await expect(service.findTemporalRowIndexByWaId('wa-abc')).resolves.toBe(10);
      expect(repository.findRowIndexByWaId).toHaveBeenCalledTimes(1);
    });
  });
});
