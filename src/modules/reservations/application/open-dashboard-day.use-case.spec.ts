import { OpenDashboardDayUseCase } from './open-dashboard-day.use-case';
import { ReservationsDashboardReadPort } from '../ports/reservations-dashboard-read.port';

describe('OpenDashboardDayUseCase', () => {
  let useCase: OpenDashboardDayUseCase;
  let reservationsDashboardReadPort: jest.Mocked<ReservationsDashboardReadPort>;

  beforeEach(() => {
    reservationsDashboardReadPort = {
      getAvailableDates: jest.fn(),
      getReservationsByDate: jest.fn(),
      getAvailabilitySlotsByDate: jest.fn(),
      closeDay: jest.fn(),
      openDay: jest.fn(),
      isDayClosed: jest.fn(),
    };

    useCase = new OpenDashboardDayUseCase(reservationsDashboardReadPort);
  });

  it('should reopen the day using the dashboard port', async () => {
    await expect(useCase.execute('2026-04-16')).resolves.toEqual({
      date: '2026-04-16',
      isClosed: false,
    });

    expect(reservationsDashboardReadPort.openDay.mock.calls[0]).toEqual(['2026-04-16']);
  });
});
