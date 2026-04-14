import { GetAvailableReservationDatesUseCase } from '../application/get-available-reservation-dates.use-case';
import { DailyReservationsSummary } from 'src/lib';
import { GetDailyReservationsSummaryUseCase } from '../application/get-daily-reservations-summary.use-case';
import { ReservationsDashboardService } from './reservations-dashboard.service';

describe('ReservationsDashboardService', () => {
  let service: ReservationsDashboardService;
  let getAvailableReservationDatesUseCase: jest.Mocked<GetAvailableReservationDatesUseCase>;
  let getDailyReservationsSummaryUseCase: jest.Mocked<GetDailyReservationsSummaryUseCase>;

  beforeEach(() => {
    getAvailableReservationDatesUseCase = {
      execute: jest.fn<Promise<string[]>, []>(),
    } as unknown as jest.Mocked<GetAvailableReservationDatesUseCase>;

    getDailyReservationsSummaryUseCase = {
      execute: jest.fn<Promise<DailyReservationsSummary>, [string, string]>(),
    } as unknown as jest.Mocked<GetDailyReservationsSummaryUseCase>;

    service = new ReservationsDashboardService(
      getAvailableReservationDatesUseCase,
      getDailyReservationsSummaryUseCase,
    );
  });

  it('should delegate available dates retrieval to the use case', async () => {
    getAvailableReservationDatesUseCase.execute.mockResolvedValue([
      '2026-04-01',
      '2026-04-02',
      '2026-04-03',
    ]);

    await expect(service.getAvailableDates()).resolves.toEqual([
      '2026-04-01',
      '2026-04-02',
      '2026-04-03',
    ]);
    expect(getAvailableReservationDatesUseCase.execute.mock.calls).toHaveLength(1);
  });

  it('should delegate summary retrieval to the use case', async () => {
    getDailyReservationsSummaryUseCase.execute.mockResolvedValue({
      date: '2026-04-10',
      sheetDate: '10/04/2026',
      reservationsCount: 2,
      totalCapacity: 42,
      totalPeopleReserved: 6,
      reservations: [],
      slots: [],
    });

    await expect(service.getDailySummary('2026-04-10', '10/04/2026')).resolves.toEqual({
      date: '2026-04-10',
      sheetDate: '10/04/2026',
      reservationsCount: 2,
      totalCapacity: 42,
      totalPeopleReserved: 6,
      reservations: [],
      slots: [],
    });
    expect(getDailyReservationsSummaryUseCase.execute.mock.calls[0]).toEqual([
      '2026-04-10',
      '10/04/2026',
    ]);
  });
});
