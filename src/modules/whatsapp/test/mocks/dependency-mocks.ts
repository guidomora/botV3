import { Cache } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { RateLimitDecision, SimplifiedTwilioWebhookPayload } from 'src/lib';
import { ReservationsService } from 'src/modules/reservations/service/reservations.service';
import { UsageLimitService } from 'src/modules/billing-usage/service/usage-limit.service';
import { TwilioPort } from '../../ports';
import { IdempotencyService } from '../../service/idempotency.service';
import { RateLimitService } from '../../service/rate-limit.service';
import { WhatsAppService } from '../../service/whatsapp.service';

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

export const createConfigServiceMock = (
  values: Record<string, string | undefined>,
): jest.Mocked<ConfigService> =>
  ({
    get: jest.fn((key: string) => values[key]),
  }) as unknown as jest.Mocked<ConfigService>;

export const createTwilioPortMock = () =>
  ({
    sendText: jest.fn(),
    verifySignature: jest.fn(),
  }) as unknown as jest.Mocked<TwilioPort>;

export const createReservationsServiceMock = () =>
  ({
    conversationOrchestrator: jest.fn(),
  }) as unknown as jest.Mocked<ReservationsService>;

export const createWhatsAppServiceMock = () =>
  ({
    handleInboundMessage: jest.fn(),
    getUnsupportedMessageReply: jest.fn(),
    handleMultipleMessages: jest.fn(),
    verifySignature: jest.fn(),
  }) as unknown as jest.Mocked<WhatsAppService>;

export const createIdempotencyServiceMock = () =>
  ({
    isDuplicateMessage: jest.fn<Promise<boolean>, [string, string]>(),
  }) as unknown as jest.Mocked<IdempotencyService>;

export const createRateLimitServiceMock = () =>
  ({
    evaluateInboundMessage: jest.fn<Promise<RateLimitDecision>, [string]>(),
  }) as unknown as jest.Mocked<RateLimitService>;

export const createUsageLimitServiceMock = () =>
  ({
    canCreateWhatsappReservation: jest.fn(),
  }) as unknown as jest.Mocked<UsageLimitService>;

export const simplifiedPayloadMock: SimplifiedTwilioWebhookPayload = {
  body: 'Hola',
  from: 'whatsapp:+5491112345678',
  waId: '5491112345678',
  profileName: 'Guido',
  messageSid: 'SM123',
  accountSid: 'AC123',
  messageType: 'text',
};
