import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { RATE_LIMIT_MESSAGE } from 'src/constants';
import { TwilioWebhookPayloadDto } from 'src/lib';
import { TwilioAdapter } from '../adapters/twilio.adapter';
import { RateLimitService } from '../service/rate-limit.service';

@Injectable()
export class WhatsAppRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(WhatsAppRateLimitGuard.name);

  constructor(
    private readonly rateLimitService: RateLimitService,
    private readonly twilioAdapter: TwilioAdapter,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ body?: TwilioWebhookPayloadDto }>();
    const waId = request.body?.WaId;

    if (!waId) {
      return true;
    }

    const rateLimitDecision =
      await this.rateLimitService.evaluateInboundMessage(waId);

    if (rateLimitDecision.allowed) {
      return true;
    }

    if (rateLimitDecision.shouldNotify) {
      const rateLimitMessage = `${RATE_LIMIT_MESSAGE} (Intentá nuevamente en ${rateLimitDecision.retryAfterSeconds}s).`;
      try {
        await this.twilioAdapter.sendText(waId, rateLimitMessage);
      } catch (error) {
        this.logger.error(
          `No se pudo enviar notificación de rate limit para ${waId}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    throw new HttpException({ ok: true }, HttpStatus.OK);
  }
}
