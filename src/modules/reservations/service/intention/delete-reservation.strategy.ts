import { Injectable, Logger } from "@nestjs/common";
import { DeleteReservation, Intention, MultipleMessagesResponse } from "src/lib";
import { AiService } from "src/modules/ai/service/ai.service";
import { DatesService } from "src/modules/dates/service/dates.service";
import { IntentionStrategyInterface, StrategyResult } from "./intention-strategy.interface";

@Injectable()
export class DeleteReservationStrategy implements IntentionStrategyInterface {
    readonly intent = Intention.CANCEL;
    private readonly logger = new Logger(DeleteReservationStrategy.name);
    constructor(
        private readonly datesService: DatesService,
        private readonly aiService: AiService,
    ) { }

    async execute(aiResponse: MultipleMessagesResponse): Promise<StrategyResult> {
        const deleteReservation: DeleteReservation = {
            phone: '1122334455',// TODO: remove this mock once we receive the phone number from the user
            date: aiResponse.date!,
            time: aiResponse.time!,
            name: aiResponse.name!,
        }
        
        const response = await this.datesService.deleteReservation(deleteReservation);
        return { reply: response };
    }
}