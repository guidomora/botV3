import { calculateCapacityForRequestedWindow } from './capacity-overlap.helper';

describe('Given capacity-overlap helper', () => {
  describe('When calculateCapacityForRequestedWindow is called', () => {
    it('Should only affect the requested slot and forward slots within the duration', () => {
      const result = calculateCapacityForRequestedWindow({
        date: 'martes 03 de marzo 2026 03/03/2026',
        time: '20:00',
        requestedPeople: 2,
        reservationDurationMinutes: 120,
        slotIntervalMinutes: 60,
        onlineMaxCapacity: 10,
        availableSlotTimes: ['20:00', '21:00', '22:00', '23:00'],
        existingReservations: [
          ['martes 03 de marzo 2026 03/03/2026', '19:00', 'A', '1', 'Cena', '3'],
          ['martes 03 de marzo 2026 03/03/2026', '21:00', 'B', '2', 'Cena', '4'],
          ['martes 03 de marzo 2026 03/03/2026', '23:00', 'C', '3', 'Cena', '8'],
        ],
      });

      expect(result.affectedSlotTimes).toEqual(['20:00', '21:00']);
      expect(result.occupiedPeople).toBe(3);
      expect(result.availableCapacity).toBe(7);
      expect(result.canReserve).toBe(true);
    });

    it('Should ignore invalid rows and excluded row index', () => {
      const result = calculateCapacityForRequestedWindow({
        date: 'martes 03 de marzo 2026 03/03/2026',
        time: '20:00',
        requestedPeople: 5,
        reservationDurationMinutes: 120,
        slotIntervalMinutes: 60,
        onlineMaxCapacity: 10,
        excludedRowIndex: 1,
        availableSlotTimes: ['20:00', '21:00', '22:00'],
        existingReservations: [
          ['martes 03 de marzo 2026 03/03/2026', '20:00', 'A', '1', 'Cena', '4'],
          ['martes 03 de marzo 2026 03/03/2026', '20:30', 'B', '2', 'Cena', '0'],
          ['martes 03 de marzo 2026 03/03/2026', '20:40', 'C', '3', 'Cena', 'abc'],
          ['martes 03 de marzo 2026 03/03/2026', '21:00', 'D', '4', 'Cena', '3'],
        ],
      });

      expect(result.occupiedPeople).toBe(0);
      expect(result.canReserve).toBe(true);
    });
  });
});
