
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TWILIO_CLIENT } from 'src/modules/whats-app/twilio.provider';

import type { Twilio } from 'twilio';

@Injectable()
export class WhatsAppService {
  private readonly from: string;
  private readonly messagingServiceSid?: string;

  constructor(
    @Inject(TWILIO_CLIENT) private readonly twilio: Twilio,
    private readonly config: ConfigService,
  ) {
    this.from = this.config.get<string>('twilio.fromWhatsApp')!;
    this.messagingServiceSid = this.config.get<string>('twilio.messagingServiceSid');
    if (!this.from && !this.messagingServiceSid) {
      // Podés permitir uno u otro; si usás Messaging Service, no necesitas "from"
      throw new Error('Configurar TWILIO_WHATSAPP_FROM o TWILIO_MESSAGING_SERVICE_SID');
    }
  }

  async createReservation(): Promise<string> {
    return 'hola'
  }

  async sendText(toE164: string, body: string) {
    // `to` debe ser formato WhatsApp: "whatsapp:+54911...."
    const to = toE164.startsWith('whatsapp:') ? toE164 : `whatsapp:${toE164}`;

    return this.twilio.messages.create({
      body,
      to,
      ...(this.messagingServiceSid
        ? { messagingServiceSid: this.messagingServiceSid }
        : { from: this.from }),
    });
  }

  // (Opcional) verificación de firma de webhooks
  verifySignature(url: string, params: Record<string, any>, signatureHeader: string): boolean {
    const validator = (this.twilio as any).validateRequest;
    const authToken = this.config.get<string>('twilio.authToken')!;
    return validator(authToken, signatureHeader, url, params);
  }
}
