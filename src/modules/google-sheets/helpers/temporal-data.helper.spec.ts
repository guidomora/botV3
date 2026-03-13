import { TemporalStatusEnum } from 'src/lib';
import { buildEmptyRow, computeStatus, objectToRowArray } from './temporal-data.helper';

describe('Given temporal-data helper', () => {
  describe('When computeStatus is called', () => {
    it('Should return NO_DATA when all required fields are blank', () => {
      const result = computeStatus({
        date: ' ',
        time: ' ',
        name: ' ',
        phone: ' ',
        service: ' ',
        quantity: ' ',
        intent: ' ',
      });

      expect(result.status).toBe(TemporalStatusEnum.NO_DATA);
      expect(result.missingFields.length).toBeGreaterThan(0);
    });

    it('Should return COMPLETED when all required fields are present', () => {
      const result = computeStatus({
        date: '03/03/2026',
        time: '20:00',
        name: 'Juan',
        phone: '54911',
        service: 'Cena',
        quantity: '2',
        intent: 'create',
      });

      expect(result.status).toBe(TemporalStatusEnum.COMPLETED);
      expect(result.missingFields).toEqual([]);
    });
  });

  describe('When objectToRowArray and buildEmptyRow are called', () => {
    it('Should map object keys to row order and stringify values', () => {
      const row = objectToRowArray({
        date: '03/03/2026',
        time: '20:00',
        name: 'Juan',
        phone: '54911',
        service: 'Cena',
        quantity: '2',
        waId: 'wa-1',
        status: TemporalStatusEnum.IN_PROGRESS,
        intent: 'create',
      });

      expect(row).toHaveLength(9);
      expect(row[6]).toBe('wa-1');
      expect(row[7]).toBe(TemporalStatusEnum.IN_PROGRESS);
    });

    it('Should create default empty row preserving waId', () => {
      const row = buildEmptyRow('wa-200');

      expect(row[6]).toBe('wa-200');
      expect(row[7]).toBe(TemporalStatusEnum.NO_DATA);
    });
  });
});
