import { DashboardAvailableDates } from 'src/lib';
import { GetAvailableReservationDatesUseCase } from './get-available-reservation-dates.use-case';
import { ReservationsDashboardReadPort } from '../ports/reservations-dashboard-read.port';

describe('GetAvailableReservationDatesUseCase', () => {
  let useCase: GetAvailableReservationDatesUseCase;
  let reservationsDashboardReadPort: jest.Mocked<ReservationsDashboardReadPort>;

  beforeEach(() => {
    reservationsDashboardReadPort = {
      getAvailableDates: jest.fn<Promise<DashboardAvailableDates>, []>(),
      getReservationsByDate: jest.fn(),
      getAvailabilitySlotsByDate: jest.fn(),
    };

    useCase = new GetAvailableReservationDatesUseCase(reservationsDashboardReadPort);
  });

  it('should return available reservation dates from dashboard port', async () => {
    reservationsDashboardReadPort.getAvailableDates.mockResolvedValue([
      '2026-04-01',
      '2026-04-02',
      '2026-04-03',
    ]);

    await expect(useCase.execute()).resolves.toEqual(['2026-04-01', '2026-04-02', '2026-04-03']);
    expect(reservationsDashboardReadPort.getAvailableDates.mock.calls).toHaveLength(1);
  });
});
