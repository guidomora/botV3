import { Injectable, Logger } from "@nestjs/common";
import { AddMissingFieldInput, DeleteReservation, Intention, MultipleMessagesResponse, RoleEnum } from "src/lib";
import { AiService } from "src/modules/ai/service/ai.service";
import { DatesService } from "src/modules/dates/service/dates.service";
import { CacheService } from "src/modules/cache-context/cache.service";
import { IntentionStrategyInterface, StrategyResult } from "./intention-strategy.interface";

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

        const mockedData: AddMissingFieldInput = {
            waId: '123456789',
            values: { // TODO: remove this mock once we receive the phone number from the user
                phone: '1122334455',
                date: aiResponse.date,
                time: aiResponse.time,
            },
            messageSid: '123',
        }

        const history = await this.cacheService.getHistory(mockedData.waId);


        if (aiResponse.date && aiResponse.time) {
            // check exact datetime
            // return if datetime is available or near datetime
        } else if (!aiResponse.date && !aiResponse.time) {
            // ask for date and time
        }
        // datetime not available

        return { reply: 'response' };
    }
}