import { Cache } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { DatesService } from 'src/modules/dates/service/dates.service';
import { ConversationExpirationNotifierService } from '../../conversation-expiration-notifier.service';

type CacheEntry = {
  value: unknown;
  ttl?: number;
};

export const createCacheManagerMock = (): jest.Mocked<Cache> & {
  store: Map<string, CacheEntry>;
} => {
  const store = new Map<string, CacheEntry>();

  return {
    store,
    get: jest.fn((key: string) => Promise.resolve(store.get(key)?.value)),
    set: jest.fn((key: string, value: unknown, ttl?: number) => {
      store.set(key, { value, ttl });
      return Promise.resolve(undefined);
    }),
    del: jest.fn((key: string) => {
      store.delete(key);
      return Promise.resolve(undefined);
    }),
    reset: jest.fn(() => {
      store.clear();
      return Promise.resolve(undefined);
    }),
    onModuleDestroy: jest.fn(),
    removeListener: jest.fn(),
  } as unknown as jest.Mocked<Cache> & {
    store: Map<string, CacheEntry>;
  };
};

export const createDatesServiceMock = () =>
  ({
    deleteIncompleteTemporalReservationByWaId: jest.fn(),
  }) as unknown as jest.Mocked<DatesService>;

export const createConversationExpirationNotifierMock = () =>
  ({
    sendConversationExpiredMessage: jest.fn(),
  }) as unknown as jest.Mocked<ConversationExpirationNotifierService>;

export const createConfigServiceMock = (
  values: Record<string, string | undefined>,
): jest.Mocked<ConfigService> =>
  ({
    get: jest.fn((key: string) => values[key]),
  }) as unknown as jest.Mocked<ConfigService>;
