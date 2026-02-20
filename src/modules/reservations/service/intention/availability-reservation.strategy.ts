import { Injectable, Logger } from "@nestjs/common";
import {  Intention, MultipleMessagesResponse, RoleEnum, SimplifiedTwilioWebhookPayload } from "src/lib";
import { AiService } from "src/modules/ai/service/ai.service";
import { CacheService } from "src/modules/cache-context/cache.service";
import { IntentionStrategyInterface, StrategyResult } from "./intention-strategy.interface";
import { DatesService } from "src/modules/dates/service/dates.service";

@Injectable()
export class AvailabilityStrategy implements IntentionStrategyInterface {
    readonly intent = Intention.AVAILABILITY;
    private readonly logger = new Logger(AvailabilityStrategy.name);
    constructor(
        private readonly aiService: AiService,
        private readonly cacheService: CacheService,
        private readonly dateService: DatesService
    ) { }

    async execute(aiResponse: MultipleMessagesResponse, simplifiedPayload: SimplifiedTwilioWebhookPayload): Promise<StrategyResult> {
        const waId = simplifiedPayload.waId;

        const history = await this.cacheService.getHistory(waId);

        if (!aiResponse.date) {
            // ask for date
            const availabilityResponse = await this.aiService.askDateForAvailabilityAi(history)

            await this.cacheService.appendEntityMessage(waId, availabilityResponse, RoleEnum.ASSISTANT, Intention.AVAILABILITY)

            await this.cacheService.markFlowCompleted(waId);
            this.logger.log(`Availability strategy executed`);

            return { reply: availabilityResponse };

        } else if (aiResponse.date && !aiResponse.time) {
            const availability = await this.dateService.getDayAvailability(aiResponse.date!)

            const availabilityResponse = await this.aiService.dayAvailabilityAiResponse(availability, history)

            await this.cacheService.appendEntityMessage(waId, availabilityResponse, RoleEnum.ASSISTANT, Intention.AVAILABILITY)
            
            await this.cacheService.markFlowCompleted(waId);
            this.logger.log(`Availability strategy executed`);

            return { reply: availabilityResponse };

        } else if (aiResponse.date && aiResponse.time) {

            const availability = await this.dateService.getDayAndTimeAvailability(aiResponse.date!, aiResponse.time!)

            const availabilityResponse = await this.aiService.dayAndTimeAvailabilityAiResponse(availability, history, aiResponse.time)

            await this.cacheService.appendEntityMessage(waId, availabilityResponse, RoleEnum.ASSISTANT, Intention.AVAILABILITY)

            await this.cacheService.markFlowCompleted(waId);
            this.logger.log(`Availability strategy executed`);

            return { reply: availabilityResponse };
        }

        // datetime not available TODO:
        return { reply: 'No hay disponibilidad para esa fecha y horario' };
    }
}