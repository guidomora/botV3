
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ReservationsService } from 'src/modules/reservations/service/reservations.service';
import { TWILIO_CLIENT } from 'src/modules/whatsapp/twilio.provider';

import type { Twilio } from 'twilio';

type BufferEntry = {
  chunks: string[];
  timer?: NodeJS.Timeout;
};

@Injectable()
export class WhatsAppService {
  private readonly from: string;
  private readonly messagingServiceSid?: string;
  private readonly logger = new Logger(WhatsAppService.name);
  private buffers = new Map<string, BufferEntry>();
  private readonly WINDOW_MS = 5000;

  constructor(
    @Inject(TWILIO_CLIENT) private readonly twilio: Twilio,
    private readonly config: ConfigService,
    private readonly reservationsService: ReservationsService,
  ) {
    this.from = this.config.get<string>('twilio.fromWhatsApp')!;
    this.messagingServiceSid = this.config.get<string>('twilio.messagingServiceSid');
    if (!this.from && !this.messagingServiceSid) {
      // Podés permitir uno u otro; si usás Messaging Service, no necesitas "from"
      throw new Error('Configurar TWILIO_WHATSAPP_FROM o TWILIO_MESSAGING_SERVICE_SID');
    }
  }

  async sendText(toE164: string, body: string) {
    const to = toE164.startsWith('whatsapp:') ? toE164 : `whatsapp:${toE164}`;

    return this.twilio.messages.create({
      body,
      to,
      ...(this.messagingServiceSid
        ? { messagingServiceSid: this.messagingServiceSid }
        : { from: this.from }),
    });
  }

  async handleInboundMessage(params: Record<string, string>) {
    // Twilio envía campos como: From, To, Body, WaId, NumMedia, MessageSid, etc.
    const from = params.From;         // "whatsapp:+54911..."
    const waId = params.WaId;         // "54911..."
    const body = (params.Body || '').trim();
    const numMedia = Number(params.NumMedia || '0');

    console.log(params);

  }

  // (Opcional) verificación de firma de webhooks
  verifySignature(url: string, params: Record<string, any>, signatureHeader: string): boolean {
    const validator = (this.twilio as any).validateRequest;
    const authToken = this.config.get<string>('twilio.authToken')!;
    return validator(authToken, signatureHeader, url, params);
  }


  async handleMultipleMessages(waId: string, text: string): Promise<void> {
    const entry = this.buffers.get(waId) ?? { chunks: [] };
    entry.chunks.push(text.trim());
    if (entry.timer) clearTimeout(entry.timer);

    entry.timer = setTimeout(() => {
      this.flush(waId).catch(err =>
        this.logger.error(`Flush failed for ${waId}`, err.stack),
      );
    }, this.WINDOW_MS);

    this.buffers.set(waId, entry);
  }

  private async flush(waId: string) {
    const entry = this.buffers.get(waId);
    if (!entry) return;

    const combined = entry.chunks.join(' ').replace(/\s+/g, ' ').trim();
    this.buffers.delete(waId);

    if (!combined) return;
    console.log(combined);
    
    // Disparar el orquestador una sola vez con el mensaje unificado
    // await this.reservationsService.conversationOrchestrator(combined);
  }
}
