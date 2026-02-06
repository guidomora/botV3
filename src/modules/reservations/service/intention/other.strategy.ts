import { Injectable, Logger } from "@nestjs/common";
import { Intention, MultipleMessagesResponse, RoleEnum, SimplifiedTwilioWebhookPayload } from "src/lib";
import { AiService } from "src/modules/ai/service/ai.service";
import { CacheService } from "src/modules/cache-context/cache.service";
import { IntentionStrategyInterface, StrategyResult } from "./intention-strategy.interface";

@Injectable()
export class OtherStrategy implements IntentionStrategyInterface {
    readonly intent = Intention.OTHER;
    private readonly logger = new Logger(OtherStrategy.name);
    constructor(
        private readonly aiService: AiService,
        private readonly cacheService: CacheService
    ) { }

    async execute(aiResponse: MultipleMessagesResponse, simplifiedPayload: SimplifiedTwilioWebhookPayload): Promise<StrategyResult> {

        const waId = simplifiedPayload.waId;

        const history = await this.cacheService.getHistory(waId);
        
        const aiOtherResponse = await this.aiService.otherIntentionAi(history);

        await this.cacheService.appendEntityMessage(waId, aiOtherResponse, RoleEnum.ASSISTANT, Intention.OTHER);

        this.logger.log(`Other strategy executed`);
        
        return { reply: aiOtherResponse };
    }
}