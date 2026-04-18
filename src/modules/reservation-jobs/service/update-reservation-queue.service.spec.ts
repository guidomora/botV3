import { Queue, QueueEvents } from 'bullmq';
import { UPDATE_RESERVATION_QUEUE_NAME } from '../reservation-jobs.constants';
import { UpdateReservationQueueService } from './update-reservation-queue.service';

jest.mock('bullmq', () => ({
  Queue: jest.fn(),
  QueueEvents: jest.fn(),
}));

describe('UpdateReservationQueueService', () => {
  const queueConstructorMock = Queue as unknown as jest.Mock;
  const queueEventsConstructorMock = QueueEvents as unknown as jest.Mock;

  const datesServiceMock = {
    updateReservation: jest.fn(),
  };

  const reservationJobsRedisServiceMock = {
    isEnabled: jest.fn(),
    createBullMqConnection: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    reservationJobsRedisServiceMock.createBullMqConnection.mockReturnValue({});
  });

  it('debería ejecutar update directamente cuando reservation-jobs está deshabilitado', async () => {
    reservationJobsRedisServiceMock.isEnabled.mockReturnValue(false);
    datesServiceMock.updateReservation.mockResolvedValue({
      status: 'SUCCESS',
      message: 'updated',
      error: false,
    });
    const service = new UpdateReservationQueueService(
      datesServiceMock as never,
      reservationJobsRedisServiceMock as never,
    );

    await expect(
      service.updateReservation(
        {
          currentName: 'guido',
          phone: '5491112345678',
          currentDate: 'domingo 29 de marzo 2026 29/03/2026',
          currentTime: '21:00',
          currentQuantity: '2',
          newDate: 'lunes 30 de marzo 2026 30/03/2026',
          newTime: null,
          newName: null,
          newQuantity: null,
          stage: 'reschedule',
        },
        {
          allowLargeReservations: true,
        },
      ),
    ).resolves.toEqual({
      status: 'SUCCESS',
      message: 'updated',
      error: false,
    });

    expect(datesServiceMock.updateReservation).toHaveBeenCalledTimes(1);
    expect(datesServiceMock.updateReservation).toHaveBeenCalledWith(
      expect.objectContaining({
        currentName: 'guido',
        phone: '5491112345678',
      }),
      {
        allowLargeReservations: true,
      },
    );
    expect(queueConstructorMock).not.toHaveBeenCalled();
  });

  it('debería encolar update reservation y esperar el resultado cuando Redis está habilitado', async () => {
    const waitUntilFinishedMock = jest.fn().mockResolvedValue({
      status: 'SUCCESS',
      message: 'updated',
      error: false,
    });
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

    const service = new UpdateReservationQueueService(
      datesServiceMock as never,
      reservationJobsRedisServiceMock as never,
    );

    await service.onModuleInit();

    expect(queueConstructorMock).toHaveBeenCalledWith(
      UPDATE_RESERVATION_QUEUE_NAME,
      expect.objectContaining({
        connection: producerConnectionMock,
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 100,
        },
      }),
    );
    expect(queueEventsConstructorMock).toHaveBeenCalledWith(UPDATE_RESERVATION_QUEUE_NAME, {
      connection: eventsConnectionMock,
    });

    await expect(
      service.updateReservation(
        {
          currentName: 'guido',
          phone: '5491112345678',
          currentDate: 'domingo 29 de marzo 2026 29/03/2026',
          currentTime: '21:00',
          currentQuantity: '2',
          newDate: 'lunes 30 de marzo 2026 30/03/2026',
          newTime: null,
          newName: null,
          newQuantity: null,
          stage: 'reschedule',
        },
        {
          allowLargeReservations: true,
        },
      ),
    ).resolves.toEqual({
      status: 'SUCCESS',
      message: 'updated',
      error: false,
    });

    expect(addMock).toHaveBeenCalledWith('update-reservation', {
      reservation: {
        currentName: 'guido',
        phone: '5491112345678',
        currentDate: 'domingo 29 de marzo 2026 29/03/2026',
        currentTime: '21:00',
        currentQuantity: '2',
        newDate: 'lunes 30 de marzo 2026 30/03/2026',
        newTime: null,
        newName: null,
        newQuantity: null,
        stage: 'reschedule',
      },
      options: {
        allowLargeReservations: true,
      },
    });
  });
});
