import { CacheService } from 'src/modules/cache-context/cache.service';
import { ClosureNotificationOperationService } from './closure-notification-operation.service';

describe('ClosureNotificationOperationService', () => {
  const cacheServiceMock = {
    getClosureNotificationOperationState: jest.fn(),
    setClosureNotificationOperationState: jest.fn(),
    getClosureNotificationMessageOperationId: jest.fn(),
    setClosureNotificationMessageOperationId: jest.fn(),
  } as unknown as jest.Mocked<CacheService>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should mark operation as completed with failed notifications after last failed recipient', async () => {
    cacheServiceMock.getClosureNotificationOperationState.mockResolvedValue({
      operationId: 'op-123',
      isCompleted: false,
      totalNotifications: 2,
      processedNotifications: 1,
      failedNotifications: [],
    });
    cacheServiceMock.setClosureNotificationOperationState.mockResolvedValue(undefined);

    const service = new ClosureNotificationOperationService(cacheServiceMock);

    await expect(
      service.markNotificationFailed('op-123', {
        name: 'Juan Perez',
        phone: '5491122334455',
        date: 'jueves 16 de abril 2026 16/04/2026',
        time: '21:00',
      }),
    ).resolves.toEqual({
      operationId: 'op-123',
      isCompleted: true,
      totalNotifications: 2,
      processedNotifications: 2,
      failedNotifications: [
        {
          name: 'Juan Perez',
          phone: '5491122334455',
          date: 'jueves 16 de abril 2026 16/04/2026',
          time: '21:00',
        },
      ],
    });
  });

  it('should register a Twilio message sid for a closure notification operation', async () => {
    cacheServiceMock.getClosureNotificationOperationState.mockResolvedValue({
      operationId: 'op-123',
      isCompleted: false,
      totalNotifications: 1,
      processedNotifications: 0,
      failedNotifications: [],
    });
    cacheServiceMock.setClosureNotificationOperationState.mockResolvedValue(undefined);
    cacheServiceMock.setClosureNotificationMessageOperationId.mockResolvedValue(undefined);

    const service = new ClosureNotificationOperationService(cacheServiceMock);

    await service.registerNotificationMessage('op-123', 'SM123', {
      name: 'Juan Perez',
      phone: '5491122334455',
      date: 'jueves 16 de abril 2026 16/04/2026',
      time: '21:00',
    });

    expect(cacheServiceMock.setClosureNotificationMessageOperationId.mock.calls[0]).toEqual([
      'SM123',
      'op-123',
    ]);
    expect(cacheServiceMock.setClosureNotificationOperationState.mock.calls[0]).toEqual([
      'op-123',
      {
        operationId: 'op-123',
        isCompleted: false,
        totalNotifications: 1,
        processedNotifications: 0,
        failedNotifications: [],
        trackedNotifications: [
          {
            messageSid: 'SM123',
            status: 'accepted',
            name: 'Juan Perez',
            phone: '5491122334455',
            date: 'jueves 16 de abril 2026 16/04/2026',
            time: '21:00',
          },
        ],
      },
    ]);
  });

  it('should log callback failure and add failed notification when Twilio reports undelivered', async () => {
    cacheServiceMock.getClosureNotificationMessageOperationId.mockResolvedValue('op-123');
    cacheServiceMock.getClosureNotificationOperationState.mockResolvedValue({
      operationId: 'op-123',
      isCompleted: true,
      totalNotifications: 1,
      processedNotifications: 1,
      failedNotifications: [],
      trackedNotifications: [
        {
          messageSid: 'SM123',
          status: 'sent',
          name: 'Juan Perez',
          phone: '5491122334455',
          date: 'jueves 16 de abril 2026 16/04/2026',
          time: '21:00',
        },
      ],
    });
    cacheServiceMock.setClosureNotificationOperationState.mockResolvedValue(undefined);

    const service = new ClosureNotificationOperationService(cacheServiceMock);

    await expect(
      service.handleMessageStatusCallback({
        MessageSid: 'SM123',
        MessageStatus: 'undelivered',
        ErrorCode: '63016',
        ErrorMessage: 'Failed to send',
      }),
    ).resolves.toBeUndefined();

    expect(cacheServiceMock.setClosureNotificationOperationState.mock.calls[0]).toEqual([
      'op-123',
      {
        operationId: 'op-123',
        isCompleted: true,
        totalNotifications: 1,
        processedNotifications: 1,
        failedNotifications: [
          {
            name: 'Juan Perez',
            phone: '5491122334455',
            date: 'jueves 16 de abril 2026 16/04/2026',
            time: '21:00',
          },
        ],
        trackedNotifications: [
          {
            messageSid: 'SM123',
            status: 'undelivered',
            errorCode: '63016',
            errorMessage: 'Failed to send',
            name: 'Juan Perez',
            phone: '5491122334455',
            date: 'jueves 16 de abril 2026 16/04/2026',
            time: '21:00',
          },
        ],
      },
    ]);
  });
});
