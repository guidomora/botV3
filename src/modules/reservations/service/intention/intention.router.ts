// intentions.router.ts
import { Inject, Injectable } from '@nestjs/common';
import { IntentionStrategyInterface, StrategyResult } from './intention-strategy.interface';
import { Intention, MultipleMessagesResponse } from 'src/lib';

export const INTENTION_STRATEGIES = Symbol('INTENTION_STRATEGIES');

@Injectable()
export class IntentionsRouter {
    private readonly registry = new Map<Intention, IntentionStrategyInterface>();

    constructor(
        @Inject(INTENTION_STRATEGIES) handlers: IntentionStrategyInterface[],
    ) {
        for (const handler of handlers) this.registry.set(handler.intent, handler);
    }

    async route(input: MultipleMessagesResponse): Promise<StrategyResult> {
        const key = (input.intent ?? Intention.OTHER) as Intention;
        const handler = this.registry.get(key) ?? this.registry.get(Intention.OTHER);
        
        if (!handler) {
            return { reply: 'No entendí tu pedido. ¿Querés reservar, consultar disponibilidad o cancelar?' };
        }
        return handler.execute(input);
    }
}
