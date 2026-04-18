import { Queue, QueueEvents } from 'bullmq';
import { DELETE_RESERVATION_QUEUE_NAME } from '../reservation-jobs.constants';
import { DeleteReservationQueueService } from './delete-reservation-queue.service';

jest.mock('bullmq', () => ({
  Queue: jest.fn(),
  QueueEvents: jest.fn(),
}));

describe('DeleteReservationQueueService', () => {
  const queueConstructorMock = Queue as unknown as jest.Mock;
  const queueEventsConstructorMock = QueueEvents as unknown as jest.Mock;

  const datesServiceMock = {
    deleteReservation: jest.fn(),
  };

  const reservationJobsRedisServiceMock = {
    isEnabled: jest.fn(),
    createBullMqConnection: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    reservationJobsRedisServiceMock.createBullMqConnection.mockReturnValue({});
  });

  it('debería ejecutar delete directamente cuando reservation-jobs está deshabilitado', async () => {
    reservationJobsRedisServiceMock.isEnabled.mockReturnValue(false);
    datesServiceMock.deleteReservation.mockResolvedValue('deleted');
    const service = new DeleteReservationQueueService(
      datesServiceMock as never,
      reservationJobsRedisServiceMock as never,
    );

    await expect(
      service.deleteReservation({
        phone: '5491112345678',
        date: 'domingo 29 de marzo 2026 29/03/2026',
        time: '21:00',
        name: 'guido',
      }),
    ).resolves.toBe('deleted');

    expect(datesServiceMock.deleteReservation).toHaveBeenCalledTimes(1);
    expect(queueConstructorMock).not.toHaveBeenCalled();
  });

  it('debería encolar delete reservation y esperar el resultado cuando Redis está habilitado', async () => {
    const waitUntilFinishedMock = jest.fn().mockResolvedValue('deleted');
    const addMock = jest.fn().mockResolvedValue({
      waitUntilFinished: waitUntilFinishedMock,
      id: 'job-1',
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

    const service = new DeleteReservationQueueService(
      datesServiceMock as never,
      reservationJobsRedisServiceMock as never,
    );

    await service.onModuleInit();

    expect(queueConstructorMock).toHaveBeenCalledWith(
      DELETE_RESERVATION_QUEUE_NAME,
      expect.objectContaining({
        connection: producerConnectionMock,
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 100,
        },
      }),
    );
    expect(queueEventsConstructorMock).toHaveBeenCalledWith(DELETE_RESERVATION_QUEUE_NAME, {
      connection: eventsConnectionMock,
    });

    await expect(
      service.deleteReservation({
        phone: '5491112345678',
        date: 'domingo 29 de marzo 2026 29/03/2026',
        time: '21:00',
        name: 'guido',
      }),
    ).resolves.toBe('deleted');

    expect(addMock).toHaveBeenCalledWith('delete-reservation', {
      reservation: {
        phone: '5491112345678',
        date: 'domingo 29 de marzo 2026 29/03/2026',
        time: '21:00',
        name: 'guido',
      },
    });
  });
});
