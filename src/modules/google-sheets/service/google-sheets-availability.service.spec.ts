import { availabilityRowsMock } from '../test/mocks/google-sheets-data.mock';
import { createGoogleSheetsRepositoryMock } from '../test/mocks/google-repository.mock';
import { GoogleSheetsAvailabilityService } from './google-sheets-availability.service';
import { GoogleSheetsClosedScheduleService } from './google-sheets-closed-schedule.service';
import { GoogleSheetsReservationsService } from './google-sheets-reservations.service';

describe('Given GoogleSheetsAvailabilityService', () => {
  const originalEnv = process.env;
  let repository = createGoogleSheetsRepositoryMock();
  let reservationsService: GoogleSheetsReservationsService;
  let closedScheduleService: GoogleSheetsClosedScheduleService;
  let service: GoogleSheetsAvailabilityService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      MAX_CAPACITY_TOTAL: '50',
      ONLINE_BUFFER_PERCENT: '20',
      RESERVATION_DURATION_MINUTES: '120',
      SLOT_INTERVAL_MINUTES: '60',
    };
    repository = createGoogleSheetsRepositoryMock();
    reservationsService = new GoogleSheetsReservationsService(repository);
    closedScheduleService = new GoogleSheetsClosedScheduleService(repository);
    service = new GoogleSheetsAvailabilityService(
      repository,
      reservationsService,
      closedScheduleService,
    );
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('Should return availability from sheet counters when the slot exists', async () => {
    repository.getDates.mockResolvedValue(availabilityRowsMock);
    repository.getAvailability.mockResolvedValue([['2', '10']]);

    await expect(
      service.getAvailability('martes 03 de marzo 2026 03/03/2026', '19:00'),
    ).resolves.toEqual({ isAvailable: true, reservations: 2, available: 10 });
  });

  it('Should validate availability from overlapping reservations', async () => {
    repository.getDates
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        ['Fecha', 'Hora', 'Mesas reservadas', 'Mesas disponibles'],
        ['martes 03 de marzo 2026 03/03/2026', '20:00', '0', '40'],
        ['martes 03 de marzo 2026 03/03/2026', '21:00', '0', '40'],
        ['martes 03 de marzo 2026 03/03/2026', '22:00', '0', '40'],
      ])
      .mockResolvedValueOnce([
        ['Fecha', 'Hora', 'Cliente', 'Telefono', 'Servicio', 'Cantidad'],
        ['martes 03 de marzo 2026 03/03/2026', '22:00', 'ana', '1', 'Cena', '39'],
      ]);

    const result = await service.getAvailabilityFromReservations(
      'martes 03 de marzo 2026 03/03/2026',
      '21:00',
      2,
    );

    expect(result).toEqual({ isAvailable: false, reservations: 0, available: 40 });
  });

  it('Should exclude day availability rows blocked by closed slots', async () => {
    repository.getDates
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(availabilityRowsMock)
      .mockResolvedValueOnce([
        ['2026-03-03', '20:00', '22:00', 'Evento privado', '2026-03-01T10:00:00.000Z'],
      ]);

    await expect(service.getDayAvailability('martes 03 de marzo 2026 03/03/2026')).resolves.toEqual(
      [],
    );
  });

  it('Should return available dates with closed-day status', async () => {
    repository.getDates
      .mockResolvedValueOnce([
        ['Fecha'],
        ['viernes 10 de abril 2026 10/04/2026'],
        ['jueves 09 de abril 2026 09/04/2026'],
        ['viernes 10 de abril 2026 10/04/2026'],
      ])
      .mockResolvedValueOnce([
        ['2026-04-10', 'Cerrado por mantenimiento', '2026-04-01T10:00:00.000Z'],
      ]);

    await expect(service.getAvailableReservationDates()).resolves.toEqual([
      { date: '2026-04-09', isClosed: false },
      { date: '2026-04-10', isClosed: true },
    ]);
  });

  it('Should map daily slots and mark partial closures', async () => {
    repository.getDates
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(availabilityRowsMock)
      .mockResolvedValueOnce([
        ['2026-03-03', '20:00', '22:00', 'Evento privado', '2026-03-01T10:00:00.000Z'],
      ]);

    await expect(
      service.getAvailabilitySlotsByDate('martes 03 de marzo 2026 03/03/2026'),
    ).resolves.toEqual([
      { time: '19:00', reserved: 2, available: 10, isClosed: true, reason: 'Evento privado' },
      { time: '21:00', reserved: 3, available: 8, isClosed: true, reason: 'Evento privado' },
    ]);
  });

  it('Should update valid availability counters and reject invalid states', async () => {
    repository.getDates.mockResolvedValue(availabilityRowsMock);

    await service.updateAvailabilityFromReservations({
      date: 'martes 03 de marzo 2026 03/03/2026',
      time: '19:00',
      reservations: 2,
      available: 10,
    });

    const invalidResponse = await service.updateAvailabilityFromReservations({
      date: 'martes 03 de marzo 2026 03/03/2026',
      time: '19:00',
      reservations: -1,
      available: 41,
    });

    expect(repository.updateAvailabilitySheet.mock.calls).toEqual([
      ['ReservasDisponibles!C2:D2', { reservations: 2, available: 10 }],
    ]);
    expect(invalidResponse).toBe('Estado inválido de disponibilidad.');
  });

  it('Should recalculate each availability slot for a date', async () => {
    repository.getDates
      .mockResolvedValueOnce([
        ['Fecha', 'Hora', 'Mesas reservadas', 'Mesas disponibles'],
        ['martes 03 de marzo 2026 03/03/2026', '20:00', '0', '40'],
        ['martes 03 de marzo 2026 03/03/2026', '21:00', '0', '40'],
        ['martes 03 de marzo 2026 03/03/2026', '22:00', '0', '40'],
      ])
      .mockResolvedValueOnce([
        ['Fecha', 'Hora', 'Cliente', 'Telefono', 'Servicio', 'Cantidad'],
        ['martes 03 de marzo 2026 03/03/2026', '21:00', 'maria', '1', 'Cena', '4'],
      ]);

    await service.refreshAvailabilityForDate('martes 03 de marzo 2026 03/03/2026');

    expect(repository.updateAvailabilitySheet.mock.calls).toEqual([
      ['ReservasDisponibles!C2:D2', { reservations: 0, available: 40 }],
      ['ReservasDisponibles!C3:D3', { reservations: 4, available: 36 }],
      ['ReservasDisponibles!C4:D4', { reservations: 4, available: 36 }],
    ]);
  });
});
