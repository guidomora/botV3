import { Injectable, Logger } from '@nestjs/common';
import { PROVIDER_TEMPORARY_ERROR_MESSAGE } from 'src/constants';
import {
  Intention,
  MultipleMessagesResponse,
  ProviderError,
  RoleEnum,
  SimplifiedTwilioWebhookPayload,
} from 'src/lib';
import { AiService } from 'src/modules/ai/service/ai.service';
import { CacheService } from 'src/modules/cache-context/cache.service';
import { hasExplicitReservationAction } from './helpers/has-explicit-reservation-action.helper';
import { IntentionsRouter } from './intention/intention.router';

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly router: IntentionsRouter,
    private readonly cacheService: CacheService,
  ) {}

  async conversationOrchestrator(
    message: string,
    simplifiedPayload: SimplifiedTwilioWebhookPayload,
  ): Promise<string> {
    console.log(`Mensaje recibido: ${message}`);

    await this.cacheService.appendEntityMessage(
      simplifiedPayload.waId,
      message,
      RoleEnum.USER,
    );

    try {
      const hasExplicitAction = hasExplicitReservationAction(message);

      if (!hasExplicitAction) {
        const isSocialCourtesy =
          await this.aiService.isSocialCourtesyMessage(message);

        if (isSocialCourtesy) {
          const forcedOtherResponse: MultipleMessagesResponse = {
            intent: Intention.OTHER,
          };

          const forcedOtherResult = await this.router.route(
            forcedOtherResponse,
            simplifiedPayload,
          );

          return forcedOtherResult.reply;
        }
      }

      const history = await this.cacheService.getHistory(
        simplifiedPayload.waId,
      );
      const aiResponse = await this.aiService.interactWithAi(message, history);
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
}
