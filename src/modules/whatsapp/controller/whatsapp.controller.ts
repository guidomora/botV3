import { Controller, Post, Body, Headers, ForbiddenException, Req } from '@nestjs/common';
import { WhatsAppService } from '../service/whatsapp.service';
import { TwilioWebhookPayload } from 'src/lib';

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

    console.log('body', body);
    console.log('from', from);
    console.log('signature', signature);
    console.log('payload', payload);
    
    const waId = '11223344'
    const response = await this.whatsappService.handleInboundMessage(payload);
    // await this.whatsappService.handleMultipleMessages(waId, body);

    return { ok: true };
  }
}

