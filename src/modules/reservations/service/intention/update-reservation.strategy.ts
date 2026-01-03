import { Injectable } from "@nestjs/common";
import { IntentionStrategyInterface, StrategyResult } from "./intention-strategy.interface";
import { CacheTypeEnum, Intention, MultipleMessagesResponse, RoleEnum, TemporalStatusEnum, UpdateReservationType } from "src/lib";
import { DatesService } from "src/modules/dates/service/dates.service";
import { AddMissingFieldInput } from "src/lib";
import { AiService } from "src/modules/ai/service/ai.service";
import { Logger } from "@nestjs/common";
import { CacheService } from "src/modules/cache-context/cache.service";
import { getMissingUpdateFields } from "../helpers/get-missing-update-fields.helper";
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
    private mapAiResponseToUpdateReservation(aiResponse: MultipleMessagesResponse, updateState: UpdateReservationType): Partial<UpdateReservationType> {
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

        const waId = '123456789';
        const currentState = await this.cacheService.getUpdateState(waId);

        const mappedState = this.mapAiResponseToUpdateReservation(aiResponse, currentState);
        let nextState = await this.cacheService.updateUpdateState(waId, mappedState);

        if (
            nextState.stage === 'identify'
            && nextState.name && nextState.phone && nextState.currentDate && nextState.currentTime
        ) {
            nextState = await this.cacheService.updateUpdateState(waId, { stage: 'reschedule' });
        }

        const { current, target } = getMissingUpdateFields(nextState);
        const history = await this.cacheService.getHistory(waId);

        if (current.length > 0) {
            const response = await this.aiService.askUpdateReservationData(current, history, nextState);
            await this.cacheService.appendEntityMessage(waId, response, RoleEnum.ASSISTANT, Intention.UPDATE);
            return { reply: response };
        }

        if (target.length > 0) {
            const response = await this.aiService.askUpdateReservationData(target, history, nextState);
            await this.cacheService.appendEntityMessage(waId, response, RoleEnum.ASSISTANT, Intention.UPDATE);
            return { reply: response };
        }

        try {
            const reply = await this.datesService.updateReservation(nextState);
            await this.cacheService.clearUpdateState(waId);
            await this.cacheService.clearHistory(waId, CacheTypeEnum.DATA);
            return { reply };
        } catch (error) {
            this.logger.error('Error al actualizar la reserva', error as Error);
            return { reply: 'No pudimos actualizar la reserva en este momento. Por favor intentá de nuevo más tarde.' };
        }
    }
}