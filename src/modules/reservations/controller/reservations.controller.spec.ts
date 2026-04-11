import { Test, TestingModule } from '@nestjs/testing';
import { ReservationsController } from './reservations.controller';
import { ReservationsDashboardService } from '../service/reservations-dashboard.service';
import { InternalApiTokenGuard } from '../guards/internal-api-token.guard';

describe('ReservationsController', () => {
  let controller: ReservationsController;

  const reservationsDashboardServiceMock = {
    getDailySummary: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleBuilder = Test.createTestingModule({
      controllers: [ReservationsController],
      providers: [
        {
          provide: ReservationsDashboardService,
          useValue: reservationsDashboardServiceMock,
        },
      ],
    });

    moduleBuilder
      .overrideGuard(InternalApiTokenGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) });

    const module: TestingModule = await moduleBuilder.compile();

    controller = module.get(ReservationsController);
  });

  it('should delegate daily summary request using formatted sheet date', async () => {
    reservationsDashboardServiceMock.getDailySummary.mockResolvedValue({
      date: '2026-04-10',
      sheetDate: '10/04/2026',
      reservationsCount: 2,
      totalCapacity: 42,
      totalPeopleReserved: 6,
      reservations: [],
      slots: [],
    });

    await expect(controller.getDailySummary({ date: '2026-04-10' })).resolves.toEqual({
      date: '2026-04-10',
      sheetDate: '10/04/2026',
      reservationsCount: 2,
      totalCapacity: 42,
      totalPeopleReserved: 6,
      reservations: [],
      slots: [],
    });

    expect(reservationsDashboardServiceMock.getDailySummary).toHaveBeenCalledWith(
      '2026-04-10',
      '10/04/2026',
    );
  });
});
