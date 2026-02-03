import { Controller, Post, Body, Headers, ForbiddenException, Req } from '@nestjs/common';
import { WhatsAppService } from '../service/whatsapp.service';
import { SimplifiedTwilioWebhookPayload, TwilioWebhookPayload } from 'src/lib';

@Controller('communication')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) { }

  @Post('/queue')
  async handleMultipleMessages(
    @Body('Body') body: string,
    @Body() payload: TwilioWebhookPayload,
    @Body('From') from: string,
    @Headers('x-twilio-signature') signature: string,
  ) {
    
    const waId = '11223344'

    const simplifiedPayload: SimplifiedTwilioWebhookPayload = {
      Body: body,
      From: from,
      WaId: waId,
      ProfileName: payload.ProfileName || '',
      MessageSid: payload.MessageSid,
      AccountSid: payload.AccountSid,
      MessageType: payload.MessageType || 'text',
    };

    const response = await this.whatsappService.handleMultipleMessages(waId, body);
    await this.whatsappService.handleInboundMessage(simplifiedPayload, response!);

    return { ok: true };
  }
}

