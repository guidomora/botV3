import { ConflictException, NotFoundException } from '@nestjs/common';
import { DatesService } from 'src/modules/dates/service/dates.service';
import { DeleteReservationQueueService } from 'src/modules/reservation-jobs/service/delete-reservation-queue.service';
import { DeleteDashboardReservationUseCase } from './delete-dashboard-reservation.use-case';

describe('DeleteDashboardReservationUseCase', () => {
  let useCase: DeleteDashboardReservationUseCase;

  const datesServiceMock = {
    findReservationByLookup: jest.fn(),
  } as unknown as jest.Mocked<DatesService>;
  const deleteReservationQueueServiceMock = {
    deleteReservation: jest.fn(),
  } as unknown as jest.Mocked<DeleteReservationQueueService>;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new DeleteDashboardReservationUseCase(
      datesServiceMock,
      deleteReservationQueueServiceMock,
    );
  });

  it('should throw not found when reservation does not exist', async () => {
    datesServiceMock.findReservationByLookup.mockResolvedValue(null);

    await expect(
      useCase.execute({
        phone: '1122334455',
        currentDate: '2026-04-10',
        currentTime: '20:00',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should throw conflict when delete use case returns a business error message', async () => {
    datesServiceMock.findReservationByLookup.mockResolvedValue({
      date: 'viernes 10 de abril 2026 10/04/2026',
      time: '20:00',
      name: 'juan perez',
      phone: '54-9-1122334455',
      service: 'Cena',
      quantity: 2,
    });
    deleteReservationQueueServiceMock.deleteReservation.mockResolvedValue(
      'Algunos de los datos ingresados no coinciden con la reserva.',
    );

    await expect(
      useCase.execute({
        phone: '1122334455',
        currentDate: '2026-04-10',
        currentTime: '20:00',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('should delete reservation using normalized phone and resolved name', async () => {
    datesServiceMock.findReservationByLookup.mockResolvedValue({
      date: 'viernes 10 de abril 2026 10/04/2026',
      time: '20:00',
      name: 'juan perez',
      phone: '54-9-1122334455',
      service: 'Cena',
      quantity: 2,
    });
    deleteReservationQueueServiceMock.deleteReservation.mockResolvedValue(
      'Su reserva ha sido cancelada correctamente.',
    );

    await expect(
      useCase.execute({
        phone: '11 2233-4455',
        currentDate: '2026-04-10',
        currentTime: '20:00',
      }),
    ).resolves.toEqual({
      message: 'Reserva eliminada correctamente.',
      reservation: {
        date: 'viernes 10 de abril 2026 10/04/2026',
        time: '20:00',
        name: 'juan perez',
        phone: '54-9-1122334455',
        service: 'Cena',
        quantity: 2,
      },
    });

    expect(datesServiceMock.findReservationByLookup.mock.calls[0]).toEqual([
      '2026-04-10',
      '20:00',
      '54-9-1122334455',
    ]);
    expect(deleteReservationQueueServiceMock.deleteReservation.mock.calls[0]).toEqual([
      {
        phone: '54-9-1122334455',
        date: 'viernes 10 de abril 2026 10/04/2026',
        time: '20:00',
        name: 'juan perez',
      },
    ]);
  });
});
