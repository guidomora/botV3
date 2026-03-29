import { Intention, RoleEnum } from 'src/lib';
import {
  createAiServiceMock,
  createCacheServiceMock,
  simplifiedPayloadMock,
} from '../../test/mocks/dependency-mocks';
import { OtherStrategy } from './other.strategy';

describe('OtherStrategy', () => {
  let strategy: OtherStrategy;
  let aiServiceMock = createAiServiceMock();
  let cacheServiceMock = createCacheServiceMock();

  beforeEach(() => {
    jest.clearAllMocks();
    aiServiceMock = createAiServiceMock();
    cacheServiceMock = createCacheServiceMock();
    strategy = new OtherStrategy(aiServiceMock, cacheServiceMock);
  });

  it('should generate other intention reply and close the flow', async () => {
    cacheServiceMock.getHistory.mockResolvedValue([{ role: RoleEnum.USER, content: 'hola' }]);
    aiServiceMock.otherIntentionAi.mockResolvedValue('Puedo ayudarte con reservas');

    await expect(
      strategy.execute({ intent: Intention.OTHER }, simplifiedPayloadMock),
    ).resolves.toEqual({
      reply: 'Puedo ayudarte con reservas',
    });

    expect(aiServiceMock.otherIntentionAi.mock.calls[0]).toEqual([
      [{ role: RoleEnum.USER, content: 'hola' }],
    ]);
    expect(cacheServiceMock.appendEntityMessage.mock.calls[0]).toEqual([
      simplifiedPayloadMock.waId,
      'Puedo ayudarte con reservas',
      RoleEnum.ASSISTANT,
      Intention.OTHER,
    ]);
    expect(cacheServiceMock.markFlowCompleted.mock.calls[0]).toEqual([simplifiedPayloadMock.waId]);
  });
});
