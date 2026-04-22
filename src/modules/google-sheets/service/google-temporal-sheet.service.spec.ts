import { TemporalStatusEnum } from 'src/lib';
import { createGoogleTemporalRepositoryMock } from '../test/mocks/google-repository.mock';
import { temporalRowMock } from '../test/mocks/google-sheets-data.mock';
import { GoogleTemporalSheetsService } from './google-temporal-sheet.service';
import { formatSystemTimestamp } from '../helpers/system-timestamp.helper';

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
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-03-03T18:45:00.000Z'));
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
        '2026-03-03T18:00:00.000Z',
      ]);

      const result = await service.addMissingField({
        waId: 'wa-123',
        values: { date: 'Martes 03/03/2026', time: '20:00', quantity: '2' },
      });

      expect(repository.appendSeedRow.mock.calls).toHaveLength(1);
      expect(repository.updateFullRow.mock.calls).toHaveLength(1);
      expect(result.status).toBe(TemporalStatusEnum.IN_PROGRESS);
      expect(result.changedFields).toEqual(expect.arrayContaining(['date', 'time', 'quantity']));
      jest.useRealTimers();
    });

    it('Should normalize input values and keep status in progress when data is partial', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-03-05T18:45:00.000Z'));
      repository.findRowIndexByWaId.mockResolvedValue(8);
      repository.readRowByIndex.mockResolvedValue([
        ' ',
        ' ',
        ' ',
        ' ',
        'Food',
        ' ',
        'wa-321',
        'NO_DATA',
        'create',
        '2026-03-05T18:00:00.000Z',
      ]);

      await service.addMissingField({
        waId: 'wa-321',
        values: {
          date: 'VIERNES 05/03/2026',
          name: '  ANA LOPEZ  ',
          phone: '54-9-1166655544',
        },
      });

      expect(repository.updateFullRow.mock.calls[0]).toEqual([
        expect.any(String),
        8,
        expect.arrayContaining(['viernes 05/03/2026', ' ', 'ana lopez']),
      ]);
      expect(repository.updateFullRow.mock.calls[0][2][9]).toBe(formatSystemTimestamp());
      jest.useRealTimers();
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
      expect(repository.findRowIndexByWaId.mock.calls).toHaveLength(1);
    });
  });

  describe('When findExpiredRows is called', () => {
    it('Should delegate cleanup candidate lookup to repository', async () => {
      const candidates = [
        {
          rowIndex: 7,
          waId: 'wa-expired',
          status: TemporalStatusEnum.IN_PROGRESS,
          updatedAt: '2026-03-03T10:00:00.000Z',
        },
      ];
      repository.findExpiredRows.mockResolvedValue(candidates);

      await expect(service.findExpiredRows('2026-03-03T16:00:00.000Z')).resolves.toEqual(
        candidates,
      );
      expect(repository.findExpiredRows.mock.calls[0]).toEqual([
        expect.any(String),
        '2026-03-03T16:00:00.000Z',
      ]);
    });
  });

  describe('When clearFields is called', () => {
    it('Should blank requested fields and persist the updated temporal row', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-03-03T22:30:00.000Z'));
      repository.findRowIndexByWaId.mockResolvedValue(5);
      repository.readRowByIndex.mockResolvedValue(temporalRowMock);

      const result = await service.clearFields('wa-123', ['date', 'time']);

      expect(repository.updateFullRow.mock.calls[0]).toEqual([
        expect.any(String),
        5,
        expect.arrayContaining([' ', ' ']),
      ]);
      expect(result.status).toBe(TemporalStatusEnum.IN_PROGRESS);
      expect(result.missingFields).toEqual(expect.arrayContaining(['date', 'time']));
      expect(repository.updateFullRow.mock.calls[0][2][9]).toBe(formatSystemTimestamp());
      jest.useRealTimers();
    });

    it('Should throw when temporal row does not exist', async () => {
      repository.findRowIndexByWaId.mockResolvedValue(-1);

      await expect(service.clearFields('wa-missing', ['date'])).rejects.toThrow(
        'No se pudo localizar la fila temporal para wa-missing',
      );
    });
  });
});
