import { CacheService } from 'src/modules/cache-context/cache.service';
import { ClosureNotificationOperationService } from './closure-notification-operation.service';

describe('ClosureNotificationOperationService', () => {
  const cacheServiceMock = {
    getClosureNotificationOperationState: jest.fn(),
    setClosureNotificationOperationState: jest.fn(),
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
});
