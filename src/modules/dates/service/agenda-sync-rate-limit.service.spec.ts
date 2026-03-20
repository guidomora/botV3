import { AgendaSyncRateLimitService } from './agenda-sync-rate-limit.service';

describe('AgendaSyncRateLimitService', () => {
  const cacheManagerMock = {
    get: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.AGENDA_SYNC_RATE_LIMIT_WINDOW_MS;
    delete process.env.AGENDA_SYNC_RATE_LIMIT_MAX_REQUESTS;
  });

  it('should allow requests below configured limit', async () => {
    process.env.AGENDA_SYNC_RATE_LIMIT_WINDOW_MS = '60000';
    process.env.AGENDA_SYNC_RATE_LIMIT_MAX_REQUESTS = '2';
    cacheManagerMock.get.mockResolvedValue([1000]);
    const service = new AgendaSyncRateLimitService(cacheManagerMock as never);

    await expect(service.isLimitExceeded('agenda-sync', 2000)).resolves.toBe(false);
    expect(cacheManagerMock.set).toHaveBeenCalledWith(
      'agenda-sync:rate-limit:agenda-sync',
      [1000, 2000],
      60000,
    );
  });

  it('should reject requests above configured limit', async () => {
    process.env.AGENDA_SYNC_RATE_LIMIT_WINDOW_MS = '60000';
    process.env.AGENDA_SYNC_RATE_LIMIT_MAX_REQUESTS = '2';
    cacheManagerMock.get.mockResolvedValue([1000, 2000]);
    const service = new AgendaSyncRateLimitService(cacheManagerMock as never);

    await expect(service.isLimitExceeded('agenda-sync', 3000)).resolves.toBe(true);
  });
});
