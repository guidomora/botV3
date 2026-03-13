import { SheetsName } from 'src/constants';
import {
  availabilityRowsMock,
  reservationPayloadMock,
  reservationRowsMock,
} from '../test/mocks/google-sheets-data.mock';
import { createGoogleSheetsRepositoryMock } from '../test/mocks/google-repository.mock';
import { GoogleSheetsService } from './google-sheets.service';

describe('Given GoogleSheetsService', () => {
  const originalEnv = process.env;
  let service: GoogleSheetsService;
  let repository = createGoogleSheetsRepositoryMock();

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      MAX_CAPACITY_TOTAL: '50',
      ONLINE_BUFFER_PERCENT: '20',
      RESERVATION_DURATION_MINUTES: '120',
    };
    repository = createGoogleSheetsRepositoryMock();
    service = new GoogleSheetsService(repository);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('When getDate and getDateData are called', () => {
    it('Should return index for matching date and time', async () => {
      repository.getDates.mockResolvedValue(reservationRowsMock);

      await expect(
        service.getDate('martes 03 de marzo 2026 03/03/2026', '20:00', 'Reservas!A:C'),
      ).resolves.toBe(3);
    });

    it('Should return -1 when no date-time row exists', async () => {
      repository.getDates.mockResolvedValue(reservationRowsMock);

      await expect(service.getDate('no-date', '21:00', 'Reservas!A:C')).resolves.toBe(-1);
    });

    it('Should return row data when date-time exists', async () => {
      repository.getDates.mockResolvedValue(reservationRowsMock);

      await expect(
        service.getDateData('martes 03 de marzo 2026 03/03/2026', '19:00', 'Reservas!A:C'),
      ).resolves.toEqual(reservationRowsMock[1]);
    });
  });

  describe('When getDateIndexByData is called', () => {
    it('Should match by normalized date, name and phone', async () => {
      repository.getDates.mockResolvedValue(reservationRowsMock);

      const index = await service.getDateIndexByData({
        date: 'martes 03 de marzo 2026 03/03/2026',
        time: '20:00',
        name: 'Maria',
        phone: '1199988877',
      });

      expect(index).toBe(3);
    });
  });

  describe('When hasReservationByDateAndPhone is called', () => {
    it('Should return true when reservation exists for date and phone', async () => {
      repository.getDates.mockResolvedValue(reservationRowsMock);

      await expect(
        service.hasReservationByDateAndPhone('martes 03 de marzo 2026 03/03/2026', '1122334455'),
      ).resolves.toBe(true);
    });

    it('Should ignore excluded row index', async () => {
      repository.getDates.mockResolvedValue(reservationRowsMock);

      await expect(
        service.hasReservationByDateAndPhone('martes 03 de marzo 2026 03/03/2026', '1122334455', 2),
      ).resolves.toBe(false);
    });
  });

  describe('When getAvailability is called', () => {
    it('Should return unavailable when date-time does not exist', async () => {
      repository.getDates.mockResolvedValue([]);

      await expect(
        service.getAvailability('martes 03 de marzo 2026 03/03/2026', '19:00'),
      ).resolves.toEqual({
        isAvailable: false,
        reservations: 0,
        available: 0,
      });
    });

    it('Should return available based on sheet counters and max capacity', async () => {
      repository.getDates.mockResolvedValue(availabilityRowsMock);
      repository.getAvailability.mockResolvedValue([['2', '10']]);

      const result = await service.getAvailability('martes 03 de marzo 2026 03/03/2026', '19:00');

      expect(result).toEqual({ isAvailable: true, reservations: 2, available: 10 });
    });
  });

  describe('When getAvailabilityFromReservations is called', () => {
    it('Should calculate occupied and available capacity from overlapping windows', async () => {
      repository.getDates.mockResolvedValue(reservationRowsMock);

      const result = await service.getAvailabilityFromReservations(
        'martes 03 de marzo 2026 03/03/2026',
        '20:00',
        2,
      );

      expect(result.reservations).toBe(9);
      expect(result.available).toBe(31);
      expect(result.isAvailable).toBe(true);
    });
  });

  describe('When updateAvailabilityFromReservations is called', () => {
    it('Should reject invalid state without writing sheet', async () => {
      repository.getDates.mockResolvedValue(availabilityRowsMock);

      const response = await service.updateAvailabilityFromReservations({
        date: 'martes 03 de marzo 2026 03/03/2026',
        time: '19:00',
        reservations: -1,
        available: 41,
      });

      expect(response).toBe('Estado inválido de disponibilidad.');
      expect(repository.updateAvailabilitySheet).not.toHaveBeenCalled();
    });

    it('Should update counters in availability sheet for valid state', async () => {
      repository.getDates.mockResolvedValue(availabilityRowsMock);

      await service.updateAvailabilityFromReservations({
        date: 'martes 03 de marzo 2026 03/03/2026',
        time: '19:00',
        reservations: 2,
        available: 10,
      });

      expect(repository.updateAvailabilitySheet).toHaveBeenCalledTimes(1);
    });
  });

  describe('When refreshAvailabilityForDate is called', () => {
    it('Should recalculate each slot and update all matched rows', async () => {
      repository.getDates
        .mockResolvedValueOnce(availabilityRowsMock)
        .mockResolvedValueOnce(reservationRowsMock)
        .mockResolvedValueOnce(availabilityRowsMock)
        .mockResolvedValueOnce(availabilityRowsMock)
        .mockResolvedValueOnce(availabilityRowsMock);

      await service.refreshAvailabilityForDate('martes 03 de marzo 2026 03/03/2026');

      expect(repository.updateAvailabilitySheet).toHaveBeenCalledTimes(3);
    });
  });

  describe('When wrappers are called', () => {
    it('Should delegate createReservation and insertRow behavior', async () => {
      repository.insertRow.mockResolvedValue(undefined);

      await service.createReservation('Reservas!A2:F2', reservationPayloadMock);
      const insertResult = await service.insertRow(`${SheetsName.AVAILABLE_BOOKINGS}!A1`, 8);

      expect(repository.createReservation).toHaveBeenCalledWith(
        'Reservas!A2:F2',
        reservationPayloadMock,
      );
      expect(repository.insertRow).toHaveBeenCalledWith(8, 1);
      expect(insertResult).toBe(9);
    });
  });
});
