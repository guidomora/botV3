import { Injectable, Logger } from '@nestjs/common';
import { IntentionStrategyInterface, StrategyResult } from './intention-strategy.interface';
import {
  Intention,
  MultipleMessagesResponse,
  RoleEnum,
  SimplifiedTwilioWebhookPayload,
  StatusEnum,
  UpdateReservationType,
} from 'src/lib';
import { DatesService } from 'src/modules/dates/service/dates.service';
import { AiService } from 'src/modules/ai/service/ai.service';
import { CacheService } from 'src/modules/cache-context/cache.service';
import { getMissingUpdateFields } from '../helpers/get-missing-update-fields.helper';
import { UpdateReservationQueueService } from 'src/modules/reservation-jobs/service/update-reservation-queue.service';

@Injectable()
export class UpdateReservationStrategy implements IntentionStrategyInterface {
  readonly intent = Intention.UPDATE;
  private readonly logger = new Logger(UpdateReservationStrategy.name);

  constructor(
    private readonly datesService: DatesService,
    private readonly updateReservationQueueService: UpdateReservationQueueService,
    private readonly aiService: AiService,
    private readonly cacheService: CacheService,
  ) {}

  private mapAiResponseToUpdateReservation(
    aiResponse: MultipleMessagesResponse,
    updateState: UpdateReservationType,
    simplifiedPayload: SimplifiedTwilioWebhookPayload,
  ): Partial<UpdateReservationType> {
    const updateData: Partial<UpdateReservationType> = {};
    const resolvedCurrentPhone =
      aiResponse.currentPhone ??
      aiResponse.phone ??
      (aiResponse.useCurrentPhone ? simplifiedPayload.waId : undefined);

    if (aiResponse.currentName) {
      updateData.currentName = aiResponse.currentName;
    } else if (aiResponse.name && updateState.stage === 'identify' && !updateState.currentName) {
      updateData.currentName = aiResponse.name;
    }

    if (resolvedCurrentPhone) {
      updateData.phone = resolvedCurrentPhone;
    }

    if (aiResponse.currentDate) {
      updateData.currentDate = aiResponse.currentDate;
    } else if (updateState.stage === 'identify' && aiResponse.date && !updateState.currentDate) {
      updateData.currentDate = aiResponse.date;
    }

    if (aiResponse.currentTime) {
      updateData.currentTime = aiResponse.currentTime;
    } else if (updateState.stage === 'identify' && aiResponse.time && !updateState.currentTime) {
      updateData.currentTime = aiResponse.time;
    }

    if (aiResponse.newDate) {
      updateData.newDate = aiResponse.newDate;
    }

    if (aiResponse.newTime) {
      updateData.newTime = aiResponse.newTime;
    }

    if (aiResponse.newName) {
      updateData.newName = aiResponse.newName;
    } else if (updateState.stage === 'reschedule' && aiResponse.name) {
      updateData.newName = aiResponse.name;
    }

    if (aiResponse.newQuantity) {
      updateData.newQuantity = aiResponse.newQuantity;
    } else if (aiResponse.quantity && updateState.stage === 'reschedule') {
      updateData.newQuantity = aiResponse.quantity;
    }

    return updateData;
  }

  async execute(
    aiResponse: MultipleMessagesResponse,
    simplifiedPayload: SimplifiedTwilioWebhookPayload,
  ): Promise<StrategyResult> {
    this.logger.log('Executing update reservation strategy', UpdateReservationStrategy.name);
    const waId = simplifiedPayload.waId;
    const currentState = await this.cacheService.getUpdateState(waId);

    const mappedState = this.mapAiResponseToUpdateReservation(
      aiResponse,
      currentState,
      simplifiedPayload,
    );
    let nextState = await this.cacheService.updateUpdateState(waId, mappedState);

    if (
      nextState.stage === 'identify' &&
      nextState.currentName &&
      nextState.phone &&
      nextState.currentDate &&
      nextState.currentTime
    ) {
      nextState = await this.cacheService.updateUpdateState(waId, {
        stage: 'reschedule',
      });
    }

    const { current, target } = getMissingUpdateFields(nextState);
    const history = await this.cacheService.getHistory(waId);

    if (current.length > 0) {
      const shouldAskOnlyPhone = current.length === 1 && current[0] === 'phone';
      const response = shouldAskOnlyPhone
        ? await this.aiService.askUpdateReservationPhone(history, nextState)
        : await this.aiService.askUpdateReservationData(current, history, nextState);

      await this.cacheService.appendEntityMessage(
        waId,
        response,
        RoleEnum.ASSISTANT,
        Intention.UPDATE,
      );
      return { reply: response };
    }

    if (
      nextState.currentName &&
      nextState.phone &&
      nextState.currentDate &&
      nextState.currentTime
    ) {
      const currentReservationIndex = await this.datesService.getReservationIndexByData(
        nextState.currentDate,
        nextState.currentTime,
        nextState.currentName,
        nextState.phone,
      );

      if (currentReservationIndex === -1) {
        const message = 'No se encontró la reserva con los datos proporcionados.';
        await this.cacheService.appendEntityMessage(
          waId,
          message,
          RoleEnum.ASSISTANT,
          Intention.UPDATE,
        );
        return { reply: message };
      }
    }

    if (target.length > 0) {
      const response = await this.aiService.askUpdateReservationData(target, history, nextState);
      await this.cacheService.appendEntityMessage(
        waId,
        response,
        RoleEnum.ASSISTANT,
        Intention.UPDATE,
      );
      return { reply: response };
    }

    try {
      const reply = await this.updateReservationQueueService.updateReservation(nextState);
      await this.cacheService.appendEntityMessage(
        waId,
        reply.message,
        RoleEnum.ASSISTANT,
        Intention.UPDATE,
      );

      if (reply.error) {
        if (
          [StatusEnum.NO_AVAILABILITY, StatusEnum.NO_DATE_FOUND].includes(reply.status) &&
          nextState.newDate &&
          nextState.newTime
        ) {
          const suggestedAvailability = await this.datesService.getDayAndTimeAvailability(
            nextState.newDate,
            nextState.newTime,
          );

          const unavailableWithAlternativesReply =
            await this.aiService.dayAndTimeAvailabilityAiResponse(
              suggestedAvailability,
              history,
              nextState.newTime,
            );

          await this.cacheService.appendEntityMessage(
            waId,
            unavailableWithAlternativesReply,
            RoleEnum.ASSISTANT,
            Intention.UPDATE,
          );
          return { reply: unavailableWithAlternativesReply };
        }

        return { reply: reply.message };
      }

      await this.cacheService.clearUpdateState(waId);
      await this.cacheService.markFlowCompleted(waId);

      return { reply: reply.message };
    } catch (error) {
      this.logger.error('Error al actualizar la reserva', error as Error);
      return {
        reply:
          'No pudimos actualizar la reserva en este momento. Por favor intentá de nuevo más tarde.',
      };
    }
  }
}
