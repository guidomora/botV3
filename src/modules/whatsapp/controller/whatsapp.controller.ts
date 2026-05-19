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
  TwilioMessageStatusCallbackDto,
  TwilioWebhookPayloadDto,
} from 'src/lib';
import { ClosureNotificationOperationService } from 'src/modules/reservation-jobs/service/closure-notification-operation.service';
import { UnsupportedMessage } from '../helpers/unsopported-message.helper';
import { TwilioSignatureGuard } from '../guards/twilio-signature.guard';
import { WhatsAppIdempotencyGuard } from '../guards/whatsapp-idempotency.guard';
import { WhatsAppRateLimitGuard } from '../guards/whatsapp-rate-limit.guard';
import { WhatsAppUsageLimitGuard } from '../guards/whatsapp-usage-limit.guard';
import { WhatsAppService } from '../service/whatsapp.service';

@Controller('communication')
@ApiTags('Communication')
export class WhatsAppController {
  constructor(
    private readonly whatsappService: WhatsAppService,
    private readonly closureNotificationOperationService: ClosureNotificationOperationService,
  ) {}

  @Post('/queue')
  @UseGuards(
    TwilioSignatureGuard,
    WhatsAppIdempotencyGuard,
    WhatsAppUsageLimitGuard,
    WhatsAppRateLimitGuard,
  )
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

  @Post('/message-status')
  @UseGuards(TwilioSignatureGuard)
  @ApiOperation({
    summary: 'Webhook de estado de mensajes enviados via Twilio',
    description:
      'Recibe callbacks de Twilio con cambios de estado de mensajes salientes y actualiza las operaciones de cierre asociadas.',
  })
  @ApiConsumes('application/x-www-form-urlencoded')
  @ApiSecurity('twilio-signature')
  @ApiHeader({
    name: 'x-twilio-signature',
    description: 'Firma enviada por Twilio para validar autenticidad del callback.',
    required: true,
  })
  @ApiBody({
    type: TwilioMessageStatusCallbackDto,
    description: 'Payload de status callback enviado por Twilio para mensajes salientes.',
  })
  @ApiOkResponse({
    description: 'El callback fue aceptado.',
    type: OkResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Firma ausente o invalida.',
    type: HttpErrorResponseDto,
  })
  async handleMessageStatusCallback(@Body() payload: TwilioMessageStatusCallbackDto) {
    console.log('Twilio message status callback payload', payload);
    await this.closureNotificationOperationService.handleMessageStatusCallback({
      ...payload,
    });

    return { ok: true };
  }
}
