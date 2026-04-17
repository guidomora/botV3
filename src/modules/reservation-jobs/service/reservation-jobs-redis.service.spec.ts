import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';
import { ReservationJobsRedisService } from './reservation-jobs-redis.service';
import { createConfigServiceMock } from '../test/mocks/dependency-mocks';

jest.mock('redis', () => ({
  createClient: jest.fn(),
}));

describe('ReservationJobsRedisService', () => {
  let service: ReservationJobsRedisService;
  let configService: ReturnType<typeof createConfigServiceMock>;
  const createClientMock = createClient as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    configService = createConfigServiceMock();
    service = new ReservationJobsRedisService(configService as unknown as ConfigService);
  });

  it('debería devolver disabled cuando reservation-jobs no está habilitado', async () => {
    const result = await service.getReadinessStatus();

    expect(result).toBe('disabled');
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('debería usar REDIS_URL cuando está disponible y responder ok', async () => {
    const clientMock = {
      connect: jest.fn().mockResolvedValue(undefined),
      ping: jest.fn().mockResolvedValue('PONG'),
      quit: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn(),
      isOpen: true,
    };
    createClientMock.mockReturnValue(clientMock);
    configService = createConfigServiceMock({
      RESERVATION_JOBS_ENABLED: true,
      REDIS_URL: 'redis://localhost:6379',
    });
    service = new ReservationJobsRedisService(configService as unknown as ConfigService);

    const result = await service.getReadinessStatus();

    expect(result).toBe('ok');
    expect(createClientMock).toHaveBeenCalledWith({
      url: 'redis://localhost:6379',
    });
    expect(clientMock.connect).toHaveBeenCalled();
    expect(clientMock.ping).toHaveBeenCalled();
    expect(clientMock.quit).toHaveBeenCalled();
  });

  it('debería usar host y puerto de Railway cuando no hay REDIS_URL', async () => {
    const clientMock = {
      connect: jest.fn().mockResolvedValue(undefined),
      ping: jest.fn().mockResolvedValue('PONG'),
      quit: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn(),
      isOpen: true,
    };
    createClientMock.mockReturnValue(clientMock);
    configService = createConfigServiceMock({
      RESERVATION_JOBS_ENABLED: true,
      REDISHOST: 'redis.railway.internal',
      REDISPORT: 6379,
      REDISPASSWORD: 'secret',
    });
    service = new ReservationJobsRedisService(configService as unknown as ConfigService);

    const result = await service.getReadinessStatus();

    expect(result).toBe('ok');
    expect(createClientMock).toHaveBeenCalledWith({
      socket: {
        host: 'redis.railway.internal',
        port: 6379,
      },
      username: undefined,
      password: 'secret',
      database: 0,
    });
  });

  it('debería devolver error cuando Redis falla', async () => {
    const clientMock = {
      connect: jest.fn().mockRejectedValue(new Error('redis-down')),
      ping: jest.fn(),
      quit: jest.fn(),
      disconnect: jest.fn(),
      isOpen: false,
    };
    createClientMock.mockReturnValue(clientMock);
    configService = createConfigServiceMock({
      RESERVATION_JOBS_ENABLED: true,
      REDIS_URL: 'redis://localhost:6379',
    });
    service = new ReservationJobsRedisService(configService as unknown as ConfigService);

    const result = await service.getReadinessStatus();

    expect(result).toBe('error');
  });
});
