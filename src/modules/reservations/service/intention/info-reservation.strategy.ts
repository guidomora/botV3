import { Injectable, Logger } from "@nestjs/common";
import { DeleteReservation, Intention, MultipleMessagesResponse, RoleEnum } from "src/lib";
import { AiService } from "src/modules/ai/service/ai.service";
import { DatesService } from "src/modules/dates/service/dates.service";
import { CacheService } from "src/modules/cache-context/cache.service";
import { IntentionStrategyInterface, StrategyResult } from "./intention-strategy.interface";
import { getMissingFields } from "../helpers/get-missing-fields.helper";

@Injectable()
export class InfoReservationStrategy implements IntentionStrategyInterface {
    readonly intent = Intention.INFO;
    private readonly logger = new Logger(InfoReservationStrategy.name);
    constructor(
        private readonly datesService: DatesService,
        private readonly aiService: AiService,
        private readonly cacheService: CacheService
    ) { }

    async execute(aiResponse: MultipleMessagesResponse): Promise<StrategyResult> {
        const waId = '123456789'
        if (aiResponse.date && aiResponse.time) {
            // check exact datetime
        } else if (!aiResponse.date && !aiResponse.time) {
            // ask for date and time
        }
        // check date, return a range of times

        return { reply: 'response' };
    }
}