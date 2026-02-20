import { Injectable, Logger } from '@nestjs/common';
import { PROVIDER_TEMPORARY_ERROR_MESSAGE } from 'src/constants';
import {
  FlowLifecycleStatus,
  ProviderError,
  RoleEnum,
  SimplifiedTwilioWebhookPayload,
} from 'src/lib';
import { AiService } from 'src/modules/ai/service/ai.service';
import { CacheService } from 'src/modules/cache-context/cache.service';
import { IntentionsRouter } from './intention/intention.router';

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);
  private readonly postCompletionAcknowledgementReply =
    '¡De nada! Si querés, también te puedo ayudar a crear, modificar o cancelar una reserva, o consultar disponibilidad.';

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

    const waId = simplifiedPayload.waId;
    const lifecycleStatus = await this.cacheService.getFlowLifecycleStatus(waId);
    const isPostCompletionAcknowledgement =
      lifecycleStatus === FlowLifecycleStatus.COMPLETED &&
      this.isAcknowledgementMessage(message);

    if (isPostCompletionAcknowledgement) {
      await this.cacheService.appendEntityMessage(waId, message, RoleEnum.USER);
      await this.cacheService.appendEntityMessage(
        waId,
        this.postCompletionAcknowledgementReply,
        RoleEnum.ASSISTANT,
      );
      await this.cacheService.markFlowCompleted(waId);

      this.logger.log(
        `Acknowledgement handled without routing for completed flow ${waId}`,
      );

      return this.postCompletionAcknowledgementReply;
    }

    await this.cacheService.appendEntityMessage(waId, message, RoleEnum.USER);

    try {
      const history = await this.cacheService.getHistory(waId);
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


  private isAcknowledgementMessage(message: string): boolean {
    const normalizedMessage = this.normalizeText(message);
    const compactMessage = normalizedMessage.replace(/\s+/g, ' ').trim();

    if (!compactMessage || compactMessage.length > 35) {
      return false;
    }

    const acknowledgementPatterns = [
      /^gracias(?:\s+totales)?$/,
      /^muchas\s+gracias$/,
      /^mil\s+gracias$/,
      /^genial$/,
      /^perfecto$/,
      /^buenisimo$/,
      /^ok(?:ay)?$/,
      /^dale$/,
      /^joya$/,
      /^entendido$/,
      /^listo$/,
    ];

    return acknowledgementPatterns.some((pattern) => pattern.test(compactMessage));
  }

  private normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ');
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
