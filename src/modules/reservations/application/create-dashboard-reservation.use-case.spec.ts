import { ConflictException } from '@nestjs/common';
import { StatusEnum } from 'src/lib';
import { DatesService } from 'src/modules/dates/service/dates.service';
import { CreateReservationQueueService } from 'src/modules/reservation-jobs/service/create-reservation-queue.service';
import { CreateDashboardReservationUseCase } from './create-dashboard-reservation.use-case';

describe('CreateDashboardReservationUseCase', () => {
  let useCase: CreateDashboardReservationUseCase;

  const datesServiceMock = {
    resolveAgendaDateLabel: jest.fn(),
  } as unknown as jest.Mocked<DatesService>;
  const createReservationQueueServiceMock = {
    createReservation: jest.fn(),
  } as unknown as jest.Mocked<CreateReservationQueueService>;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreateDashboardReservationUseCase(
      datesServiceMock,
      createReservationQueueServiceMock,
    );
  });

  it('should throw conflict when target date is not present in agenda', async () => {
    datesServiceMock.resolveAgendaDateLabel.mockResolvedValue(null);

    await expect(
      useCase.execute({
        date: '2026-04-16',
        time: '21:00',
        name: 'Juan Perez',
        phone: '1122334455',
        quantity: 4,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('should map business errors to conflict', async () => {
    datesServiceMock.resolveAgendaDateLabel.mockResolvedValue('jueves 16 de abril 2026 16/04/2026');
    createReservationQueueServiceMock.createReservation.mockResolvedValue({
      status: StatusEnum.NO_AVAILABILITY,
      message: 'No hay lugar para esa cantidad de personas en ese horario.',
      error: true,
    });

    await expect(
      useCase.execute({
        date: '2026-04-16',
        time: '21:00',
        name: 'Juan Perez',
        phone: '1122334455',
        quantity: 14,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('should create reservation using normalized phone and allow large reservations', async () => {
    datesServiceMock.resolveAgendaDateLabel.mockResolvedValue('jueves 16 de abril 2026 16/04/2026');
    createReservationQueueServiceMock.createReservation.mockResolvedValue({
      status: StatusEnum.SUCCESS,
      message:
        'Reserva creada correctamente para el dia jueves 16 de abril 2026 16/04/2026 a las 21:00 para Juan Perez y 14 personas',
      error: false,
    });

    await expect(
      useCase.execute({
        date: '2026-04-16',
        time: '21:00',
        name: ' Juan Perez ',
        phone: '11 2233-4455',
        quantity: 14,
      }),
    ).resolves.toEqual({
      message:
        'Reserva creada correctamente para el dia jueves 16 de abril 2026 16/04/2026 a las 21:00 para Juan Perez y 14 personas',
      reservation: {
        date: 'jueves 16 de abril 2026 16/04/2026',
        time: '21:00',
        name: 'Juan Perez',
        phone: '54-9-1122334455',
        service: 'Cena',
        quantity: 14,
      },
    });

    expect(createReservationQueueServiceMock.createReservation.mock.calls[0]).toEqual([
      {
        date: 'jueves 16 de abril 2026 16/04/2026',
        time: '21:00',
        name: 'Juan Perez',
        phone: '54-9-1122334455',
        quantity: 14,
      },
      {
        allowLargeReservations: true,
      },
    ]);
  });
});
