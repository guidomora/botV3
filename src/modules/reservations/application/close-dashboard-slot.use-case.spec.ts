import { BadRequestException, ConflictException } from '@nestjs/common';
import { DatesService } from 'src/modules/dates/service/dates.service';
import { CloseDashboardSlotUseCase } from './close-dashboard-slot.use-case';
import { ReservationsDashboardReadPort } from '../ports/reservations-dashboard-read.port';

describe('CloseDashboardSlotUseCase', () => {
  let useCase: CloseDashboardSlotUseCase;
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
      isDayClosed: jest.fn(),
    };

    useCase = new CloseDashboardSlotUseCase(datesServiceMock, reservationsDashboardReadPort);
    process.env.RESERVATION_DURATION_MINUTES = '120';
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

  it('should close the slot and report overlapping reservations', async () => {
    datesServiceMock.resolveAgendaDateLabel.mockResolvedValue('jueves 16 de abril 2026 16/04/2026');
    reservationsDashboardReadPort.getReservationsByDate.mockResolvedValue([
      {
        date: 'jueves 16 de abril 2026 16/04/2026',
        time: '12:30',
        name: 'Juan Perez',
        phone: '54-9-1122334455',
        service: 'Cena',
        quantity: 4,
      },
      {
        date: 'jueves 16 de abril 2026 16/04/2026',
        time: '18:00',
        name: 'Ana Lopez',
        phone: '54-9-1166778899',
        service: 'Cena',
        quantity: 2,
      },
    ]);
    reservationsDashboardReadPort.closeSlot.mockResolvedValue({
      fromTime: '12:00',
      toTime: '15:00',
      reason: 'Evento privado',
    });

    await expect(
      useCase.execute({
        date: '2026-04-16',
        fromTime: '13:00',
        toTime: '15:00',
        reason: 'Evento privado',
      }),
    ).resolves.toEqual({
      date: '2026-04-16',
      fromTime: '12:00',
      toTime: '15:00',
      isClosed: true,
      reason: 'Evento privado',
      existingReservationsCount: 1,
      warning:
        'La franja fue cerrada, pero todavia existen 1 reservas activas afectadas que deberan ser gestionadas manualmente.',
    });
  });
});
