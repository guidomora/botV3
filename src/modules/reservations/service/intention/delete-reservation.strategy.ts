import { Injectable, Logger } from "@nestjs/common";
import { CacheTypeEnum, Intention, MultipleMessagesResponse, RoleEnum } from "src/lib";
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
        const state = await this.cacheService.updateCancelState(waId, {
            phone: aiResponse.phone ?? null,
            date: aiResponse.date ?? null,
            time: aiResponse.time ?? null,
            name: aiResponse.name ?? null,
        });
        const missingFields = getMissingFields(state);

        if (missingFields.length > 0) {
            const history = await this.cacheService.getHistory(waId);
            console.log('history cancel', state);
            const response = await this.aiService.getMissingDataToCancel(missingFields, history, state);
            await this.cacheService.appendEntityMessage(waId, response, RoleEnum.ASSISTANT, Intention.CANCEL);
            return { reply: response };
        }

        const response = await this.datesService.deleteReservation(state);

        const history = await this.cacheService.getHistory(waId);

        const cancelResponse = await this.aiService.cancelReservationResult(response, history, state);
        
        await this.cacheService.clearHistory(waId, CacheTypeEnum.CANCEL);

        await this.cacheService.clearHistory(waId, CacheTypeEnum.DATA);
        
        this.logger.log(`Delete reservation strategy executed`);
        
        return { reply: cancelResponse };
    }
}