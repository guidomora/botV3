import { Queue, QueueEvents } from 'bullmq';
import { CREATE_RESERVATION_QUEUE_NAME } from '../reservation-jobs.constants';
import { CreateReservationQueueService } from './create-reservation-queue.service';

jest.mock('bullmq', () => ({
  Queue: jest.fn(),
  QueueEvents: jest.fn(),
}));

describe('CreateReservationQueueService', () => {
  const queueConstructorMock = Queue as unknown as jest.Mock;
  const queueEventsConstructorMock = QueueEvents as unknown as jest.Mock;

  const datesServiceMock = {
    createReservation: jest.fn(),
  };

  const reservationJobsRedisServiceMock = {
    isEnabled: jest.fn(),
    createBullMqConnection: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    reservationJobsRedisServiceMock.createBullMqConnection.mockReturnValue({});
  });

  it('debería ejecutar create directamente cuando reservation-jobs está deshabilitado', async () => {
    reservationJobsRedisServiceMock.isEnabled.mockReturnValue(false);
    datesServiceMock.createReservation.mockResolvedValue({
      status: 'SUCCESS',
      message: 'created',
      error: false,
    });
    const service = new CreateReservationQueueService(
      datesServiceMock as never,
      reservationJobsRedisServiceMock as never,
    );

    await expect(
      service.createReservation({
        date: 'domingo 29 de marzo 2026 29/03/2026',
        time: '21:00',
        name: 'guido',
        phone: '5491112345678',
        quantity: 2,
      }),
    ).resolves.toEqual({
      status: 'SUCCESS',
      message: 'created',
      error: false,
    });

    expect(datesServiceMock.createReservation).toHaveBeenCalledTimes(1);
    expect(queueConstructorMock).not.toHaveBeenCalled();
  });

  it('debería encolar create reservation y esperar el resultado cuando Redis está habilitado', async () => {
    const waitUntilFinishedMock = jest.fn().mockResolvedValue({
      status: 'SUCCESS',
      message: 'created',
      error: false,
    });
    const addMock = jest.fn().mockResolvedValue({
      waitUntilFinished: waitUntilFinishedMock,
    });
    const waitUntilReadyMock = jest.fn().mockResolvedValue(undefined);
    const queueCloseMock = jest.fn().mockResolvedValue(undefined);
    const queueEventsWaitUntilReadyMock = jest.fn().mockResolvedValue(undefined);
    const queueEventsCloseMock = jest.fn().mockResolvedValue(undefined);
    const producerConnectionMock = {};
    const eventsConnectionMock = {};

    reservationJobsRedisServiceMock.isEnabled.mockReturnValue(true);
    reservationJobsRedisServiceMock.createBullMqConnection
      .mockReturnValueOnce(producerConnectionMock)
      .mockReturnValueOnce(eventsConnectionMock);
    queueConstructorMock.mockImplementation(() => ({
      add: addMock,
      waitUntilReady: waitUntilReadyMock,
      close: queueCloseMock,
    }));
    queueEventsConstructorMock.mockImplementation(() => ({
      waitUntilReady: queueEventsWaitUntilReadyMock,
      close: queueEventsCloseMock,
    }));

    const service = new CreateReservationQueueService(
      datesServiceMock as never,
      reservationJobsRedisServiceMock as never,
    );

    await service.onModuleInit();

    expect(queueConstructorMock).toHaveBeenCalledWith(
      CREATE_RESERVATION_QUEUE_NAME,
      expect.objectContaining({
        connection: producerConnectionMock,
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 100,
        },
      }),
    );
    expect(queueEventsConstructorMock).toHaveBeenCalledWith(CREATE_RESERVATION_QUEUE_NAME, {
      connection: eventsConnectionMock,
    });

    await expect(
      service.createReservation(
        {
          date: 'domingo 29 de marzo 2026 29/03/2026',
          time: '21:00',
          name: 'guido',
          phone: '5491112345678',
          quantity: 2,
        },
        { allowLargeReservations: true },
      ),
    ).resolves.toEqual({
      status: 'SUCCESS',
      message: 'created',
      error: false,
    });

    expect(addMock).toHaveBeenCalledWith('create-reservation', {
      reservation: {
        date: 'domingo 29 de marzo 2026 29/03/2026',
        time: '21:00',
        name: 'guido',
        phone: '5491112345678',
        quantity: 2,
      },
      options: {
        allowLargeReservations: true,
      },
    });
  });
});
