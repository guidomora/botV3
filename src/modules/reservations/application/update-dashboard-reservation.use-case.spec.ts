import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { StatusEnum } from 'src/lib';
import { DatesService } from 'src/modules/dates/service/dates.service';
import { UpdateReservationQueueService } from 'src/modules/reservation-jobs/service/update-reservation-queue.service';
import { UpdateDashboardReservationUseCase } from './update-dashboard-reservation.use-case';

describe('UpdateDashboardReservationUseCase', () => {
  let useCase: UpdateDashboardReservationUseCase;

  const datesServiceMock = {
    findReservationByLookup: jest.fn(),
    resolveAgendaDateLabel: jest.fn(),
  } as unknown as jest.Mocked<DatesService>;
  const updateReservationQueueServiceMock = {
    updateReservation: jest.fn(),
  } as unknown as jest.Mocked<UpdateReservationQueueService>;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new UpdateDashboardReservationUseCase(
      datesServiceMock,
      updateReservationQueueServiceMock,
    );
  });

  it('should throw not found when original reservation does not exist', async () => {
    datesServiceMock.findReservationByLookup.mockResolvedValue(null);

    await expect(
      useCase.execute({
        phone: '1122334455',
        currentDate: '2026-04-10',
        currentTime: '20:00',
        time: '21:00',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should throw bad request when no editable fields are provided', async () => {
    await expect(
      useCase.execute({
        phone: '1122334455',
        currentDate: '2026-04-10',
        currentTime: '20:00',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should throw conflict when target date is not present in agenda', async () => {
    datesServiceMock.findReservationByLookup.mockResolvedValue({
      date: 'viernes 10 de abril 2026 10/04/2026',
      time: '20:00',
      name: 'juan perez',
      phone: '54-9-1122334455',
      service: 'Cena',
      quantity: 2,
    });
    datesServiceMock.resolveAgendaDateLabel.mockResolvedValue(null);

    await expect(
      useCase.execute({
        phone: '1122334455',
        currentDate: '2026-04-10',
        currentTime: '20:00',
        date: '2026-04-11',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('should map missing data errors to bad request', async () => {
    datesServiceMock.findReservationByLookup.mockResolvedValue({
      date: 'viernes 10 de abril 2026 10/04/2026',
      time: '20:00',
      name: 'juan perez',
      phone: '54-9-1122334455',
      service: 'Cena',
      quantity: 2,
    });
    updateReservationQueueServiceMock.updateReservation.mockResolvedValue({
      status: StatusEnum.MISSING_DATA_UPDATE,
      message: 'Faltan datos de la reserva original',
      error: true,
    });

    await expect(
      useCase.execute({
        phone: '1122334455',
        currentDate: '2026-04-10',
        currentTime: '20:00',
        time: '21:00',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should update reservation using normalized phone and resolved target values', async () => {
    datesServiceMock.findReservationByLookup.mockResolvedValue({
      date: 'viernes 10 de abril 2026 10/04/2026',
      time: '20:00',
      name: 'juan perez',
      phone: '54-9-1122334455',
      service: 'Cena',
      quantity: 2,
    });
    datesServiceMock.resolveAgendaDateLabel.mockResolvedValue('sabado 11 de abril 2026 11/04/2026');
    updateReservationQueueServiceMock.updateReservation.mockResolvedValue({
      status: StatusEnum.SUCCESS,
      message: 'Reserva actualizada correctamente.',
      error: false,
    });

    await expect(
      useCase.execute({
        phone: '11 2233-4455',
        currentDate: '2026-04-10',
        currentTime: '20:00',
        date: '2026-04-11',
        time: '21:00',
        name: 'Juan Perez Modificado',
        quantity: 4,
      }),
    ).resolves.toEqual({
      message: 'Reserva actualizada correctamente.',
      reservation: {
        date: 'sabado 11 de abril 2026 11/04/2026',
        time: '21:00',
        name: 'Juan Perez Modificado',
        phone: '54-9-1122334455',
        service: 'Cena',
        quantity: 4,
      },
    });

    expect(datesServiceMock.findReservationByLookup.mock.calls[0]).toEqual([
      '2026-04-10',
      '20:00',
      '54-9-1122334455',
    ]);
    expect(updateReservationQueueServiceMock.updateReservation.mock.calls[0]).toEqual([
      {
        currentName: 'juan perez',
        phone: '54-9-1122334455',
        currentDate: 'viernes 10 de abril 2026 10/04/2026',
        currentTime: '20:00',
        currentQuantity: '2',
        newDate: 'sabado 11 de abril 2026 11/04/2026',
        newTime: '21:00',
        newName: 'Juan Perez Modificado',
        newQuantity: '4',
        stage: 'reschedule',
      },
      {
        allowLargeReservations: true,
      },
    ]);
  });
});
