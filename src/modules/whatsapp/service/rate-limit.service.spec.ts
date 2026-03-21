import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RateLimitService } from './rate-limit.service';
import { createCacheManagerMock, createConfigServiceMock } from '../test/mocks/dependency-mocks';

describe('RateLimitService', () => {
  let service: RateLimitService;
  let cacheManagerMock = createCacheManagerMock();
  let configServiceMock = createConfigServiceMock({});
  const originalEnv = process.env;

  beforeEach(async () => {
    cacheManagerMock = createCacheManagerMock();
    configServiceMock = createConfigServiceMock({});
    process.env = {
      ...originalEnv,
      RATE_LIMIT_SHORT_WINDOW_MS: '30000',
      RATE_LIMIT_SHORT_WINDOW_LIMIT: '2',
      RATE_LIMIT_LONG_WINDOW_MS: '600000',
      RATE_LIMIT_LONG_WINDOW_LIMIT: '4',
      RATE_LIMIT_BLOCK_WINDOW_MS: '180000',
      RATE_LIMIT_NOTIFY_COOLDOWN_MS: '60000',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitService,
        {
          provide: CACHE_MANAGER,
          useValue: cacheManagerMock,
        },
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    service = module.get(RateLimitService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should allow message and append timestamp to history when limits are not exceeded', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1000);

    await expect(service.evaluateInboundMessage('5491112345678')).resolves.toEqual({
      allowed: true,
      retryAfterSeconds: 0,
      shouldNotify: false,
    });

    expect(cacheManagerMock.set).toHaveBeenCalledWith(
      'rate-limit:history:5491112345678',
      [1000],
      600000,
    );
  });

  it('should block message when short window limit is exceeded and mark notification', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(50000);
    cacheManagerMock.store.set('rate-limit:history:5491112345678', {
      value: [30000, 40000],
    });

    await expect(service.evaluateInboundMessage('5491112345678')).resolves.toEqual({
      allowed: false,
      retryAfterSeconds: 180,
      shouldNotify: true,
    });

    expect(cacheManagerMock.set).toHaveBeenCalledWith(
      'rate-limit:blocked:5491112345678',
      { blockedUntil: 230000 },
      180000,
    );
    expect(cacheManagerMock.set).toHaveBeenCalledWith(
      'rate-limit:notify:5491112345678',
      50000,
      60000,
    );
  });

  it('should return blocked decision without notification when cooldown is still active', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(120000);
    cacheManagerMock.store.set('rate-limit:blocked:5491112345678', {
      value: { blockedUntil: 180000 },
    });
    cacheManagerMock.store.set('rate-limit:notify:5491112345678', {
      value: 90000,
    });

    await expect(service.evaluateInboundMessage('5491112345678')).resolves.toEqual({
      allowed: false,
      retryAfterSeconds: 60,
      shouldNotify: false,
    });

    expect(cacheManagerMock.set).not.toHaveBeenCalledWith(
      'rate-limit:notify:5491112345678',
      expect.anything(),
      expect.anything(),
    );
  });
});
