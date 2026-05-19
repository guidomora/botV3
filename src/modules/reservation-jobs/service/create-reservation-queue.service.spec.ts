import { Queue, QueueEvents } from 'bullmq';
import { CREATE_RESERVATION_QUEUE_NAME } from '../reservation-jobs.constants';
import { CreateReservationQueueError } from '../errors/create-reservation-queue.error';
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
  it('deberia marcar error como no encolado cuando queue.add falla', async () => {
    const addMock = jest.fn().mockRejectedValue(new Error('redis unavailable'));
    const waitUntilReadyMock = jest.fn().mockResolvedValue(undefined);
    const queueEventsWaitUntilReadyMock = jest.fn().mockResolvedValue(undefined);

    reservationJobsRedisServiceMock.isEnabled.mockReturnValue(true);
    queueConstructorMock.mockImplementation(() => ({
      add: addMock,
      waitUntilReady: waitUntilReadyMock,
      close: jest.fn(),
    }));
    queueEventsConstructorMock.mockImplementation(() => ({
      waitUntilReady: queueEventsWaitUntilReadyMock,
      close: jest.fn(),
    }));

    const service = new CreateReservationQueueService(
      datesServiceMock as never,
      reservationJobsRedisServiceMock as never,
    );

    await service.onModuleInit();

    await expect(
      service.createReservation({
        date: 'domingo 29 de marzo 2026 29/03/2026',
        time: '21:00',
        name: 'guido',
        phone: '5491112345678',
        quantity: 2,
      }),
    ).rejects.toMatchObject({
      enqueued: false,
      message: 'redis unavailable',
    } satisfies Partial<CreateReservationQueueError>);
  });

  it('deberia marcar error como encolado cuando falla waitUntilFinished', async () => {
    const waitUntilFinishedMock = jest.fn().mockRejectedValue(new Error('queue timeout'));
    const addMock = jest.fn().mockResolvedValue({
      id: 'job-1',
      waitUntilFinished: waitUntilFinishedMock,
    });
    const waitUntilReadyMock = jest.fn().mockResolvedValue(undefined);
    const queueEventsWaitUntilReadyMock = jest.fn().mockResolvedValue(undefined);

    reservationJobsRedisServiceMock.isEnabled.mockReturnValue(true);
    queueConstructorMock.mockImplementation(() => ({
      add: addMock,
      waitUntilReady: waitUntilReadyMock,
      close: jest.fn(),
    }));
    queueEventsConstructorMock.mockImplementation(() => ({
      waitUntilReady: queueEventsWaitUntilReadyMock,
      close: jest.fn(),
    }));

    const service = new CreateReservationQueueService(
      datesServiceMock as never,
      reservationJobsRedisServiceMock as never,
    );

    await service.onModuleInit();

    await expect(
      service.createReservation({
        date: 'domingo 29 de marzo 2026 29/03/2026',
        time: '21:00',
        name: 'guido',
        phone: '5491112345678',
        quantity: 2,
      }),
    ).rejects.toMatchObject({
      enqueued: true,
      message: 'queue timeout',
    } satisfies Partial<CreateReservationQueueError>);
  });
});
