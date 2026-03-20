import { AgendaSyncReplayService } from './agenda-sync-replay.service';

describe('AgendaSyncReplayService', () => {
  const cacheManagerMock = {
    get: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should mark request as replay when signature already exists', async () => {
    cacheManagerMock.get.mockResolvedValue(true);
    const service = new AgendaSyncReplayService(cacheManagerMock as never);

    await expect(service.isReplayRequest('signed-request', 300000)).resolves.toBe(true);
  });

  it('should persist signature when request is new', async () => {
    cacheManagerMock.get.mockResolvedValue(undefined);
    const service = new AgendaSyncReplayService(cacheManagerMock as never);

    await expect(service.isReplayRequest('signed-request', 300000)).resolves.toBe(false);
    expect(cacheManagerMock.set).toHaveBeenCalledWith(
      'agenda-sync:replay:signed-request',
      true,
      300000,
    );
  });
});
