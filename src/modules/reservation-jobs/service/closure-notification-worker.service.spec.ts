import { Worker } from 'bullmq';
import { ClosureNotificationOperationService } from './closure-notification-operation.service';
import { ClosureNotificationProcessorService } from './closure-notification-processor.service';
import { ClosureNotificationWorkerService } from './closure-notification-worker.service';

jest.mock('bullmq', () => ({
  Worker: jest.fn(),
}));

describe('ClosureNotificationWorkerService', () => {
  const workerConstructorMock = Worker as unknown as jest.Mock;

  const processorServiceMock = {
    notifyReservation: jest.fn(),
  } as unknown as jest.Mocked<ClosureNotificationProcessorService>;

  const operationServiceMock = {
    markNotificationSent: jest.fn(),
    markNotificationFailed: jest.fn(),
  } as unknown as jest.Mocked<ClosureNotificationOperationService>;

  const reservationJobsRedisServiceMock = {
    isEnabled: jest.fn(),
    createBullMqConnection: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    reservationJobsRedisServiceMock.isEnabled.mockReturnValue(true);
    reservationJobsRedisServiceMock.createBullMqConnection.mockReturnValue({});
  });

  it('should mark notification as failed when the last retry is exhausted', async () => {
    let processor:
      | ((job: {
          name: string;
          data: unknown;
          attemptsMade: number;
          opts: { attempts: number };
        }) => Promise<void>)
      | undefined;
    const onMock = jest.fn();
    const waitUntilReadyMock = jest.fn().mockResolvedValue(undefined);

    workerConstructorMock.mockImplementation((_queueName: string, handler: typeof processor) => {
      processor = handler;

      return {
        on: onMock,
        waitUntilReady: waitUntilReadyMock,
        close: jest.fn(),
      };
    });

    processorServiceMock.notifyReservation.mockRejectedValue(new Error('twilio failed'));
    operationServiceMock.markNotificationFailed.mockResolvedValue(null);

    const service = new ClosureNotificationWorkerService(
      processorServiceMock,
      operationServiceMock,
      reservationJobsRedisServiceMock as never,
    );

    await service.onModuleInit();

    await expect(
      processor?.({
        name: 'notify-closure-reservation',
        data: {
          operationId: 'op-123',
          closureType: 'day',
          date: '2026-04-16',
          sheetDate: 'jueves 16 de abril 2026 16/04/2026',
          reason: 'Cerrado por mantenimiento',
          reservation: {
            date: 'jueves 16 de abril 2026 16/04/2026',
            time: '21:00',
            name: 'Juan Perez',
            phone: '5491122334455',
            service: 'Cena',
            quantity: 4,
          },
        },
        attemptsMade: 2,
        opts: { attempts: 3 },
      }),
    ).rejects.toThrow('twilio failed');

    expect(operationServiceMock.markNotificationFailed.mock.calls[0]).toEqual([
      'op-123',
      {
        name: 'Juan Perez',
        phone: '5491122334455',
        date: 'jueves 16 de abril 2026 16/04/2026',
        time: '21:00',
      },
    ]);
  });
});
