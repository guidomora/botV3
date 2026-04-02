import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import {
  HttpErrorResponseDto,
  OkResponseDto,
  SimplifiedTwilioWebhookPayload,
  TwilioWebhookPayloadDto,
} from 'src/lib';
import { UnsupportedMessage } from '../helpers/unsopported-message.helper';
import { TwilioSignatureGuard } from '../guards/twilio-signature.guard';
import { WhatsAppIdempotencyGuard } from '../guards/whatsapp-idempotency.guard';
import { WhatsAppRateLimitGuard } from '../guards/whatsapp-rate-limit.guard';
import { WhatsAppService } from '../service/whatsapp.service';

@Controller('communication')
@ApiTags('Communication')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Post('/queue')
  @UseGuards(TwilioSignatureGuard, WhatsAppIdempotencyGuard, WhatsAppRateLimitGuard)
  @ApiOperation({
    summary: 'Webhook entrante de WhatsApp via Twilio',
    description:
      'Recibe mensajes form-url-encoded de Twilio, valida firma, aplica idempotencia y dispara el flujo conversacional.',
  })
  @ApiConsumes('application/x-www-form-urlencoded')
  @ApiSecurity('twilio-signature')
  @ApiHeader({
    name: 'x-twilio-signature',
    description: 'Firma enviada por Twilio para validar autenticidad del webhook.',
    required: true,
  })
  @ApiBody({
    type: TwilioWebhookPayloadDto,
    description: 'Payload del webhook enviado por Twilio para mensajes de WhatsApp.',
  })
  @ApiOkResponse({
    description: 'El webhook fue aceptado y procesado sin errores.',
    type: OkResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Firma ausente o invalida, o request bloqueado por las protecciones del webhook.',
    type: HttpErrorResponseDto,
  })
  async handleMultipleMessages(
    @Body('Body') body: string,
    @Body() payload: TwilioWebhookPayloadDto,
    @Body('From') from: string,
  ) {
    const simplifiedPayload: SimplifiedTwilioWebhookPayload = {
      body,
      from,
      waId: payload.WaId,
      profileName: payload.ProfileName || '',
      messageSid: payload.MessageSid,
      accountSid: payload.AccountSid,
      messageType: payload.MessageType || 'text',
    };

    const isUnsupportedMessage = UnsupportedMessage(payload.NumMedia, payload.MessageType);

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
