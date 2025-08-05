import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from '../service/ai.service';
import { AiController } from './ai.controller';


describe('AiController', () => {
  let controller: AiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [AiService],
    }).compile();

    controller = module.get<AiController>(AiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
