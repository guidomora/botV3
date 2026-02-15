import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Twilio } from 'twilio';
import { validateRequest } from 'twilio';
import { TWILIO_CLIENT } from '../twilio.provider';

@Injectable()
export class TwilioAdapter {
  private readonly from: string;
  private readonly messagingServiceSid?: string;
  private readonly logger = new Logger(TwilioAdapter.name);

  constructor(
    @Inject(TWILIO_CLIENT) private readonly twilio: Twilio,
    private readonly config: ConfigService,
  ) {
    this.from = this.config.get<string>('twilio.fromWhatsApp')!;
    this.messagingServiceSid = this.config.get<string>(
      'twilio.messagingServiceSid',
    );
    if (!this.from && !this.messagingServiceSid) {
      // Podés permitir uno u otro; si usás Messaging Service, no necesitas "from"
      throw new Error(
        'Configurar TWILIO_WHATSAPP_FROM o TWILIO_MESSAGING_SERVICE_SID',
      );
    }
  }

  sendText(toE164: string, body: string) {
    const to = toE164.startsWith('whatsapp:') ? toE164 : `whatsapp:${toE164}`;
    this.logger.log(`Sending message to ${to}: ${body}`);
    return this.twilio.messages.create({
      body,
      to,
      ...(this.messagingServiceSid
        ? { messagingServiceSid: this.messagingServiceSid }
        : { from: this.from }),
    });
  }

  verifySignature(
    url: string,
    params: Record<string, string | undefined>,
    signatureHeader: string,
  ): boolean {
    const authToken = this.config.get<string>('twilio.authToken')!;
    return validateRequest(authToken, signatureHeader, url, params);
  }
}
