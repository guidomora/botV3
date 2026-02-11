
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
  private readonly unsupportedMessageReply =
    'No se permite mandar audios e imágenes, solo se permite mandar texto.';

  constructor(
    private readonly twilioAdapter: TwilioAdapter,
    private readonly reservationsService: ReservationsService,
  ) { }

  async sendText(toE164: string, body: string) {
    return this.twilioAdapter.sendText(toE164, body);
  }

  getUnsupportedMessageReply(): string {
    return this.unsupportedMessageReply;
  }

  isUnsupportedMessage(numMedia?: string, messageType?: string): boolean {
    const mediaCount = Number.parseInt(numMedia ?? '0', 10);
    const normalizedMessageType = messageType?.trim().toLowerCase();

    if (Number.isFinite(mediaCount) && mediaCount > 0) {
      return true;
    }

    if (!normalizedMessageType) {
      return false;
    }

    return normalizedMessageType === 'audio' || normalizedMessageType === 'image';
  }

  async handleInboundMessage(params: SimplifiedTwilioWebhookPayload, message: string) {
    const waId = params.waId;
    console.log('mesage!!', message);

    await this.sendText(waId!, message);

  }

  // (Opcional) verificación de firma de webhooks
  verifySignature(url: string, params: Record<string, any>, signatureHeader: string): boolean {
    return this.twilioAdapter.verifySignature(url, params, signatureHeader);
  }


  async handleMultipleMessages(simplifiedPayload: SimplifiedTwilioWebhookPayload, text: string): Promise<string | undefined> {
    const entry = this.buffers.get(simplifiedPayload.waId) ?? { messages: [], resolvers: [], sequence: 0 };

    entry.resolvers ??= [];
    entry.sequence = (entry.sequence ?? 0) + 1;
    const currentId = entry.sequence;

    entry.messages.push(text.trim());

    if (entry.timer) clearTimeout(entry.timer);

    this.logger.log(`Message received and processed for ${simplifiedPayload.waId}`);

    const responsePromise = new Promise<string | undefined>(resolve => {
      entry.resolvers?.push({ id: currentId, resolve });
    });

    entry.timer = setTimeout(async () => {

      const currentEntry = this.buffers.get(simplifiedPayload.waId);

      if (!currentEntry) return;

      try {

        const response = await this.processBufferedMessages(simplifiedPayload.waId, simplifiedPayload);
        const latestId = currentEntry.sequence ?? 0;

        currentEntry.resolvers?.forEach(({ id, resolve }) => {
          resolve(id === latestId ? response : undefined);
        });

      } catch (err) {

        this.logger.error(`Process failed for ${simplifiedPayload.waId}`, err instanceof Error ? err.stack : err);

        currentEntry.resolvers?.forEach(({ resolve }) => resolve(undefined));
      }

    }, setTimeLapse(text));

    this.buffers.set(simplifiedPayload.waId, entry);
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
