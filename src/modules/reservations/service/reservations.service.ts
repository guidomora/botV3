import { Injectable, Logger } from '@nestjs/common';
import { PROVIDER_TEMPORARY_ERROR_MESSAGE } from 'src/constants';
import {
  AffectedReservationState,
  Intention,
  MultipleMessagesResponse,
  ProviderError,
  RoleEnum,
  SimplifiedTwilioWebhookPayload,
} from 'src/lib';
import { AiService } from 'src/modules/ai/service/ai.service';
import { CacheService } from 'src/modules/cache-context/cache.service';
import { hasExplicitReservationAction } from './helpers/has-explicit-reservation-action.helper';
import { hasExplicitUpdateAction } from './helpers/has-explicit-update-action.helper';
import { IntentionsRouter } from './intention/intention.router';
import { inferActiveIntent } from 'src/modules/ai/utils';

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);
  private readonly affectedReservationClarificationReply =
    '¿Querés que intentemos reprogramar tu reserva para otro día u horario, o preferís cancelarla?';

  constructor(
    private readonly aiService: AiService,
    private readonly router: IntentionsRouter,
    private readonly cacheService: CacheService,
  ) {}

  async conversationOrchestrator(
    message: string,
    simplifiedPayload: SimplifiedTwilioWebhookPayload,
  ): Promise<string> {
    await this.cacheService.appendEntityMessage(simplifiedPayload.waId, message, RoleEnum.USER);
    const affectedReservation = await this.cacheService.getAffectedReservationState(
      simplifiedPayload.waId,
    );

    try {
      const hasExplicitAction = hasExplicitReservationAction(message);

      if (!affectedReservation && !hasExplicitAction) {
        const isSocialCourtesy = await this.aiService.isSocialCourtesyMessage(message);

        if (isSocialCourtesy) {
          const forcedOtherResponse: MultipleMessagesResponse = {
            intent: Intention.OTHER,
          };

          const forcedOtherResult = await this.router.route(forcedOtherResponse, simplifiedPayload);

          return forcedOtherResult.reply;
        }
      }

      const history = await this.cacheService.getHistory(simplifiedPayload.waId);
      const activeIntent = inferActiveIntent(history);
      const shouldUseUpdateExtractor =
        !affectedReservation &&
        (activeIntent === Intention.UPDATE || hasExplicitUpdateAction(message));

      let aiResponse = shouldUseUpdateExtractor
        ? await this.aiService.interactUpdateWithAi(message, history)
        : await this.aiService.interactWithAi(message, history);

      if (affectedReservation) {
        const affectedReservationReply = await this.resolveAffectedReservationReply(
          aiResponse,
          simplifiedPayload,
          affectedReservation,
        );

        if (affectedReservationReply) {
          return affectedReservationReply;
        }

        if (aiResponse.intent === Intention.UPDATE) {
          aiResponse = await this.aiService.interactUpdateWithAi(message, history);
        }
      }

      const result = await this.router.route(aiResponse, simplifiedPayload);

      return result.reply;
    } catch (error) {
      if (error instanceof ProviderError) {
        this.logger.error(
          `Error temporal del proveedor ${error.provider} para ${simplifiedPayload.waId}`,
          this.getErrorDetail(error),
        );

        return PROVIDER_TEMPORARY_ERROR_MESSAGE;
      }

      throw error;
    }
  }

  private getErrorDetail(error: ProviderError): string {
    if (error.originalError instanceof Error) {
      return error.originalError.stack ?? error.originalError.message;
    }

    if (typeof error.originalError === 'string') {
      return error.originalError;
    }

    return error.message;
  }

  private async resolveAffectedReservationReply(
    aiResponse: MultipleMessagesResponse,
    simplifiedPayload: SimplifiedTwilioWebhookPayload,
    affectedReservation: AffectedReservationState,
  ): Promise<string | null> {
    if (aiResponse.intent === Intention.UPDATE) {
      await this.cacheService.updateUpdateState(simplifiedPayload.waId, {
        currentName: affectedReservation.name,
        phone: affectedReservation.phone,
        currentDate: affectedReservation.date,
        currentTime: affectedReservation.time,
        currentQuantity: String(affectedReservation.quantity),
        stage: 'reschedule',
      });

      return null;
    }

    if (aiResponse.intent === Intention.CANCEL) {
      await this.cacheService.updateCancelState(simplifiedPayload.waId, {
        name: affectedReservation.name,
        phone: affectedReservation.phone,
        date: affectedReservation.date,
        time: affectedReservation.time,
      });

      return null;
    }

    if (aiResponse.intent === Intention.OTHER) {
      await this.cacheService.appendEntityMessage(
        simplifiedPayload.waId,
        this.affectedReservationClarificationReply,
        RoleEnum.ASSISTANT,
      );

      return this.affectedReservationClarificationReply;
    }

    return null;
  }
}
