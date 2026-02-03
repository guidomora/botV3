
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BufferEntry } from 'src/lib';
import { ReservationsService } from 'src/modules/reservations/service/reservations.service';
import { TWILIO_CLIENT } from 'src/modules/whatsapp/twilio.provider';
import type { Twilio } from 'twilio';
import { setTimeLapse } from '../utils/utils';
import { SimplifiedTwilioWebhookPayload } from 'src/lib';
@Injectable()
export class WhatsAppService {
  private readonly from: string;
  private readonly messagingServiceSid?: string;
  private readonly logger = new Logger(WhatsAppService.name);
  private buffers = new Map<string, BufferEntry>();

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

  async handleInboundMessage(params: SimplifiedTwilioWebhookPayload, message: string) {
    // Twilio envía campos como: From, To, Body, WaId, NumMedia, MessageSid, etc.
    const from = params.From;         // "whatsapp:+54911..."
    const waId = params.WaId;         // "54911..."
    const body = (params.Body || '').trim();
    console.log('mesage!!', message);
    
    await this.sendText(waId!, message);

  }

  // (Opcional) verificación de firma de webhooks
  verifySignature(url: string, params: Record<string, any>, signatureHeader: string): boolean {
    const validator = (this.twilio as any).validateRequest;
    const authToken = this.config.get<string>('twilio.authToken')!;
    return validator(authToken, signatureHeader, url, params);
  }


  async handleMultipleMessages(waId: string, text: string): Promise<string | undefined> {
    const entry = this.buffers.get(waId) ?? { messages: [], resolvers: [] };

    entry.resolvers ??= [];
    
    entry.messages.push(text.trim());
    
    if (entry.timer) clearTimeout(entry.timer);
    
    this.logger.log(`Message received and processed for ${waId}`);

    const responsePromise = new Promise<string | undefined>(resolve => {
    
      entry.resolvers?.push(resolve);
    
    });

    entry.timer = setTimeout(async () => {
    
      const currentEntry = this.buffers.get(waId);
    
      if (!currentEntry) return;

      try {
    
        const response = await this.processBufferedMessages(waId);
    
        currentEntry.resolvers?.forEach(resolver => resolver(response));
    
      } catch (err) {
    
        this.logger.error(`Process failed for ${waId}`, err instanceof Error ? err.stack : err);
    
        currentEntry.resolvers?.forEach(resolver => resolver(undefined));
      }
    
    }, setTimeLapse(text));

    this.buffers.set(waId, entry);
    return responsePromise;
  }

  private async processBufferedMessages(waId: string) {
    const entry = this.buffers.get(waId);
    if (!entry) return;

    const joinedMessages = entry.messages.join(' ').replace(/\s+/g, ' ').trim();
    this.buffers.delete(waId);

    if (!joinedMessages) return;
    return await this.reservationsService.conversationOrchestrator(joinedMessages);
  }

}
