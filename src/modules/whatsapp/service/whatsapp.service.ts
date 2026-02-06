
import { Injectable, Logger } from '@nestjs/common';
import { BufferEntry } from 'src/lib';
import { ReservationsService } from 'src/modules/reservations/service/reservations.service';
import { setTimeLapse } from '../utils/utils';
import { SimplifiedTwilioWebhookPayload } from 'src/lib';
import { TwilioAdapter } from '../adapters/twilio.adapter';
@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private buffers = new Map<string, BufferEntry>();

  constructor(
    private readonly twilioAdapter: TwilioAdapter,
    private readonly reservationsService: ReservationsService,
  ) { }

  async sendText(toE164: string, body: string) {
    return this.twilioAdapter.sendText(toE164, body);
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
    return this.twilioAdapter.verifySignature(url, params, signatureHeader);
  }


  async handleMultipleMessages(simplifiedPayload: SimplifiedTwilioWebhookPayload, text: string): Promise<string | undefined> {
    const entry = this.buffers.get(simplifiedPayload.WaId) ?? { messages: [], resolvers: [] };

    entry.resolvers ??= [];

    entry.messages.push(text.trim());

    if (entry.timer) clearTimeout(entry.timer);

    this.logger.log(`Message received and processed for ${simplifiedPayload.WaId}`);

    const responsePromise = new Promise<string | undefined>(resolve => {

      entry.resolvers?.push(resolve);

    });

    entry.timer = setTimeout(async () => {

      const currentEntry = this.buffers.get(simplifiedPayload.WaId);

      if (!currentEntry) return;

      try {

        const response = await this.processBufferedMessages(simplifiedPayload.WaId, simplifiedPayload);

        currentEntry.resolvers?.forEach(resolver => resolver(response));

      } catch (err) {

        this.logger.error(`Process failed for ${simplifiedPayload.WaId}`, err instanceof Error ? err.stack : err);

        currentEntry.resolvers?.forEach(resolver => resolver(undefined));
      }

    }, setTimeLapse(text));

    this.buffers.set(simplifiedPayload.WaId, entry);
    return responsePromise;
  }

  private async processBufferedMessages(waId: string, simplifiedPayload: SimplifiedTwilioWebhookPayload) {
    const entry = this.buffers.get(waId);
    if (!entry) return;

    const joinedMessages = entry.messages.join(' ').replace(/\s+/g, ' ').trim();
    this.buffers.delete(waId);

    if (!joinedMessages) return;
    return await this.reservationsService.conversationOrchestrator(joinedMessages, simplifiedPayload);
  }

}
