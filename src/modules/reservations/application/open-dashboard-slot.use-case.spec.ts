import { BadRequestException, ConflictException } from '@nestjs/common';
import { DatesService } from 'src/modules/dates/service/dates.service';
import { OpenDashboardSlotUseCase } from './open-dashboard-slot.use-case';
import { ReservationsDashboardReadPort } from '../ports/reservations-dashboard-read.port';

describe('OpenDashboardSlotUseCase', () => {
  let useCase: OpenDashboardSlotUseCase;
  let reservationsDashboardReadPort: jest.Mocked<ReservationsDashboardReadPort>;

  const datesServiceMock = {
    resolveAgendaDateLabel: jest.fn(),
  } as unknown as jest.Mocked<DatesService>;

  beforeEach(() => {
    jest.clearAllMocks();

    reservationsDashboardReadPort = {
      getAvailableDates: jest.fn(),
      getReservationsByDate: jest.fn(),
      getAvailabilitySlotsByDate: jest.fn(),
      closeDay: jest.fn(),
      closeSlot: jest.fn(),
      openDay: jest.fn(),
      openSlot: jest.fn(),
      isDayClosed: jest.fn(),
    };

    useCase = new OpenDashboardSlotUseCase(datesServiceMock, reservationsDashboardReadPort);
  });

  it('should reject dates that are not in agenda', async () => {
    datesServiceMock.resolveAgendaDateLabel.mockResolvedValue(null);

    await expect(
      useCase.execute({ date: '2026-04-16', fromTime: '13:00', toTime: '15:00' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('should reject invalid ranges', async () => {
    await expect(
      useCase.execute({ date: '2026-04-16', fromTime: '15:00', toTime: '13:00' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should reject slot reopening when the full day is closed', async () => {
    datesServiceMock.resolveAgendaDateLabel.mockResolvedValue('jueves 16 de abril 2026 16/04/2026');
    reservationsDashboardReadPort.isDayClosed.mockResolvedValue(true);

    await expect(
      useCase.execute({ date: '2026-04-16', fromTime: '13:00', toTime: '15:00' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('should reopen the slot using the dashboard port', async () => {
    datesServiceMock.resolveAgendaDateLabel.mockResolvedValue('jueves 16 de abril 2026 16/04/2026');
    reservationsDashboardReadPort.isDayClosed.mockResolvedValue(false);
    reservationsDashboardReadPort.openSlot.mockResolvedValue(1);

    await expect(
      useCase.execute({ date: '2026-04-16', fromTime: '13:00', toTime: '15:00' }),
    ).resolves.toEqual({
      date: '2026-04-16',
      fromTime: '13:00',
      toTime: '15:00',
      isClosed: false,
      reopenedSlotsCount: 1,
    });

    expect(reservationsDashboardReadPort.openSlot.mock.calls[0]).toEqual([
      { date: '2026-04-16', fromTime: '13:00', toTime: '15:00' },
    ]);
  });
});
