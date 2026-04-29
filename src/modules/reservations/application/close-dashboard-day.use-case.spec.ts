import { ConflictException } from '@nestjs/common';
import { DatesService } from 'src/modules/dates/service/dates.service';
import { CloseDashboardDayUseCase } from './close-dashboard-day.use-case';
import { ReservationsDashboardReadPort } from '../ports/reservations-dashboard-read.port';

describe('CloseDashboardDayUseCase', () => {
  let useCase: CloseDashboardDayUseCase;
  let reservationsDashboardReadPort: jest.Mocked<ReservationsDashboardReadPort>;

  const datesServiceMock = {
    resolveAgendaDateLabel: jest.fn(),
  } as unknown as jest.Mocked<DatesService>;

  beforeEach(() => {
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

    useCase = new CloseDashboardDayUseCase(datesServiceMock, reservationsDashboardReadPort);
  });

  it('should reject dates that are not in agenda', async () => {
    datesServiceMock.resolveAgendaDateLabel.mockResolvedValue(null);

    await expect(useCase.execute({ date: '2026-04-16' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('should close the day and report existing reservations', async () => {
    datesServiceMock.resolveAgendaDateLabel.mockResolvedValue('jueves 16 de abril 2026 16/04/2026');
    reservationsDashboardReadPort.getReservationsByDate.mockResolvedValue([
      {
        date: 'jueves 16 de abril 2026 16/04/2026',
        time: '21:00',
        name: 'Juan Perez',
        phone: '54-9-1122334455',
        service: 'Cena',
        quantity: 4,
      },
    ]);

    await expect(
      useCase.execute({ date: '2026-04-16', reason: 'Cerrado por mantenimiento' }),
    ).resolves.toEqual({
      date: '2026-04-16',
      isClosed: true,
      reason: 'Cerrado por mantenimiento',
      existingReservationsCount: 1,
      warning:
        'La fecha fue cerrada, pero todavia existen 1 reservas activas que deberan ser gestionadas manualmente.',
    });

    expect(reservationsDashboardReadPort.closeDay.mock.calls[0]).toEqual([
      {
        date: '2026-04-16',
        reason: 'Cerrado por mantenimiento',
      },
    ]);
  });
});
