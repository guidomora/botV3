import { DASHBOARD_TOTAL_CAPACITY } from 'src/constants';
import { DashboardReservation, DashboardReservationSlot } from 'src/lib';
import { GetDailyReservationsSummaryUseCase } from './get-daily-reservations-summary.use-case';
import { ReservationsDashboardReadPort } from '../ports/reservations-dashboard-read.port';

describe('GetDailyReservationsSummaryUseCase', () => {
  let useCase: GetDailyReservationsSummaryUseCase;
  let reservationsDashboardReadPort: jest.Mocked<ReservationsDashboardReadPort>;

  beforeEach(() => {
    reservationsDashboardReadPort = {
      getAvailableDates: jest.fn(),
      getReservationsByDate: jest.fn<Promise<DashboardReservation[]>, [string]>(),
      getAvailabilitySlotsByDate: jest.fn<Promise<DashboardReservationSlot[]>, [string]>(),
      closeDay: jest.fn(),
      closeSlot: jest.fn(),
      openDay: jest.fn(),
      isDayClosed: jest.fn(),
    };

    useCase = new GetDailyReservationsSummaryUseCase(reservationsDashboardReadPort);
  });

  it('should build dashboard summary for requested date', async () => {
    reservationsDashboardReadPort.getReservationsByDate.mockResolvedValue([
      {
        date: 'viernes 10 de abril 2026 10/04/2026',
        time: '20:00',
        name: 'juan perez',
        phone: '54-9-1122334455',
        service: 'Cena',
        quantity: 2,
      },
      {
        date: 'viernes 10 de abril 2026 10/04/2026',
        time: '21:00',
        name: 'ana lopez',
        phone: '54-9-1199988877',
        service: 'Cena',
        quantity: 4,
      },
    ]);
    reservationsDashboardReadPort.getAvailabilitySlotsByDate.mockResolvedValue([
      { time: '20:00', reserved: 10, available: 32, isClosed: false, reason: null },
      { time: '21:00', reserved: 18, available: 24, isClosed: true, reason: 'Evento privado' },
    ]);

    await expect(useCase.execute('2026-04-10', '10/04/2026')).resolves.toEqual({
      date: '2026-04-10',
      sheetDate: '10/04/2026',
      reservationsCount: 2,
      totalCapacity: DASHBOARD_TOTAL_CAPACITY,
      totalPeopleReserved: 6,
      reservations: [
        {
          date: 'viernes 10 de abril 2026 10/04/2026',
          time: '20:00',
          name: 'juan perez',
          phone: '54-9-1122334455',
          service: 'Cena',
          quantity: 2,
        },
        {
          date: 'viernes 10 de abril 2026 10/04/2026',
          time: '21:00',
          name: 'ana lopez',
          phone: '54-9-1199988877',
          service: 'Cena',
          quantity: 4,
        },
      ],
      slots: [
        { time: '20:00', reserved: 10, available: 32, isClosed: false, reason: null },
        { time: '21:00', reserved: 18, available: 24, isClosed: true, reason: 'Evento privado' },
      ],
    });
  });
});
