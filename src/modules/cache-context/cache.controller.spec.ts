import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { DatesService } from 'src/modules/dates/service/dates.service';
import { ConversationExpirationNotifierService } from './conversation-expiration-notifier.service';
import { CacheController } from './cache.controller';
import { CacheService } from './cache.service';

describe('CacheController', () => {
  let controller: CacheController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CacheController],
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

    controller = module.get<CacheController>(CacheController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
