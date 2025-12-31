import { Injectable } from "@nestjs/common";
import { IntentionStrategyInterface, StrategyResult } from "./intention-strategy.interface";
import { CacheTypeEnum, Intention, MultipleMessagesResponse, TemporalStatusEnum, UpdateReservationType } from "src/lib";
import { DatesService } from "src/modules/dates/service/dates.service";
import { AddMissingFieldInput } from "src/lib";
import { AiService } from "src/modules/ai/service/ai.service";
import { Logger } from "@nestjs/common";
import { CacheService } from "src/modules/cache-context/cache.service";
@Injectable()
export class UpdateReservationStrategy implements IntentionStrategyInterface {
    readonly intent = Intention.UPDATE;
    private readonly logger = new Logger(UpdateReservationStrategy.name);
    constructor(
        private readonly datesService: DatesService,
        private readonly aiService: AiService,
        private readonly cacheService: CacheService
    ) { }

    // the state must come from the conversation context (cache)
    private mapAiResponseToUpdateReservation(aiResponse: MultipleMessagesResponse, updateState:UpdateReservationType): Partial<UpdateReservationType>{
        const updateData: Partial<UpdateReservationType> = {};

        if (updateState.stage === 'identify') {
            if (aiResponse.name) updateData.name = aiResponse.name;
            if (aiResponse.phone) updateData.phone = aiResponse.phone;
            if (aiResponse.date) updateData.currentDate = aiResponse.date;
            if (aiResponse.time) updateData.currentTime = aiResponse.time;
        } else {
            if (aiResponse.date) updateData.newDate = aiResponse.date;
            if (aiResponse.time) updateData.newTime = aiResponse.time;
        }

        return updateData;
    }

    async execute(aiResponse: MultipleMessagesResponse): Promise<StrategyResult> {

        const mockedData: AddMissingFieldInput = {
            waId: '123456789',
            values: { // TODO: remove this mock once we receive the phone number from the user
                phone: '1122334455',
                date: aiResponse.date,
                time: aiResponse.time,
                name: aiResponse.name,
                quantity: aiResponse.quantity,
            },
            messageSid: '123',
        }
        const response = await this.datesService.createReservationWithMultipleMessages(mockedData);

        const history = await this.cacheService.getHistory(mockedData.waId);

        return { reply: 'Hubo un problema al procesar la reserva, por favor intentá nuevamente.' }
    }
}