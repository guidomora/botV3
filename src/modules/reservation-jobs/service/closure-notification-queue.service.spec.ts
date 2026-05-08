import { Queue } from 'bullmq';
import { CLOSURE_NOTIFICATION_QUEUE_NAME } from '../reservation-jobs.constants';
import { ClosureNotificationOperationService } from './closure-notification-operation.service';
import { ClosureNotificationProcessorService } from './closure-notification-processor.service';
import { ClosureNotificationQueueService } from './closure-notification-queue.service';

jest.mock('bullmq', () => ({
  Queue: jest.fn(),
  QueueEvents: jest.fn(),
}));

describe('ClosureNotificationQueueService', () => {
  const queueConstructorMock = Queue as unknown as jest.Mock;

  const processorServiceMock = {
    notifyReservation: jest.fn(),
  } as unknown as jest.Mocked<ClosureNotificationProcessorService>;
  const operationServiceMock = {
    createOperation: jest.fn(),
    markNotificationSent: jest.fn(),
    markNotificationFailed: jest.fn(),
  } as unknown as jest.Mocked<ClosureNotificationOperationService>;

  const reservationJobsRedisServiceMock = {
    isEnabled: jest.fn(),
    createBullMqConnection: jest.fn(),
  };

  const payload = {
    closureType: 'day' as const,
    date: '2026-04-16',
    sheetDate: 'jueves 16 de abril 2026 16/04/2026',
    reason: 'Cerrado por mantenimiento',
    reservations: [
      {
        date: 'jueves 16 de abril 2026 16/04/2026',
        time: '21:00',
        name: 'Juan Perez',
        phone: '54-9-1122334455',
        service: 'Cena',
        quantity: 4,
      },
      {
        date: 'jueves 16 de abril 2026 16/04/2026',
        time: '22:00',
        name: 'Ana Lopez',
        phone: '54-9-1166778899',
        service: 'Cena',
        quantity: 2,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    reservationJobsRedisServiceMock.createBullMqConnection.mockReturnValue({});
    operationServiceMock.createOperation.mockResolvedValue({
      operationId: 'op-123',
      isCompleted: false,
      totalNotifications: 2,
      processedNotifications: 0,
      failedNotifications: [],
    });
    operationServiceMock.markNotificationSent.mockResolvedValue(null);
    operationServiceMock.markNotificationFailed.mockResolvedValue(null);
  });

  it('should notify reservations directly when reservation-jobs is disabled', async () => {
    reservationJobsRedisServiceMock.isEnabled.mockReturnValue(false);
    processorServiceMock.notifyReservation.mockResolvedValue(undefined);
    const service = new ClosureNotificationQueueService(
      processorServiceMock,
      operationServiceMock,
      reservationJobsRedisServiceMock as never,
    );

    await expect(service.notifyClosure(payload)).resolves.toEqual({
      queuedCount: 2,
      closureOperationId: 'op-123',
    });

    expect(processorServiceMock.notifyReservation.mock.calls).toEqual([
      [
        {
          operationId: 'op-123',
          closureType: 'day',
          date: '2026-04-16',
          sheetDate: 'jueves 16 de abril 2026 16/04/2026',
          reason: 'Cerrado por mantenimiento',
          reservation: payload.reservations[0],
        },
      ],
      [
        {
          operationId: 'op-123',
          closureType: 'day',
          date: '2026-04-16',
          sheetDate: 'jueves 16 de abril 2026 16/04/2026',
          reason: 'Cerrado por mantenimiento',
          reservation: payload.reservations[1],
        },
      ],
    ]);
    expect(queueConstructorMock).not.toHaveBeenCalled();
  });

  it('should enqueue one job per affected reservation when Redis is enabled', async () => {
    const addBulkMock = jest.fn().mockResolvedValue([{ id: '1' }, { id: '2' }]);
    const waitUntilReadyMock = jest.fn().mockResolvedValue(undefined);
    const closeMock = jest.fn().mockResolvedValue(undefined);

    reservationJobsRedisServiceMock.isEnabled.mockReturnValue(true);
    queueConstructorMock.mockImplementation(() => ({
      addBulk: addBulkMock,
      waitUntilReady: waitUntilReadyMock,
      close: closeMock,
    }));

    const service = new ClosureNotificationQueueService(
      processorServiceMock,
      operationServiceMock,
      reservationJobsRedisServiceMock as never,
    );

    await service.onModuleInit();

    expect(queueConstructorMock).toHaveBeenCalledWith(
      CLOSURE_NOTIFICATION_QUEUE_NAME,
      expect.objectContaining({
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 100,
          removeOnFail: 100,
        },
      }),
    );

    await expect(service.notifyClosure(payload)).resolves.toEqual({
      queuedCount: 2,
      closureOperationId: 'op-123',
    });

    expect(addBulkMock).toHaveBeenCalledWith([
      {
        name: 'notify-closure-reservation',
        data: {
          operationId: 'op-123',
          closureType: 'day',
          date: '2026-04-16',
          sheetDate: 'jueves 16 de abril 2026 16/04/2026',
          reason: 'Cerrado por mantenimiento',
          reservation: payload.reservations[0],
        },
      },
      {
        name: 'notify-closure-reservation',
        data: {
          operationId: 'op-123',
          closureType: 'day',
          date: '2026-04-16',
          sheetDate: 'jueves 16 de abril 2026 16/04/2026',
          reason: 'Cerrado por mantenimiento',
          reservation: payload.reservations[1],
        },
      },
    ]);
  });
});
