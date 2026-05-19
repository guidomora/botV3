import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  DEFAULT_ACCOUNT_ID,
  WHATSAPP_QUOTA_BLOCKED_REPLY,
} from 'src/modules/billing-usage/constants/billing-usage.constants';
import { UsageLimitService } from 'src/modules/billing-usage/service/usage-limit.service';
import { TwilioWebhookPayloadDto } from 'src/lib';
import { TwilioPort } from '../ports';
import { TWILIO_PORT } from '../whatsapp.tokens';

@Injectable()
export class WhatsAppUsageLimitGuard implements CanActivate {
  private readonly logger = new Logger(WhatsAppUsageLimitGuard.name);

  constructor(
    private readonly usageLimitService: UsageLimitService,
    @Inject(TWILIO_PORT)
    private readonly twilioPort: TwilioPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ body?: TwilioWebhookPayloadDto }>();
    const waId = request.body?.WaId;

    if (!waId) {
      return true;
    }

    try {
      const quotaDecision =
        await this.usageLimitService.canCreateWhatsappReservation(DEFAULT_ACCOUNT_ID);

      if (quotaDecision.allowed) {
        return true;
      }
    } catch (error) {
      this.logger.error(
        `No se pudo validar el cupo de WhatsApp para ${waId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    await this.notifyQuotaBlocked(waId);
    throw new HttpException({ ok: true }, HttpStatus.OK);
  }

  private async notifyQuotaBlocked(waId: string): Promise<void> {
    try {
      await this.twilioPort.sendText(waId, WHATSAPP_QUOTA_BLOCKED_REPLY);
    } catch (error) {
      this.logger.error(
        `No se pudo enviar notificacion de cupo agotado para ${waId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
