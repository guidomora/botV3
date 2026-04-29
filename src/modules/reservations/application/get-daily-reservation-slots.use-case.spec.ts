import { DashboardReservationSlot, DailyReservationSlots } from 'src/lib';
import { GetDailyReservationSlotsUseCase } from './get-daily-reservation-slots.use-case';
import { ReservationsDashboardReadPort } from '../ports/reservations-dashboard-read.port';

describe('GetDailyReservationSlotsUseCase', () => {
  let useCase: GetDailyReservationSlotsUseCase;
  let reservationsDashboardReadPort: jest.Mocked<ReservationsDashboardReadPort>;

  beforeEach(() => {
    reservationsDashboardReadPort = {
      getAvailableDates: jest.fn(),
      getReservationsByDate: jest.fn(),
      getAvailabilitySlotsByDate: jest.fn<Promise<DashboardReservationSlot[]>, [string]>(),
      closeDay: jest.fn(),
      closeSlot: jest.fn(),
      openDay: jest.fn(),
      openSlot: jest.fn(),
      isDayClosed: jest.fn(),
    };

    useCase = new GetDailyReservationSlotsUseCase(reservationsDashboardReadPort);
  });

  it('should return availability slots for requested date', async () => {
    reservationsDashboardReadPort.getAvailabilitySlotsByDate.mockResolvedValue([
      { time: '20:00', reserved: 10, available: 32, isClosed: false, reason: null },
      { time: '21:00', reserved: 18, available: 24, isClosed: true, reason: 'Evento privado' },
    ]);

    await expect(
      useCase.execute('2026-04-10', '10/04/2026'),
    ).resolves.toEqual<DailyReservationSlots>({
      date: '2026-04-10',
      sheetDate: '10/04/2026',
      slots: [
        { time: '20:00', reserved: 10, available: 32, isClosed: false, reason: null },
        { time: '21:00', reserved: 18, available: 24, isClosed: true, reason: 'Evento privado' },
      ],
    });

    expect(reservationsDashboardReadPort.getAvailabilitySlotsByDate.mock.calls[0]).toEqual([
      '10/04/2026',
    ]);
  });
});
