import { Injectable } from '@nestjs/common';
import { IntentionStrategyInterface, StrategyResult } from './intention-strategy.interface';
import {
  Intention,
  MultipleMessagesResponse,
  RoleEnum,
  SimplifiedTwilioWebhookPayload,
  StatusEnum,
  TemporalStatusEnum,
} from 'src/lib';
import { DatesService } from 'src/modules/dates/service/dates.service';
import { AddMissingFieldInput } from 'src/lib';
import { AiService } from 'src/modules/ai/service/ai.service';
import { Logger } from '@nestjs/common';
import { CacheService } from 'src/modules/cache-context/cache.service';
@Injectable()
export class CreateReservationStrategy implements IntentionStrategyInterface {
  readonly intent = Intention.CREATE;
  private readonly logger = new Logger(CreateReservationStrategy.name);
  constructor(
    private readonly datesService: DatesService,
    private readonly aiService: AiService,
    private readonly cacheService: CacheService,
  ) {}

  async execute(
    aiResponse: MultipleMessagesResponse,
    simplifiedPayload: SimplifiedTwilioWebhookPayload,
  ): Promise<StrategyResult> {
    const resolvedPhone =
      aiResponse.phone ?? (aiResponse.useCurrentPhone ? simplifiedPayload.waId : undefined);

    const data: AddMissingFieldInput = {
      waId: simplifiedPayload.waId,
      values: {
        phone: resolvedPhone,
        date: aiResponse.date,
        time: aiResponse.time,
        name: aiResponse.name,
        quantity: aiResponse.quantity,
      },
    };
    const response = await this.datesService.createReservationWithMultipleMessages(data);

    const history = await this.cacheService.getHistory(data.waId);

    switch (response.status) {
      case TemporalStatusEnum.IN_PROGRESS: {
        this.logger.log(`Create reservation strategy in progress`);
        const inProgressReply = await this.aiService.getMissingData(
          response.missingFields,
          history,
          response.message,
        );
        await this.cacheService.appendEntityMessage(
          data.waId,
          inProgressReply,
          RoleEnum.ASSISTANT,
          Intention.CREATE,
        );
        return { reply: inProgressReply };
      }

      case TemporalStatusEnum.COMPLETED: {
        this.logger.log(`Create reservation strategy completed`);
        const completedReply = await this.aiService.reservationCompleted(
          response.reservationData,
          history,
        );
        await this.cacheService.appendEntityMessage(
          data.waId,
          completedReply,
          RoleEnum.ASSISTANT,
          Intention.CREATE,
        );
        await this.cacheService.markFlowCompleted(data.waId);
        return { reply: completedReply };
      }

      case TemporalStatusEnum.FAILED: {
        this.logger.log(`Create reservation strategy failed`);

        if (
          response.errorStatus &&
          [StatusEnum.NO_AVAILABILITY, StatusEnum.NO_DATE_FOUND].includes(response.errorStatus) &&
          response.reservationData.date &&
          response.reservationData.time
        ) {
          const suggestedAvailability = await this.datesService.getDayAndTimeAvailability(
            response.reservationData.date,
            response.reservationData.time,
          );

          const unavailableWithAlternativesReply =
            await this.aiService.dayAndTimeAvailabilityAiResponse(
              suggestedAvailability,
              history,
              response.reservationData.time,
            );

          await this.cacheService.appendEntityMessage(
            data.waId,
            unavailableWithAlternativesReply,
            RoleEnum.ASSISTANT,
            Intention.CREATE,
          );
          return { reply: unavailableWithAlternativesReply };
        }

        const failedReply = await this.aiService.createReservationFailed(
          response.reservationData,
          history,
          response.message!,
        );
        await this.cacheService.appendEntityMessage(
          data.waId,
          failedReply,
          RoleEnum.ASSISTANT,
          Intention.CREATE,
        );
        return { reply: failedReply };
      }

      default:
        this.logger.warn(`Estado de reserva inesperado: ${response.status}`);
        return {
          reply: 'Hubo un problema al procesar la reserva, por favor intentá nuevamente.',
        };
    }
  }
}
