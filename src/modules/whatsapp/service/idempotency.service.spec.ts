import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { IdempotencyService } from './idempotency.service';
import { createCacheManagerMock } from '../test/mocks/dependency-mocks';

describe('IdempotencyService', () => {
  let service: IdempotencyService;
  let cacheManagerMock = createCacheManagerMock();
  const originalEnv = process.env;

  beforeEach(async () => {
    cacheManagerMock = createCacheManagerMock();
    process.env = { ...originalEnv, IDEMPOTENCY_MESSAGE_SID_TTL_MS: '120000' };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdempotencyService,
        {
          provide: CACHE_MANAGER,
          useValue: cacheManagerMock,
        },
      ],
    }).compile();

    service = module.get(IdempotencyService);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should persist unseen message sid using configured ttl', async () => {
    await expect(service.isDuplicateMessage('AC123', 'SM123')).resolves.toBe(false);

    expect(cacheManagerMock.get).toHaveBeenCalledWith('idempotency:message-sid:AC123:SM123');
    expect(cacheManagerMock.set).toHaveBeenCalledWith(
      'idempotency:message-sid:AC123:SM123',
      true,
      120000,
    );
  });

  it('should return true when message sid was already processed', async () => {
    cacheManagerMock.store.set('idempotency:message-sid:AC123:SM123', { value: true });

    await expect(service.isDuplicateMessage('AC123', 'SM123')).resolves.toBe(true);
    expect(cacheManagerMock.set).not.toHaveBeenCalled();
  });
});
