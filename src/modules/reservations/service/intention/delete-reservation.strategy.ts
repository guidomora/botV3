import { Injectable, Logger } from "@nestjs/common";
import { DeleteReservation, Intention, MultipleMessagesResponse } from "src/lib";
import { AiService } from "src/modules/ai/service/ai.service";
import { DatesService } from "src/modules/dates/service/dates.service";
import { CacheService } from "src/modules/cache-context/cache.service";
import { IntentionStrategyInterface, StrategyResult } from "./intention-strategy.interface";
import { getMissingFields } from "../helpers/get-missing-fields.helper";

@Injectable()
export class DeleteReservationStrategy implements IntentionStrategyInterface {
    readonly intent = Intention.CANCEL;
    private readonly logger = new Logger(DeleteReservationStrategy.name);
    constructor(
        private readonly datesService: DatesService,
        private readonly aiService: AiService,
        private readonly cacheService: CacheService
    ) { }

    async execute(aiResponse: MultipleMessagesResponse): Promise<StrategyResult> {
        const waId = '123456789'
        const deleteReservation: DeleteReservation = {
            phone: '1122334455', // TODO: remove mock once we get the phone number from the user
            date: aiResponse.date ?? null,
            time: aiResponse.time ?? null,
            name: aiResponse.name ?? null,
        };
        const missingFields = getMissingFields(deleteReservation);

        const conversationHistory = await this.cacheService.getHistory(waId);

        if (missingFields.length > 0) {
            console.log('[MISSING FIELDS]', missingFields);
            const response = await this.aiService.getMissingDataToCancel(missingFields, conversationHistory, deleteReservation);
            await this.cacheService.appendAssistantMessage(waId, response, Intention.CANCEL);
            return { reply: response };
        }

        const response = await this.datesService.deleteReservation(deleteReservation);
        return { reply: response };
    }
}