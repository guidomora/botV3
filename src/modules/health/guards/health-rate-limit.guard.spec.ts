import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ExecutionContext, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { HealthRateLimitGuard } from './health-rate-limit.guard';

describe('HealthRateLimitGuard', () => {
  let guard: HealthRateLimitGuard;
  let cacheStore = new Map<string, number[]>();

  beforeEach(async () => {
    cacheStore = new Map<string, number[]>();

    const moduleRef = await Test.createTestingModule({
      providers: [
        HealthRateLimitGuard,
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn((key: string) => Promise.resolve(cacheStore.get(key))),
            set: jest.fn((key: string, value: number[]) => {
              cacheStore.set(key, value);
              return Promise.resolve();
            }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'HEALTH_CHECK_RATE_LIMIT_MAX_REQUESTS' ? 2 : undefined,
            ),
          },
        },
      ],
    }).compile();

    guard = moduleRef.get(HealthRateLimitGuard);
  });

  const createContext = (ip = '127.0.0.1'): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          ip,
          headers: {},
          originalUrl: '/bot/health/live',
          socket: { remoteAddress: ip },
        }),
      }),
    }) as never;

  it('debería permitir requests dentro del límite', async () => {
    await expect(guard.canActivate(createContext())).resolves.toBe(true);
    await expect(guard.canActivate(createContext())).resolves.toBe(true);
  });

  it('debería rechazar requests cuando supera el límite', async () => {
    await guard.canActivate(createContext());
    await guard.canActivate(createContext());

    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(HttpException);
  });
});
