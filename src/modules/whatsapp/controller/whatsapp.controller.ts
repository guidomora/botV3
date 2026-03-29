import { BadRequestException, Body, Controller, Post, UseGuards } from '@nestjs/common';
import { SimplifiedTwilioWebhookPayload, TwilioWebhookPayload } from 'src/lib';
import { UnsupportedMessage } from '../helpers/unsopported-message.helper';
import { TwilioSignatureGuard } from '../guards/twilio-signature.guard';
import { WhatsAppIdempotencyGuard } from '../guards/whatsapp-idempotency.guard';
import { WhatsAppRateLimitGuard } from '../guards/whatsapp-rate-limit.guard';
import { WhatsAppService } from '../service/whatsapp.service';

@Controller('communication')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Post('/queue')
  @UseGuards(TwilioSignatureGuard, WhatsAppIdempotencyGuard, WhatsAppRateLimitGuard)
  async handleMultipleMessages(@Body() payload: TwilioWebhookPayload) {
    const simplifiedPayload = this.buildSimplifiedPayload(payload);

    const isUnsupportedMessage = UnsupportedMessage(payload.NumMedia, payload.MessageType);

    if (isUnsupportedMessage) {
      await this.whatsappService.handleInboundMessage(
        simplifiedPayload,
        this.whatsappService.getUnsupportedMessageReply(),
      );

      return { ok: true };
    }

    const response = await this.whatsappService.handleMultipleMessages(
      simplifiedPayload,
      simplifiedPayload.body,
    );

    if (response) {
      await this.whatsappService.handleInboundMessage(simplifiedPayload, response);
    }

    return { ok: true };
  }

  private buildSimplifiedPayload(payload: TwilioWebhookPayload): SimplifiedTwilioWebhookPayload {
    const body = this.requireNonEmptyField(payload.Body, 'Body');
    const from = this.requireNonEmptyField(payload.From, 'From');
    const waId = this.requireNonEmptyField(payload.WaId, 'WaId');
    const messageSid = this.requireNonEmptyField(payload.MessageSid, 'MessageSid');
    const accountSid = this.requireNonEmptyField(payload.AccountSid, 'AccountSid');

    return {
      body,
      from,
      waId,
      profileName: payload.ProfileName?.trim() || '',
      messageSid,
      accountSid,
      messageType: payload.MessageType?.trim() || 'text',
    };
  }

  private requireNonEmptyField(value: string | undefined, fieldName: string): string {
    const normalizedValue = value?.trim();

    if (!normalizedValue) {
      throw new BadRequestException(`Campo requerido ausente o vacio: ${fieldName}`);
    }

    return normalizedValue;
  }
}
