import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { OpenAiConfig } from '../config/openai.config';

describe('AiService', () => {
  let service: AiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiService, {
        provide: OpenAiConfig,
        useValue: {
          getClient: jest.fn(),
        },
      }],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
