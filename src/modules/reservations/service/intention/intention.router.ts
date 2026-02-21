import { Inject, Injectable, Logger } from '@nestjs/common';
import { IntentionStrategyInterface, StrategyResult } from './intention-strategy.interface';
import { Intention, MultipleMessagesResponse, SimplifiedTwilioWebhookPayload } from 'src/lib';

export const INTENTION_STRATEGIES = Symbol('INTENTION_STRATEGIES');

@Injectable()
export class IntentionsRouter {
  private readonly registry = new Map<Intention, IntentionStrategyInterface>();
  private readonly logger = new Logger(IntentionsRouter.name);

  constructor(@Inject(INTENTION_STRATEGIES) handlers: IntentionStrategyInterface[]) {
    for (const handler of handlers) this.registry.set(handler.intent, handler);
  }

  async route(
    input: MultipleMessagesResponse,
    simplifiedPayload: SimplifiedTwilioWebhookPayload,
  ): Promise<StrategyResult> {
    const key = input.intent ?? Intention.OTHER;

    const handler = this.registry.get(key) ?? this.registry.get(Intention.OTHER);

    if (!handler) {
      return {
        reply: 'No entendí tu pedido. ¿Te gustaría reservar, consultar disponibilidad o cancelar?',
      };
    }

    this.logger.log(`Intention router executed for intent: ${key}`);

    return handler.execute(input, simplifiedPayload);
  }
}
