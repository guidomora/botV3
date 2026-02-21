import { Injectable } from "@nestjs/common";
import { IntentionStrategyInterface, StrategyResult } from "./intention-strategy.interface";
import { Intention, MultipleMessagesResponse, RoleEnum, SimplifiedTwilioWebhookPayload, StatusEnum, UpdateReservationType } from "src/lib";
import { DatesService } from "src/modules/dates/service/dates.service";
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

        const hasCurrentReservationData = Boolean(
            (updateState.currentDate ?? (updateState.stage === 'identify' ? aiResponse.date : null))
            && (updateState.currentTime ?? (updateState.stage === 'identify' ? aiResponse.time : null))
            && (updateState.currentName ?? (updateState.stage === 'identify' ? aiResponse.name : null))
            && (updateState.phone ?? aiResponse.phone)
        );

        if (aiResponse.name) {
            if (
                updateState.stage === 'reschedule'
                || (updateState.currentName && updateState.phone && updateState.currentDate && updateState.currentTime)
            ) {
                updateData.newName = aiResponse.name;
            } else if (!updateState.currentName) {
                updateData.currentName = aiResponse.name;
            }
        }

        if (aiResponse.phone) updateData.phone = aiResponse.phone;

        if (updateState.stage === 'identify') {
            if (!updateState.currentDate && aiResponse.date) updateData.currentDate = aiResponse.date;
            if (!updateState.currentTime && aiResponse.time) updateData.currentTime = aiResponse.time;

            if (updateState.currentDate && updateState.currentTime) {
                if (aiResponse.date) updateData.newDate = aiResponse.date;
                if (aiResponse.time) updateData.newTime = aiResponse.time;
            }

        }

        if (updateState.stage === 'reschedule') {
            if (aiResponse.date) updateData.newDate = aiResponse.date;
            if (aiResponse.time) updateData.newTime = aiResponse.time;
            if (aiResponse.name) updateData.newName = aiResponse.name;
        }

        if (aiResponse.quantity && (updateState.stage === 'reschedule' || hasCurrentReservationData)) {
            updateData.newQuantity = aiResponse.quantity;
        }

        return updateData;
    }

    async execute(aiResponse: MultipleMessagesResponse, simplifiedPayload: SimplifiedTwilioWebhookPayload): Promise<StrategyResult> {
        this.logger.log('Executing update reservation strategy', UpdateReservationStrategy.name);
        const waId = simplifiedPayload.waId;
        const currentState = await this.cacheService.getUpdateState(waId);

        const mappedState = this.mapAiResponseToUpdateReservation(aiResponse, currentState);
        let nextState = await this.cacheService.updateUpdateState(waId, mappedState);

        if (
            nextState.stage === 'identify'
            && nextState.currentName && nextState.phone && nextState.currentDate && nextState.currentTime
        ) {
            nextState = await this.cacheService.updateUpdateState(waId, { stage: 'reschedule' });
        }

        const { current, target } = getMissingUpdateFields(nextState);
        const history = await this.cacheService.getHistory(waId);
        console.log('mappedState', mappedState);
        console.log('current', current);
        console.log('target', target);


        if (current.length > 0) {
            const shouldAskOnlyPhone = current.length === 1 && current[0] === 'phone';
            const response = shouldAskOnlyPhone
                ? await this.aiService.askUpdateReservationPhone(history, nextState)
                : await this.aiService.askUpdateReservationData(current, history, nextState);
            await this.cacheService.appendEntityMessage(waId, response, RoleEnum.ASSISTANT, Intention.UPDATE);
            console.log('response', response);
            return { reply: response };
        }

        if (
            nextState.currentName
            && nextState.phone
            && nextState.currentDate
            && nextState.currentTime
        ) {
            const currentReservationIndex = await this.datesService.getReservationIndexByData(
                nextState.currentDate,
                nextState.currentTime,
                nextState.currentName,
                nextState.phone,
            );

            if (currentReservationIndex === -1) {
                const message = 'No se encontró la reserva con los datos proporcionados.';
                await this.cacheService.appendEntityMessage(waId, message, RoleEnum.ASSISTANT, Intention.UPDATE);
                return { reply: message };
            }
        }

        if (target.length > 0) {
            const response = await this.aiService.askUpdateReservationData(target, history, nextState);
            await this.cacheService.appendEntityMessage(waId, response, RoleEnum.ASSISTANT, Intention.UPDATE);
            return { reply: response };
        }

        try {
            const reply = await this.datesService.updateReservation(nextState);
            await this.cacheService.appendEntityMessage(waId, reply.message, RoleEnum.ASSISTANT, Intention.UPDATE);

            if (reply.error) {
                if (
                    [StatusEnum.NO_AVAILABILITY, StatusEnum.NO_DATE_FOUND].includes(reply.status)
                    && nextState.newDate
                    && nextState.newTime
                ) {
                    const suggestedAvailability = await this.datesService.getDayAndTimeAvailability(
                        nextState.newDate,
                        nextState.newTime,
                    );

                    const unavailableWithAlternativesReply = await this.aiService.dayAndTimeAvailabilityAiResponse(
                        suggestedAvailability,
                        history,
                        nextState.newTime,
                    );

                    await this.cacheService.appendEntityMessage(waId, unavailableWithAlternativesReply, RoleEnum.ASSISTANT, Intention.UPDATE);
                    return { reply: unavailableWithAlternativesReply };
                }

                console.log('strategyReply', reply.message)
                return { reply: reply.message };
            }
            await this.cacheService.clearUpdateState(waId);
            await this.cacheService.markFlowCompleted(waId);

            // TODO: work on something when user enters bad data
            console.log('strategyReply', reply.message)
            return { reply: reply.message };
        } catch (error) {
            this.logger.error('Error al actualizar la reserva', error as Error);
            return { reply: 'No pudimos actualizar la reserva en este momento. Por favor intentá de nuevo más tarde.' };
        }
    }
}
