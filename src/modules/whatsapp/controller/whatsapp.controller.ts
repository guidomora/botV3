import { Controller, Post, Body, Headers } from '@nestjs/common';
import { WhatsAppService } from '../service/whatsapp.service';
import { SimplifiedTwilioWebhookPayload,TwilioWebhookPayloadDto } from 'src/lib';

@Controller('communication')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) { }

  @Post('/queue')
  async handleMultipleMessages(
    @Body('Body') body: string,
    @Body() payload: TwilioWebhookPayloadDto,
    @Body('From') from: string,
    @Headers('x-twilio-signature') signature: string,
  ) {

    const simplifiedPayload: SimplifiedTwilioWebhookPayload = {
      body: body,
      from: from,
      waId: payload.WaId!,
      profileName: payload.ProfileName || '',
      messageSid: payload.MessageSid,
      accountSid: payload.AccountSid,
      messageType: payload.MessageType || 'text',
    };

    console.log('Simplified Payload:', simplifiedPayload);

    const isUnsupportedMessage = this.whatsappService.isUnsupportedMessage(
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

    const response = await this.whatsappService.handleMultipleMessages(simplifiedPayload, body);

    if (response) {
      await this.whatsappService.handleInboundMessage(simplifiedPayload, response);
    }

    return { ok: true };
  }
}
