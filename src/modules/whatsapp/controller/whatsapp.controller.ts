import { Body, Controller, Headers, Post, UseGuards } from '@nestjs/common';
import {
  SimplifiedTwilioWebhookPayload,
  TwilioWebhookPayloadDto,
} from 'src/lib';
import { UnsupportedMessage } from '../helpers/unsopported-message.helper';
import { TwilioSignatureGuard } from '../guards/twilio-signature.guard';
import { WhatsAppIdempotencyGuard } from '../guards/whatsapp-idempotency.guard';
import { WhatsAppRateLimitGuard } from '../guards/whatsapp-rate-limit.guard';
import { WhatsAppService } from '../service/whatsapp.service';

@Controller('communication')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Post('/queue')
  @UseGuards(
    TwilioSignatureGuard,
    WhatsAppIdempotencyGuard,
    WhatsAppRateLimitGuard,
  )
  async handleMultipleMessages(
    @Body('Body') body: string,
    @Body() payload: TwilioWebhookPayloadDto,
    @Body('From') from: string,
    @Headers('x-twilio-signature') signature: string,
  ) {
    const simplifiedPayload: SimplifiedTwilioWebhookPayload = {
      body,
      from,
      waId: payload.WaId!,
      profileName: payload.ProfileName || '',
      messageSid: payload.MessageSid,
      accountSid: payload.AccountSid,
      messageType: payload.MessageType || 'text',
    };

    console.log('Simplified Payload:', simplifiedPayload, signature);

    const isUnsupportedMessage = UnsupportedMessage(
      payload.NumMedia,
      payload.MessageType,
    );

    if (isUnsupportedMessage) {
      await this.whatsappService.handleInboundMessage(
        simplifiedPayload,
        this.whatsappService.getUnsupportedMessageReply(),
      );

      return { ok: true };
    }

    const response = await this.whatsappService.handleMultipleMessages(
      simplifiedPayload,
      body,
    );

    if (response) {
      await this.whatsappService.handleInboundMessage(
        simplifiedPayload,
        response,
      );
    }

    return { ok: true };
  }
}
