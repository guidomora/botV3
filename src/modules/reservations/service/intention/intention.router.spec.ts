import { Intention, type MultipleMessagesResponse } from 'src/lib';
import { simplifiedPayloadMock } from '../../test/mocks/dependency-mocks';
import { IntentionsRouter } from './intention.router';
import { type IntentionStrategyInterface } from './intention-strategy.interface';

describe('IntentionsRouter', () => {
  const buildHandler = (intent: Intention, reply: string): IntentionStrategyInterface => ({
    intent,
    execute: jest.fn().mockResolvedValue({ reply }),
  });

  it('should route to the matching handler', async () => {
    const createHandler = buildHandler(Intention.CREATE, 'creada');
    const otherHandler = buildHandler(Intention.OTHER, 'otra');
    const router = new IntentionsRouter([createHandler, otherHandler]);

    await expect(
      router.route({ intent: Intention.CREATE } as MultipleMessagesResponse, simplifiedPayloadMock),
    ).resolves.toEqual({
      reply: 'creada',
    });

    expect((createHandler.execute as jest.Mock).mock.calls[0]).toEqual([
      { intent: Intention.CREATE },
      simplifiedPayloadMock,
    ]);
  });

  it('should fallback to other handler when intent is missing', async () => {
    const otherHandler = buildHandler(Intention.OTHER, 'otra');
    const router = new IntentionsRouter([otherHandler]);

    await expect(
      router.route({} as MultipleMessagesResponse, simplifiedPayloadMock),
    ).resolves.toEqual({
      reply: 'otra',
    });
  });

  it('should return default reply when no handler is available', async () => {
    const router = new IntentionsRouter([]);

    await expect(
      router.route({ intent: Intention.CANCEL } as MultipleMessagesResponse, simplifiedPayloadMock),
    ).resolves.toEqual({
      reply: 'No entendí tu pedido. ¿Te gustaría reservar, consultar disponibilidad o cancelar?',
    });
  });
});
