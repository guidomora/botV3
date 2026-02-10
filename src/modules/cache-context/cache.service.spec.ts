import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { DatesService } from 'src/modules/dates/service/dates.service';
import { ConversationExpirationNotifierService } from './conversation-expiration-notifier.service';
import { CacheService } from './cache.service';

describe('CacheService', () => {
  let service: CacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
        {
          provide: DatesService,
          useValue: {
            deleteIncompleteTemporalReservationByWaId: jest.fn(),
          },
        },
        {
          provide: ConversationExpirationNotifierService,
          useValue: {
            sendConversationExpiredMessage: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
