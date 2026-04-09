import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { RATE_LIMIT_MESSAGE } from 'src/constants';
import { TwilioWebhookPayloadDto } from 'src/lib';
import { TwilioPort } from '../ports';
import { RateLimitService } from '../service/rate-limit.service';
import { TWILIO_PORT } from '../whatsapp.tokens';

@Injectable()
export class WhatsAppRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(WhatsAppRateLimitGuard.name);

  constructor(
    private readonly rateLimitService: RateLimitService,
    @Inject(TWILIO_PORT)
    private readonly twilioPort: TwilioPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ body?: TwilioWebhookPayloadDto }>();
    const waId = request.body?.WaId;

    if (!waId) {
      return true;
    }

    const rateLimitDecision = await this.rateLimitService.evaluateInboundMessage(waId);

    if (rateLimitDecision.allowed) {
      return true;
    }

    if (rateLimitDecision.shouldNotify) {
      try {
        await this.twilioPort.sendText(waId, RATE_LIMIT_MESSAGE);
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
