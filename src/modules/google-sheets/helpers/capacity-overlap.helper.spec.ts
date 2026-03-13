import { calculateCapacityForRequestedWindow } from './capacity-overlap.helper';

describe('Given capacity-overlap helper', () => {
  describe('When calculateCapacityForRequestedWindow is called', () => {
    it('Should sum overlapping reservations and compute available capacity', () => {
      const result = calculateCapacityForRequestedWindow({
        date: 'martes 03 de marzo 2026 03/03/2026',
        time: '20:00',
        requestedPeople: 2,
        reservationDurationMinutes: 120,
        onlineMaxCapacity: 10,
        existingReservations: [
          ['martes 03 de marzo 2026 03/03/2026', '19:00', 'A', '1', 'Cena', '3'],
          ['martes 03 de marzo 2026 03/03/2026', '20:30', 'B', '2', 'Cena', '4'],
          ['martes 03 de marzo 2026 03/03/2026', '23:00', 'C', '3', 'Cena', '8'],
        ],
      });

      expect(result.occupiedPeople).toBe(7);
      expect(result.availableCapacity).toBe(3);
      expect(result.canReserve).toBe(true);
    });

    it('Should ignore invalid rows and excluded row index', () => {
      const result = calculateCapacityForRequestedWindow({
        date: 'martes 03 de marzo 2026 03/03/2026',
        time: '20:00',
        requestedPeople: 5,
        reservationDurationMinutes: 120,
        onlineMaxCapacity: 10,
        excludedRowIndex: 1,
        existingReservations: [
          ['martes 03 de marzo 2026 03/03/2026', '19:30', 'A', '1', 'Cena', '4'],
          ['martes 03 de marzo 2026 03/03/2026', '20:30', 'B', '2', 'Cena', '0'],
          ['martes 03 de marzo 2026 03/03/2026', '20:40', 'C', '3', 'Cena', 'abc'],
        ],
      });

      expect(result.occupiedPeople).toBe(0);
      expect(result.canReserve).toBe(true);
    });
  });
});
